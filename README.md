# EmPay — Smart HRMS

A connected HR workspace built for the Odoo Hackathon. Attendance feeds Leave; Attendance + Leave feeds Payroll.

> Status: **employee shell + design system landed.** HR / Payroll / Admin pages are stubbed and ship in the next pass.

---

## Stack

- Next.js 14 (App Router) + TypeScript
- PostgreSQL + Prisma 5
- NextAuth v5 (beta) — JWT sessions, credentials provider
- Tailwind CSS 3 + custom design tokens (Notion structural language, Odoo palette)
- Inter (UI/body) + Helvetica Now Display (h1/h2)

---

## Setup

1. **Postgres** — assumes a local Postgres on `:5432`. Open `.env` and update `DATABASE_URL` to match your local user/password:
   ```
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/empay?schema=public"
   ```
   Then create the database:
   ```bash
   createdb -h localhost -U USER empay
   ```

2. **Migrate + seed**
   ```bash
   npm run db:push
   npm run db:seed
   ```

3. **Dev server**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

---

## Demo accounts

| Role | Email | Login ID | Password |
|---|---|---|---|
| Admin | admin@empay.com | — | admin123 |
| HR Officer | hr@empay.com | — | hr123 |
| Payroll Officer | payroll@empay.com | — | payroll123 |
| Employee | ananya@empay.com | OIANME20250001 | emp123 |
| Employee | rohit@empay.com | OIROKH20250002 | emp123 |
| Employee | priya@empay.com | OIPRSH20250003 | emp123 |

You can sign in with **either** the Login ID or the email — both go through the same NextAuth credentials provider.

---

## Login ID format

Per `system-facts.md`: `OI` + first two letters of first name + first two letters of last name + 4-digit joining year + 4-digit zero-padded serial.

Example: John Doe, joined 2022, first hire of the year → `OIJODO20220001`.

The serial is allocated atomically inside a Prisma transaction backed by the `LoginIdCounter` table (`src/lib/auth/login-id.ts`). The `OI` prefix is hardcoded for now; lift to a `COMPANY_PREFIX` env var when going multi-tenant.

---

## Design system

The visual language is the Notion structural language (warm `#FFFDFA` canvas, tight 3–8px radii, the famous 6-layer hero shadow) re-skinned with the Odoo palette:

- Primary mauve `#714B67` — CTAs and brand splash
- Secondary teal `#017E84` — links and focus rings
- Neutral gray `#8F8F8F`

All tokens live in `src/app/globals.css` as CSS variables, plus light/dark themes via `[data-theme]`. Tailwind's `tailwind.config.ts` maps the variables to utilities (`bg-bg`, `text-fg`, `border-border`, etc.) so you can use either layer.

---

## What's wired

- Auth: NextAuth v5, credentials provider, accepts login ID *or* email
- Middleware: role-based route protection (`src/middleware.ts`)
- Permissions: centralized in `src/lib/auth/permissions.ts`
- Login ID allocator: `src/lib/auth/login-id.ts` (atomic, transaction-safe)
- Server Actions: `signUpOfficer`, `changePassword`, `markAttendance`, `applyLeave`, `cancelLeave`, `getMyLeaveBalance`
- Pages:
  - `/login` — login ID + email + password, with demo creds visible
  - `/signup` — Admin/HR/Payroll self-registration only (employees never self-register)
  - `/employee/dashboard` — today's attendance card, leave balance, latest payslips, quick actions
  - `/employee/attendance` — full month calendar grid, mark today's status, monthly summary
  - `/employee/leaves` — apply for leave dialog, balance cards, request history with cancel
  - `/employee/profile` — read-only profile + compensation panel + change-password form
  - `/employee/payslips` — list of past payslips (rendered when payroll runs)
  - HR / Payroll / Admin — stubbed with `<ComingSoon>` placeholders

---

## What's next

- Run-payroll Server Action (the integration showcase) — see `/docs/api-routes.md`
- Leave-approval flow for Payroll Officer — see `/docs/attendance-leave-logic.md`
- Salary structure form
- HR employee directory (uses `allocateLoginId`)
- Admin/HR/Payroll dashboards with Recharts
- @react-pdf/renderer payslip route at `/api/payslip/[id]/pdf`

---

## Future scope (out of MVP)

OTP / 2FA, email notifications, performance reviews, document uploads, multi-tenancy, mobile app, audit log, bulk CSV import, geofencing, shift management, overtime, bonuses, reimbursements, loans, Form 16, multiple pay frequencies. See `docs/assumptions.md` for the full list.
