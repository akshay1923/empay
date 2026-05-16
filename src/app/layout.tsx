import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EmPay — Smart HRMS",
  description:
    "EmPay is a connected workspace for HR. Attendance feeds leave; both feed payroll.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
