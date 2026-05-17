/**
 * Comp-off credit primitives.
 *
 * The DB-touching helpers (`grantCompOffIfWeekendWork`, `revokeUnredeemedCompOff`,
 * `pickConsumableCredits`) are called from server actions when attendance is
 * marked or a `COMP_OFF` leave is approved/cancelled.
 *
 * `pickFifoCredits` is the pure FIFO selection logic — it lives here (and not
 * inline in the action) so it can be unit tested without touching Prisma.
 */
import { addDays, format, isSunday } from "date-fns";
import type { Prisma, PrismaClient } from "@prisma/client";

/** Default expiry window in days for an auto-granted credit. Configurable
 *  via `COMP_OFF_EXPIRY_DAYS` env var. v1 keeps a single org-wide value. */
export const COMP_OFF_EXPIRY_DAYS = (() => {
  const raw = Number(process.env.COMP_OFF_EXPIRY_DAYS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 90;
})();

/** Earliest-expiring-warning window in days. */
export const COMP_OFF_EXPIRING_SOON_DAYS = 14;

export type AttendanceStatusLike = "PRESENT" | "ABSENT" | "HALF_DAY" | string;

/** Truthy if the given UTC date is a Sunday or is in the supplied holiday
 *  set (formatted yyyy-MM-dd). Sunday + Holiday on the same day → still
 *  exactly one credit because we upsert by (userId, earnedOn). */
export function isCompOffEligibleDate(
  date: Date,
  holidaySet: Set<string>
): boolean {
  if (isSunday(date)) return true;
  return holidaySet.has(format(date, "yyyy-MM-dd"));
}

/** PRESENT → full credit, HALF_DAY → 0.5 credit. */
export function fractionForStatus(status: AttendanceStatusLike): number {
  if (status === "PRESENT") return 1.0;
  if (status === "HALF_DAY") return 0.5;
  return 0;
}

// ---------------------------------------------------------------------------
// Pure FIFO consumption helper.
// ---------------------------------------------------------------------------

export type ConsumableCredit = {
  id: string;
  earnedOn: Date;
  earnedFraction: number;
  expiresOn: Date;
};

export type FifoPickResult =
  | { ok: true; picked: ConsumableCredit[]; consumedFraction: number }
  | {
      ok: false;
      shortfall: number;
      available: number;
    };

/**
 * Pick the earliest-earned credits whose `earnedFraction` adds up to exactly
 * `requiredDays`. Same-day inclusive expiry: a credit `expiresOn === asOf`
 * is still valid.
 *
 * Half-day requests can only land on half-day credits — we don't split a
 * 1.0 credit into two halves (avoids fractional bookkeeping headaches).
 * Full-day requests can be assembled from any mix that sums to 1.0+.
 */
export function pickFifoCredits(
  candidates: ConsumableCredit[],
  requiredDays: number,
  asOf: Date
): FifoPickResult {
  // Drop expired credits first; the caller is allowed to pass everything
  // they have so the math stays in one place.
  const live = candidates
    .filter((c) => c.expiresOn.getTime() >= asOf.getTime())
    .filter((c) => c.earnedFraction > 0)
    .sort((a, b) => a.earnedOn.getTime() - b.earnedOn.getTime());

  const available = live.reduce((s, c) => s + c.earnedFraction, 0);

  // Half-day request: only consume a single half-day credit.
  if (Math.abs(requiredDays - 0.5) < 1e-9) {
    const half = live.find((c) => Math.abs(c.earnedFraction - 0.5) < 1e-9);
    if (!half) {
      return {
        ok: false,
        shortfall: 0.5,
        available,
      };
    }
    return { ok: true, picked: [half], consumedFraction: 0.5 };
  }

  if (available + 1e-9 < requiredDays) {
    return { ok: false, shortfall: requiredDays - available, available };
  }

  const picked: ConsumableCredit[] = [];
  let remaining = requiredDays;
  for (const c of live) {
    if (remaining <= 1e-9) break;
    picked.push(c);
    remaining -= c.earnedFraction;
  }
  return { ok: true, picked, consumedFraction: requiredDays };
}

// ---------------------------------------------------------------------------
// DB-side helpers
// ---------------------------------------------------------------------------

/** Date-only at UTC midnight, matching the @db.Date columns. */
function toUtcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Auto-grant a comp-off credit if `date` is a Sunday or holiday and the
 * status is `PRESENT` / `HALF_DAY`. Idempotent on (userId, earnedOn) thanks
 * to the unique index — toggling attendance twice on the same Sunday does
 * not double-credit.
 *
 * On a flip back to `ABSENT`, the caller should instead invoke
 * `revokeUnredeemedCompOff(userId, date)` to clean up.
 *
 * Returns the granted credit's id, or null if no grant happened.
 */
export async function grantCompOffIfWeekendWork(
  prisma: PrismaClient | Prisma.TransactionClient,
  userId: string,
  date: Date,
  status: AttendanceStatusLike,
  options?: { grantedById?: string | null }
): Promise<string | null> {
  const fraction = fractionForStatus(status);
  if (fraction <= 0) return null;

  const day = toUtcDateOnly(date);
  const sunday = isSunday(day);
  let eligible = sunday;
  if (!eligible) {
    const holiday = await prisma.holiday.findUnique({ where: { date: day } });
    if (holiday) eligible = true;
  }
  if (!eligible) return null;

  const expiresOn = toUtcDateOnly(addDays(day, COMP_OFF_EXPIRY_DAYS));

  // Upsert on (userId, earnedOn). If a credit already exists for this day
  // we *only* update the fraction when it hasn't been redeemed yet — a
  // previously-redeemed credit must stay tied to its leave even if the
  // attendance row is later toggled.
  const existing = await prisma.compOffCredit.findUnique({
    where: { userId_earnedOn: { userId, earnedOn: day } },
  });

  if (!existing) {
    const created = await prisma.compOffCredit.create({
      data: {
        userId,
        earnedOn: day,
        earnedFraction: fraction,
        expiresOn,
        grantedById: options?.grantedById ?? null,
      },
    });
    return created.id;
  }

  if (existing.redeemedById) {
    // Already redeemed — never touch.
    return existing.id;
  }

  // Un-revoke if a prior revoke happened, refresh fraction.
  if (
    existing.earnedFraction !== fraction ||
    existing.revokedAt !== null
  ) {
    await prisma.compOffCredit.update({
      where: { id: existing.id },
      data: {
        earnedFraction: fraction,
        revokedAt: null,
        revokedById: null,
        revocationReason: null,
      },
    });
  }
  return existing.id;
}

/**
 * Revoke a credit if (and only if) it has not been redeemed. Called when
 * an attendance row is flipped from PRESENT/HALF_DAY → ABSENT, or deleted.
 *
 * Already-redeemed credits stand: we will not retroactively kill an
 * approved leave. Returns whether a revoke actually happened.
 */
export async function revokeUnredeemedCompOff(
  prisma: PrismaClient | Prisma.TransactionClient,
  userId: string,
  date: Date,
  options?: { revokedById?: string | null; reason?: string | null }
): Promise<{ revoked: boolean; reason?: string }> {
  const day = toUtcDateOnly(date);
  const existing = await prisma.compOffCredit.findUnique({
    where: { userId_earnedOn: { userId, earnedOn: day } },
  });
  if (!existing) return { revoked: false };
  if (existing.redeemedById) {
    return {
      revoked: false,
      reason: "Credit already redeemed by an approved leave",
    };
  }
  if (existing.revokedAt) return { revoked: false };

  await prisma.compOffCredit.update({
    where: { id: existing.id },
    data: {
      revokedAt: new Date(),
      revokedById: options?.revokedById ?? null,
      revocationReason: options?.reason ?? null,
    },
  });
  return { revoked: true };
}

/**
 * Available (un-redeemed, un-revoked, un-expired) credits for the user.
 * Ordered FIFO by `earnedOn` so the caller can hand them straight to
 * `pickFifoCredits`.
 */
export async function listAvailableCredits(
  prisma: PrismaClient | Prisma.TransactionClient,
  userId: string,
  asOf: Date
): Promise<ConsumableCredit[]> {
  const day = toUtcDateOnly(asOf);
  const rows = await prisma.compOffCredit.findMany({
    where: {
      userId,
      redeemedById: null,
      revokedAt: null,
      expiresOn: { gte: day },
    },
    orderBy: { earnedOn: "asc" },
    select: {
      id: true,
      earnedOn: true,
      earnedFraction: true,
      expiresOn: true,
    },
  });
  return rows;
}
