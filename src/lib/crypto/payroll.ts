/**
 * Application-layer encryption for payroll money fields.
 *
 * Anyone with raw Postgres credentials sees ciphertext — only the app, holding
 * the key in env, can decrypt. See docs/payroll-encryption.md for the full
 * threat model and rotation procedure.
 *
 * Format per encrypted column (base64-encoded):
 *   iv (12 bytes) | authTag (16 bytes) | ciphertext (variable)
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const KEY_B64 = process.env.PAYROLL_ENCRYPTION_KEY;
let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  if (!KEY_B64) {
    throw new Error(
      "PAYROLL_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32"
    );
  }
  const buf = Buffer.from(KEY_B64, "base64");
  if (buf.length !== 32) {
    throw new Error(
      `PAYROLL_ENCRYPTION_KEY must decode to 32 bytes (got ${buf.length}).`
    );
  }
  cachedKey = buf;
  return buf;
}

export function encryptInt(value: number): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptInt(blob: string): number {
  // Minimum valid ciphertext is 12 (iv) + 16 (tag) + 1 (at least 1 byte of
  // ciphertext) = 29 bytes. A typical "leftover" value — e.g. a row that
  // existed before the Int → String schema flip and got auto-cast to its
  // stringified integer form like "600000" — base64-decodes to far fewer.
  // Bail with a useful message instead of the cryptic crypto stack trace.
  const buf = Buffer.from(blob, "base64");
  if (buf.length < 29) {
    throw new Error(
      `decryptInt: value is not a valid ciphertext (got ${buf.length} bytes after base64 decode; expected ≥29). ` +
        `This usually means a row was created before encryption was wired up. ` +
        `Run: npx prisma db push --force-reset && npm run db:seed`
    );
  }
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ct), decipher.final()]).toString(
    "utf8"
  );
  const n = Number(plain);
  if (!Number.isFinite(n)) {
    throw new Error("Decrypted payload is not a finite number");
  }
  return n;
}

// ---- Field projections -----------------------------------------------------
// Each helper takes a row with `number` money fields and returns the same row
// with `string` (encrypted) money fields, or vice versa. We keep these
// hand-written rather than generic so the field list is auditable in one
// place.

export type PayslipMoneyPlain = {
  ctcAnnual: number;
  basic: number;
  hra: number;
  specialAllowance: number;
  grossEarned: number;
  employeePf: number;
  professionalTax: number;
  totalDeductions: number;
  netPay: number;
  employerPf: number;
};

export type PayslipMoneyCipher = {
  ctcAnnual: string;
  basic: string;
  hra: string;
  specialAllowance: string;
  grossEarned: string;
  employeePf: string;
  professionalTax: string;
  totalDeductions: string;
  netPay: string;
  employerPf: string;
};

export function encryptPayslipMoney<T extends PayslipMoneyPlain>(
  row: T
): Omit<T, keyof PayslipMoneyPlain> & PayslipMoneyCipher {
  return {
    ...row,
    ctcAnnual: encryptInt(row.ctcAnnual),
    basic: encryptInt(row.basic),
    hra: encryptInt(row.hra),
    specialAllowance: encryptInt(row.specialAllowance),
    grossEarned: encryptInt(row.grossEarned),
    employeePf: encryptInt(row.employeePf),
    professionalTax: encryptInt(row.professionalTax),
    totalDeductions: encryptInt(row.totalDeductions),
    netPay: encryptInt(row.netPay),
    employerPf: encryptInt(row.employerPf),
  };
}

export function decryptPayslipMoney<T extends PayslipMoneyCipher>(
  row: T
): Omit<T, keyof PayslipMoneyCipher> & PayslipMoneyPlain {
  return {
    ...row,
    ctcAnnual: decryptInt(row.ctcAnnual),
    basic: decryptInt(row.basic),
    hra: decryptInt(row.hra),
    specialAllowance: decryptInt(row.specialAllowance),
    grossEarned: decryptInt(row.grossEarned),
    employeePf: decryptInt(row.employeePf),
    professionalTax: decryptInt(row.professionalTax),
    totalDeductions: decryptInt(row.totalDeductions),
    netPay: decryptInt(row.netPay),
    employerPf: decryptInt(row.employerPf),
  };
}

export function encryptSalaryStructureMoney<T extends { ctcAnnual: number }>(
  row: T
): Omit<T, "ctcAnnual"> & { ctcAnnual: string } {
  return { ...row, ctcAnnual: encryptInt(row.ctcAnnual) };
}

export function decryptSalaryStructureMoney<T extends { ctcAnnual: string }>(
  row: T
): Omit<T, "ctcAnnual"> & { ctcAnnual: number } {
  return { ...row, ctcAnnual: decryptInt(row.ctcAnnual) };
}
