import { LeaveType } from "@prisma/client";

type LeaveAllocationRecord = {
  totalDays: number;
};

type LeaveAggregateResult = {
  _sum: {
    totalDays: number | null;
  };
};

export type LeaveBalanceStore = {
  leaveAllocation: {
    findUnique(args: {
      where: {
        userId_leaveType_year: {
          userId: string;
          leaveType: LeaveType;
          year: number;
        };
      };
    }): Promise<LeaveAllocationRecord | null>;
  };
  leaveRequest: {
    aggregate(args: {
      where: {
        userId: string;
        leaveType: LeaveType;
        status: "APPROVED";
        startDate: { gte: Date };
        endDate: { lt: Date };
      };
      _sum: { totalDays: true };
    }): Promise<LeaveAggregateResult>;
  };
};

export type LeaveBalanceResult =
  | {
      ok: true;
      available: number;
    }
  | {
      ok: false;
      available: number;
      requested: number;
      error: string;
    };

export function leaveYearRange(date: Date): {
  year: number;
  start: Date;
  end: Date;
} {
  const year = date.getFullYear();

  return {
    year,
    start: new Date(year, 0, 1),
    end: new Date(year + 1, 0, 1),
  };
}

export async function checkLeaveBalance(
  store: LeaveBalanceStore,
  input: {
    userId: string;
    leaveType: LeaveType;
    startDate: Date;
    requestedDays: number;
  }
): Promise<LeaveBalanceResult> {
  if (input.leaveType === "UNPAID") {
    return { ok: true, available: Number.POSITIVE_INFINITY };
  }

  const { year, start, end } = leaveYearRange(input.startDate);
  const allocation = await store.leaveAllocation.findUnique({
    where: {
      userId_leaveType_year: {
        userId: input.userId,
        leaveType: input.leaveType,
        year,
      },
    },
  });

  const taken = await store.leaveRequest.aggregate({
    where: {
      userId: input.userId,
      leaveType: input.leaveType,
      status: "APPROVED",
      startDate: { gte: start },
      endDate: { lt: end },
    },
    _sum: { totalDays: true },
  });

  const available =
    (allocation?.totalDays ?? 0) - (taken._sum.totalDays ?? 0);

  if (available < input.requestedDays) {
    return {
      ok: false,
      available,
      requested: input.requestedDays,
      error: `Insufficient ${input.leaveType} balance. Available ${available}, requested ${input.requestedDays}.`,
    };
  }

  return { ok: true, available };
}
