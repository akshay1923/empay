import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let cached: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (cached) return cached;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  cached = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cached;
}

export type SendResult = { ok: true } | { ok: false; error: string };

export async function sendCredentialsEmail(params: {
  to: string;
  fullName: string;
  loginId: string;
  tempPassword: string;
}): Promise<SendResult> {
  const t = getTransporter();
  if (!t) {
    return {
      ok: false,
      error: "Email not configured (set SMTP_USER and SMTP_PASS in .env)",
    };
  }

  const from =
    process.env.SMTP_FROM ?? `EmPay HR <${process.env.SMTP_USER}>`;
  const firstName = params.fullName.split(/\s+/)[0] ?? params.fullName;

  const text = [
    `Hi ${firstName},`,
    ``,
    `Your EmPay account is ready. Use the credentials below to sign in.`,
    ``,
    `Login ID: ${params.loginId}`,
    `Temporary password: ${params.tempPassword}`,
    ``,
    `You'll be asked to set a new password the first time you sign in.`,
    ``,
    `— EmPay HR`,
  ].join("\n");

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#222;line-height:1.55;max-width:520px">
  <p>Hi ${escapeHtml(firstName)},</p>
  <p>Your EmPay account is ready. Use the credentials below to sign in.</p>
  <table style="border-collapse:collapse;background:#f7f6f3;border-radius:6px;padding:14px 16px;margin:16px 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px">
    <tr><td style="padding:4px 12px 4px 0;color:#666">Login ID</td><td><strong>${escapeHtml(params.loginId)}</strong></td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#666">Temporary password</td><td><strong>${escapeHtml(params.tempPassword)}</strong></td></tr>
  </table>
  <p style="color:#555;font-size:13px">You'll be asked to set a new password the first time you sign in.</p>
  <p style="color:#999;font-size:12px;margin-top:24px">— EmPay HR</p>
</div>`.trim();

  try {
    await t.sendMail({
      from,
      to: params.to,
      subject: "Your EmPay account credentials",
      text,
      html,
    });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to send email",
    };
  }
}

export async function sendLeaveDecisionEmail(params: {
  to: string;
  fullName: string;
  decision: "APPROVE" | "REJECT";
  leaveTypeLabel: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  totalDays: number;
  reason?: string;
  approverName?: string;
}): Promise<SendResult> {
  const t = getTransporter();
  if (!t) {
    return {
      ok: false,
      error: "Email not configured (set SMTP_USER and SMTP_PASS in .env)",
    };
  }

  const from =
    process.env.SMTP_FROM ?? `EmPay HR <${process.env.SMTP_USER}>`;
  const firstName = params.fullName.split(/\s+/)[0] ?? params.fullName;
  const approved = params.decision === "APPROVE";
  const range =
    params.startDate === params.endDate
      ? params.startDate
      : `${params.startDate} → ${params.endDate}`;

  const subject = approved
    ? `Your ${params.leaveTypeLabel} request was approved`
    : `Your ${params.leaveTypeLabel} request was rejected`;

  const text = [
    `Hi ${firstName},`,
    ``,
    approved
      ? `Your ${params.leaveTypeLabel} request has been APPROVED.`
      : `Your ${params.leaveTypeLabel} request has been REJECTED.`,
    ``,
    `Dates: ${range}`,
    `Days: ${trim(params.totalDays)}`,
    ...(params.reason ? [``, `Note from approver: ${params.reason}`] : []),
    ...(params.approverName ? [`Decided by: ${params.approverName}`] : []),
    ``,
    approved
      ? `Attendance for those dates will automatically count as paid leave when payroll runs.`
      : `If you believe this is a mistake, please reach out to your HR contact.`,
    ``,
    `— EmPay HR`,
  ].join("\n");

  const accent = approved ? "#15803d" : "#dc2626";
  const banner = approved ? "Approved" : "Rejected";
  const reasonBlock = params.reason
    ? `<p style="margin:8px 0 0;font-size:13px;color:#444">
         <strong style="color:#222">Note from approver:</strong>
         ${escapeHtml(params.reason)}
       </p>`
    : "";

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#222;line-height:1.55;max-width:560px">
  <p>Hi ${escapeHtml(firstName)},</p>
  <p>Your <strong>${escapeHtml(params.leaveTypeLabel)}</strong> request has been
    <span style="color:${accent};font-weight:600">${banner}</span>.</p>
  <table style="border-collapse:collapse;background:#f7f6f3;border-radius:6px;padding:14px 16px;margin:16px 0;font-size:13px">
    <tr>
      <td style="padding:4px 16px 4px 0;color:#666">Dates</td>
      <td><strong>${escapeHtml(range)}</strong></td>
    </tr>
    <tr>
      <td style="padding:4px 16px 4px 0;color:#666">Days</td>
      <td><strong>${trim(params.totalDays)}</strong></td>
    </tr>
    ${
      params.approverName
        ? `<tr><td style="padding:4px 16px 4px 0;color:#666">Decided by</td><td>${escapeHtml(
            params.approverName
          )}</td></tr>`
        : ""
    }
  </table>
  ${reasonBlock}
  <p style="color:#555;font-size:13px;margin-top:18px">
    ${
      approved
        ? "Attendance for those dates will automatically count as paid leave when payroll runs."
        : "If you believe this is a mistake, please reach out to your HR contact."
    }
  </p>
  <p style="color:#999;font-size:12px;margin-top:24px">— EmPay HR</p>
</div>`.trim();

  try {
    await t.sendMail({
      from,
      to: params.to,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to send email",
    };
  }
}

function trim(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
