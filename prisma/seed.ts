/**
 * Demo seed for the Odoo hackathon walkthrough.
 *
 * Idempotent: safe to re-run. We upsert all named records and reset the
 * attendance + leave + payslip tables for each demo employee so the numbers
 * always match the validation checklist in /docs/payroll-formulas.md.
 *
 *   npm run db:seed
 */
import {
  PrismaClient,
  Role,
  AttendanceStatus,
  LeaveType,
  LeaveStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { encryptInt } from "../src/lib/crypto/payroll";

const prisma = new PrismaClient();

const PWD = {
  admin: "admin123",
  hr: "hr123",
  payroll: "payroll123",
  emp: "emp123",
};

async function hash(s: string) {
  return bcrypt.hash(s, 10);
}

function utc(year: number, month1to12: number, day: number): Date {
  return new Date(Date.UTC(year, month1to12 - 1, day));
}

/** All weekdays (Mon–Sat) in [year, month] in UTC. Skips Sundays. */
function weekdaysOf(year: number, month1to12: number): Date[] {
  const start = utc(year, month1to12, 1);
  const last = utc(year, month1to12 + 1, 0).getUTCDate();
  const out: Date[] = [];
  for (let d = 1; d <= last; d++) {
    const dt = utc(year, month1to12, d);
    if (dt.getUTCDay() !== 0) out.push(dt); // skip Sundays
  }
  return out;
}

function sameDate(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

async function main() {
  console.log("Seeding EmPay demo data...");

  // ── Officers ──────────────────────────────────────────────────────────────
  const adminHash = await hash(PWD.admin);
  const hrHash = await hash(PWD.hr);
  const payrollHash = await hash(PWD.payroll);

  const admin = await prisma.user.upsert({
    where: { email: "admin@empay.com" },
    update: { passwordHash: adminHash, passwordChangedAt: new Date() },
    create: {
      email: "admin@empay.com",
      fullName: "EmPay Admin",
      role: Role.ADMIN,
      companyName: "Odoo India",
      passwordHash: adminHash,
      passwordChangedAt: new Date(),
    },
  });
  await prisma.user.upsert({
    where: { email: "hr@empay.com" },
    update: { passwordHash: hrHash, passwordChangedAt: new Date() },
    create: {
      email: "hr@empay.com",
      fullName: "Hema HR",
      role: Role.HR_OFFICER,
      companyName: "Odoo India",
      passwordHash: hrHash,
      passwordChangedAt: new Date(),
    },
  });
  await prisma.user.upsert({
    where: { email: "payroll@empay.com" },
    update: { passwordHash: payrollHash, passwordChangedAt: new Date() },
    create: {
      email: "payroll@empay.com",
      fullName: "Pranav Payroll",
      role: Role.PAYROLL_OFFICER,
      companyName: "Odoo India",
      passwordHash: payrollHash,
      passwordChangedAt: new Date(),
    },
  });

  // ── Employees ────────────────────────────────────────────────────────────
  await prisma.loginIdCounter.upsert({
    where: { year: 2025 },
    update: { lastSerial: 0 },
    create: { year: 2025, lastSerial: 0 },
  });

  const empHash = await hash(PWD.emp);

  // Employees: rich profiles. Some intentionally missing bank/manager so
  // the "Warnings" card on the Payroll dashboard has something to show.
  const employees = [
    {
      email: "ananya@empay.com",
      fullName: "Ananya Mehra",
      loginId: "OIANME20250001",
      employeeCode: "EMP001",
      department: "Engineering",
      designation: "Software Engineer",
      managerName: "Pranav Payroll",
      ctcAnnual: 6_00_000_00, // ₹6L → ₹50,000/month
      // Profile + bank
      phone: "+91 98201 11001",
      personalEmail: "ananya.personal@gmail.com",
      dob: utc(1998, 8, 14),
      nationality: "Indian",
      gender: "Female",
      maritalStatus: "Single",
      address: "12, Linking Road, Bandra West, Mumbai 400050",
      accountNumber: "0123456789012",
      bankName: "HDFC Bank",
      ifscCode: "HDFC0000123",
      panNumber: "AANPM1234A",
      uanNumber: "100123456789",
      about:
        "Backend engineer focused on payments and reliability. Three years at a fintech before Odoo.",
      jobLove: "Shipping things that quietly save people hours every week.",
      hobbies: "Bouldering, reading, the occasional film photo walk.",
    },
    {
      email: "rohit@empay.com",
      fullName: "Rohit Khanna",
      loginId: "OIROKH20250002",
      employeeCode: "EMP002",
      department: "Design",
      designation: "Product Designer",
      // No manager — to trigger the "1 employee without manager" warning.
      managerName: null,
      ctcAnnual: 4_80_000_00, // ₹4.8L → ₹40,000/month
      phone: "+91 99110 22002",
      personalEmail: "rohit.k@gmail.com",
      dob: utc(1996, 2, 22),
      nationality: "Indian",
      gender: "Male",
      maritalStatus: "Married",
      address: "Sector 18, Noida 201301",
      accountNumber: "9988776655443",
      bankName: "ICICI Bank",
      ifscCode: "ICIC0001234",
      panNumber: "BBBPK4567B",
      uanNumber: "100222333444",
      about:
        "Product designer obsessing over information density and the comma after 'and'.",
      jobLove: "Turning a 12-step screen into a 2-step screen.",
      hobbies: "Cycling, sketchbooks, late-night manga.",
    },
    {
      email: "priya@empay.com",
      fullName: "Priya Shah",
      loginId: "OIPRSH20250003",
      employeeCode: "EMP003",
      department: "Operations",
      designation: "Operations Lead",
      managerName: "EmPay Admin",
      ctcAnnual: 10_00_000_00, // ₹10L → ₹83,333/month
      phone: "+91 91234 56789",
      personalEmail: "priya.shah@yahoo.in",
      dob: utc(1991, 11, 5),
      nationality: "Indian",
      gender: "Female",
      maritalStatus: "Married",
      address: "Aundh, Pune 411007",
      // No bank — to trigger the "1 employee without bank A/C" warning.
      accountNumber: null,
      bankName: null,
      ifscCode: null,
      panNumber: "CCCPK6789C",
      uanNumber: "100333444555",
      about: "Ops lead, ex-consultant. Lives by spreadsheets and Sunday meal prep.",
      jobLove: "Watching a process go from 'tribal knowledge' to 'documented'.",
      hobbies: "Baking, podcasts, indoor plants.",
    },
  ];

  type SeededEmp = (typeof employees)[number] & { id: string };
  const seeded: SeededEmp[] = [];

  for (const e of employees) {
    const u = await prisma.user.upsert({
      where: { email: e.email },
      update: {
        passwordHash: empHash,
        loginId: e.loginId,
        fullName: e.fullName,
        employeeCode: e.employeeCode,
        department: e.department,
        designation: e.designation,
        managerName: e.managerName ?? null,
        phone: e.phone,
        personalEmail: e.personalEmail,
        dob: e.dob,
        nationality: e.nationality,
        gender: e.gender,
        maritalStatus: e.maritalStatus,
        address: e.address,
        accountNumber: e.accountNumber,
        bankName: e.bankName,
        ifscCode: e.ifscCode,
        panNumber: e.panNumber,
        uanNumber: e.uanNumber,
        about: e.about,
        jobLove: e.jobLove,
        hobbies: e.hobbies,
        passwordChangedAt: new Date(),
      },
      create: {
        email: e.email,
        loginId: e.loginId,
        fullName: e.fullName,
        role: Role.EMPLOYEE,
        passwordHash: empHash,
        employeeCode: e.employeeCode,
        department: e.department,
        designation: e.designation,
        managerName: e.managerName ?? null,
        phone: e.phone,
        personalEmail: e.personalEmail,
        dob: e.dob,
        nationality: e.nationality,
        gender: e.gender,
        maritalStatus: e.maritalStatus,
        address: e.address,
        accountNumber: e.accountNumber,
        bankName: e.bankName,
        ifscCode: e.ifscCode,
        panNumber: e.panNumber,
        uanNumber: e.uanNumber,
        about: e.about,
        jobLove: e.jobLove,
        hobbies: e.hobbies,
        joinDate: utc(2025, 1, 15),
        joinYear: 2025,
        passwordChangedAt: new Date(),
      },
    });
    seeded.push({ ...e, id: u.id });

    // Salary structure — rebuild fully so re-seed picks up new fields.
    await prisma.salaryStructure.deleteMany({ where: { userId: u.id } });
    await prisma.salaryStructure.create({
      data: {
        userId: u.id,
        ctcAnnual: encryptInt(e.ctcAnnual),
        basicPercent: 0.5,
        hraPercent: 0.4,
        standardAllowancePercent: 0.1667,
        performanceBonusPercent: 0.0833,
        ltaPercent: 0.0833,
        pfEmployeePercent: 0.12,
        pfEmployerPercent: 0.12,
        professionalTax: 200_00, // ₹200/month in paise
        workingDaysPerWeek: 6,
        breakTimeHours: 1,
        effectiveFrom: utc(2025, 1, 15),
        createdById: admin.id,
      },
    });

    // Leave allocations — CL 12 + SL 7 + EL 15, for 2025 + 2026.
    for (const year of [2025, 2026]) {
      for (const [type, days] of [
        [LeaveType.CASUAL, 12],
        [LeaveType.SICK, 7],
        [LeaveType.EARNED, 15],
      ] as const) {
        await prisma.leaveAllocation.upsert({
          where: {
            userId_leaveType_year: {
              userId: u.id,
              leaveType: type,
              year,
            },
          },
          update: { totalDays: days },
          create: {
            userId: u.id,
            leaveType: type,
            totalDays: days,
            year,
            allocatedById: admin.id,
          },
        });
      }
    }
  }

  await prisma.loginIdCounter.update({
    where: { year: 2025 },
    data: { lastSerial: 3 },
  });

  // ── Wipe past-pass demo data so re-seed is clean ─────────────────────────
  const seededIds = seeded.map((s) => s.id);
  // Wipe Mar–Apr 2026 attendance + leaves for these users so re-seeds match.
  const wipeStart = utc(2026, 3, 1);
  const wipeEnd = utc(2026, 5, 31);
  await prisma.attendance.deleteMany({
    where: { userId: { in: seededIds }, date: { gte: wipeStart, lte: wipeEnd } },
  });
  await prisma.leaveRequest.deleteMany({
    where: { userId: { in: seededIds }, startDate: { gte: wipeStart } },
  });

  // ── Attendance fixtures: Mar 2026 + Apr 2026 ─────────────────────────────
  // Each employee gets a different pattern so payroll outputs differ.
  // Apr 2026 weekdays (Mon–Sat): 26 working days.
  // Sundays in Apr 2026: 5, 12, 19, 26.

  type DayPattern = {
    absent: number[]; // day-of-month, full absent
    halfDay: number[];
  };
  type LeaveSpec = {
    type: LeaveType;
    start: number;
    end: number;
    reason: string;
  };

  type EmployeeMonthPlan = {
    march: DayPattern;
    april: DayPattern;
    aprilLeaves: LeaveSpec[];
    marchLeaves: LeaveSpec[];
  };

  const plans: Record<string, EmployeeMonthPlan> = {
    "ananya@empay.com": {
      march: { absent: [], halfDay: [16] },
      april: { absent: [26].filter(_isWeekday(2026, 4)), halfDay: [16] },
      aprilLeaves: [
        {
          type: LeaveType.CASUAL,
          start: 17,
          end: 18,
          reason: "Family event",
        },
      ],
      marchLeaves: [],
    },
    "rohit@empay.com": {
      march: { absent: [], halfDay: [] },
      april: { absent: [], halfDay: [] },
      aprilLeaves: [], // perfect attendance — useful for max-CTC payslip
      marchLeaves: [],
    },
    "priya@empay.com": {
      march: { absent: [], halfDay: [] },
      april: { absent: [22, 23], halfDay: [] }, // unpaid (no leave req covers these)
      aprilLeaves: [
        {
          type: LeaveType.SICK,
          start: 7,
          end: 9,
          reason: "Flu",
        },
      ],
      marchLeaves: [
        {
          type: LeaveType.EARNED,
          start: 25,
          end: 27,
          reason: "Wedding in family",
        },
      ],
    },
  };

  for (const e of seeded) {
    const plan = plans[e.email];
    if (!plan) continue;

    await fillMonth(e.id, 2026, 3, plan.march);
    await fillMonth(e.id, 2026, 4, plan.april);

    for (const lr of plan.marchLeaves) {
      await prisma.leaveRequest.create({
        data: {
          userId: e.id,
          leaveType: lr.type,
          startDate: utc(2026, 3, lr.start),
          endDate: utc(2026, 3, lr.end),
          totalDays: countWeekdays(2026, 3, lr.start, lr.end),
          reason: lr.reason,
          status: LeaveStatus.APPROVED,
          approvedById: admin.id,
          approvedAt: new Date(),
        },
      });
    }
    for (const lr of plan.aprilLeaves) {
      await prisma.leaveRequest.create({
        data: {
          userId: e.id,
          leaveType: lr.type,
          startDate: utc(2026, 4, lr.start),
          endDate: utc(2026, 4, lr.end),
          totalDays: countWeekdays(2026, 4, lr.start, lr.end),
          reason: lr.reason,
          status: LeaveStatus.APPROVED,
          approvedById: admin.id,
          approvedAt: new Date(),
        },
      });
    }
  }

  // ── Pending leave requests for the time-off review queue ─────────────────
  const rohit = seeded.find((s) => s.email === "rohit@empay.com");
  const priya = seeded.find((s) => s.email === "priya@empay.com");
  if (rohit) {
    await prisma.leaveRequest.create({
      data: {
        userId: rohit.id,
        leaveType: LeaveType.CASUAL,
        startDate: utc(2026, 5, 14),
        endDate: utc(2026, 5, 15),
        totalDays: 2,
        reason: "Long weekend trip",
        status: LeaveStatus.PENDING,
      },
    });
  }
  if (priya) {
    await prisma.leaveRequest.create({
      data: {
        userId: priya.id,
        leaveType: LeaveType.EARNED,
        startDate: utc(2026, 5, 25),
        endDate: utc(2026, 5, 29),
        totalDays: 5,
        reason: "Annual vacation",
        status: LeaveStatus.PENDING,
      },
    });
  }

  // ── Wipe any pre-existing payruns for our seed window (Mar/Apr 2026) ─────
  // so the user can run payroll against the seeded data freshly.
  await prisma.payRun.deleteMany({
    where: {
      OR: [
        { month: 3, year: 2026 },
        { month: 4, year: 2026 },
      ],
    },
  });

  console.log("✓ Seed complete.");
  console.log("");
  console.log("Demo accounts (password listed after slash):");
  console.log("  Admin    admin@empay.com / admin123");
  console.log("  HR       hr@empay.com / hr123");
  console.log("  Payroll  payroll@empay.com / payroll123");
  console.log("  Employee ananya@empay.com / emp123  (OIANME20250001)");
  console.log("  Employee rohit@empay.com / emp123   (OIROKH20250002)");
  console.log("  Employee priya@empay.com / emp123   (OIPRSH20250003)");
  console.log("");
  console.log("Demo data:");
  console.log("  • Apr 2026 attendance + leaves for all 3 employees");
  console.log("  • Mar 2026 attendance + 1 approved leave");
  console.log("  • 2 PENDING leave requests in May 2026 (for time-off queue)");
  console.log("  • Warnings: Rohit lacks a manager, Priya lacks a bank a/c");
  console.log("  • Run payroll for Apr 2026 to populate the Payrun tab");
}

/**
 * Mark a full month of attendance for one user. Default state is PRESENT
 * for every weekday; pass `absent` and `halfDay` lists to override.
 * Days that already have a row (e.g., from a leave overlap) are skipped.
 */
async function fillMonth(
  userId: string,
  year: number,
  month: number,
  pattern: { absent: number[]; halfDay: number[] }
) {
  const days = weekdaysOf(year, month);
  for (const dt of days) {
    const dom = dt.getUTCDate();
    let status: AttendanceStatus = AttendanceStatus.PRESENT;
    if (pattern.absent.includes(dom)) status = AttendanceStatus.ABSENT;
    else if (pattern.halfDay.includes(dom)) status = AttendanceStatus.HALF_DAY;

    // Skip if this day overlaps a (planned) leave we'll create afterwards;
    // simpler: trust createMany ordering, but if a clash happens on re-seed,
    // it'd violate the unique [userId, date]. Use upsert to be safe.
    await prisma.attendance.upsert({
      where: { userId_date: { userId, date: dt } },
      update: { status },
      create: { userId, date: dt, status },
    });
  }
}

function countWeekdays(
  year: number,
  month: number,
  startDay: number,
  endDay: number
): number {
  let c = 0;
  for (let d = startDay; d <= endDay; d++) {
    const dt = utc(year, month, d);
    if (dt.getUTCDay() !== 0) c++;
  }
  return c;
}

/**
 * Utility wrapper used at config-time: returns a predicate that filters
 * day-of-month numbers down to those that aren't a Sunday.
 */
function _isWeekday(year: number, month: number) {
  return (d: number) => utc(year, month, d).getUTCDay() !== 0;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
