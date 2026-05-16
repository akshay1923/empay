export type SalaryTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  basicPercent: number;
  hraPercent: number;
  standardAllowancePercent: number;
  performanceBonusPercent: number;
  ltaPercent: number;
  pfEmployeePercent: number;
  pfEmployerPercent: number;
  professionalTax: number;
  workingDaysPerWeek: number;
  breakTimeHours: number;
};

export type SalaryTemplateOption = {
  id: string;
  name: string;
};
