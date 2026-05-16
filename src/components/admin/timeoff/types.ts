import type { LeaveStatus, LeaveType } from "@prisma/client";

export type LeaveRequestRow = {
  id: string;
  userId: string;
  fullName: string;
  loginId: string | null;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  leaveType: LeaveType;
  status: LeaveStatus;
  receiptUrl: string | null;
  receiptName: string | null;
};

export type AllocationRow = {
  id: string;
  userId: string;
  fullName: string;
  loginId: string | null;
  leaveType: LeaveType;
  year: number;
  totalDays: number;
  usedDays: number;
  availableDays: number;
};

export type EmployeeOption = {
  id: string;
  fullName: string;
  loginId: string | null;
  email: string;
};

export type LeaveSummary = {
  leaveType: LeaveType;
  label: string;
  totalAvailable: number;
  totalAllocated: number;
};
