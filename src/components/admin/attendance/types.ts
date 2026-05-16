export type CellStatus =
  | "PRESENT"
  | "ABSENT"
  | "HALF_DAY"
  | "ON_LEAVE"
  | "HOLIDAY"
  | "WEEKEND"
  | "NONE";

export type DayCol = {
  iso: string;
  weekday: string;
  dayMonth: string;
  isWeekend: boolean;
  isToday: boolean;
};

export type EmployeeRow = {
  id: string;
  fullName: string;
  loginId: string | null;
  department: string | null;
  cells: CellStatus[];
  totals: { present: number; absent: number; leave: number };
  /** Populated only when the date range is exactly one day. */
  day?: {
    status: CellStatus;
    checkInAt: string | null;
    checkOutAt: string | null;
    workMinutes: number | null;
    extraMinutes: number | null;
  };
};

/** Standard working day length used for "Extra hours" computation. */
export const STANDARD_WORK_MINUTES = 8 * 60;
