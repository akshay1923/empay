export type TodayStatus = "PRESENT" | "ABSENT" | "LEAVE" | "NONE";

export type EmployeeListItem = {
  id: string;
  loginId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  joinDate: string | null;
  ctcAnnual: number | null; // paise
  todayStatus: TodayStatus;
};
