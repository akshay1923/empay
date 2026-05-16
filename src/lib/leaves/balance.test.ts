import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLeaveBalance, type LeaveBalanceStore } from "./balance";
import type { LeaveType } from "@prisma/client";

function makeStore(input: {
  allocation?: number | null;
  taken?: number | null;
  calls?: unknown[];
}): LeaveBalanceStore {
  return {
    leaveAllocation: {
      async findUnique(args) {
        input.calls?.push({ method: "findUnique", args });
        if (input.allocation == null) {
          return null;
        }
        return { totalDays: input.allocation };
      },
    },
    leaveRequest: {
      async aggregate(args) {
        input.calls?.push({ method: "aggregate", args });
        return { _sum: { totalDays: input.taken ?? null } };
      },
    },
  };
}

test("paid leave balance rejects requests without enough allocation", async () => {
  const result = await checkLeaveBalance(
    makeStore({ allocation: 0, taken: 0 }),
    {
      userId: "employee-1",
      leaveType: "CASUAL" as LeaveType,
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      requestedDays: 9,
    }
  );

  assert.equal(result.ok, false);
  assert.equal(result.available, 0);
  assert.equal(result.requested, 9);
  assert.equal(
    result.error,
    "Insufficient CASUAL balance. Available 0, requested 9."
  );
});

test("paid leave balance subtracts already approved leave in the same year", async () => {
  const calls: unknown[] = [];
  const result = await checkLeaveBalance(
    makeStore({ allocation: 12, taken: 5, calls }),
    {
      userId: "employee-1",
      leaveType: "SICK" as LeaveType,
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      requestedDays: 7,
    }
  );

  assert.deepEqual(result, { ok: true, available: 7 });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], {
    method: "findUnique",
    args: {
      where: {
        userId_leaveType_year: {
          userId: "employee-1",
          leaveType: "SICK",
          year: 2026,
        },
      },
    },
  });
  assert.deepEqual(calls[1], {
    method: "aggregate",
    args: {
      where: {
        userId: "employee-1",
        leaveType: "SICK",
        status: "APPROVED",
        startDate: { gte: new Date(2026, 0, 1) },
        endDate: { lt: new Date(2027, 0, 1) },
      },
      _sum: { totalDays: true },
    },
  });
});

test("unpaid leave skips paid allocation checks", async () => {
  const calls: unknown[] = [];
  const result = await checkLeaveBalance(
    makeStore({ allocation: 0, taken: 0, calls }),
    {
      userId: "employee-1",
      leaveType: "UNPAID" as LeaveType,
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      requestedDays: 30,
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.available, Number.POSITIVE_INFINITY);
  assert.deepEqual(calls, []);
});
