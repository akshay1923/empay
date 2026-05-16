import { prisma } from "@/lib/prisma";

const COMPANY_PREFIX = "OI"; // Odoo India

/** Pull the first two letters of a token, A–Z only. Pad with X on short input. */
function initials(token: string): string {
  const stripped = token.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return (stripped + "XX").slice(0, 2);
}

/**
 * Atomically allocate the next per-year serial number.
 * Backed by the LoginIdCounter table; uses an upsert + transaction so two
 * concurrent createEmployee calls can never collide on a serial.
 */
export async function allocateLoginId(params: {
  fullName: string;
  joinDate: Date;
}): Promise<{ loginId: string; year: number; serial: number }> {
  const year = params.joinDate.getFullYear();
  const [first, ...rest] = params.fullName.trim().split(/\s+/);
  const last = rest.length ? rest[rest.length - 1] : first;

  return prisma.$transaction(async (tx) => {
    // Create the row if missing, then increment.
    await tx.loginIdCounter.upsert({
      where: { year },
      create: { year, lastSerial: 0 },
      update: {},
    });
    const counter = await tx.loginIdCounter.update({
      where: { year },
      data: { lastSerial: { increment: 1 } },
    });
    const serial = counter.lastSerial;
    const loginId =
      `${COMPANY_PREFIX}${initials(first)}${initials(last)}` +
      `${year}` +
      String(serial).padStart(4, "0");
    return { loginId, year, serial };
  });
}

/** Random 10-character alphanumeric password — for first-time employee credentials. */
export function generateTempPassword(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
