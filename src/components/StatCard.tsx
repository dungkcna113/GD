import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string;
  tone?: "red" | "green" | "amber" | "gray";
  icon?: ReactNode;
};

export function StatCard({ label, value, tone = "gray", icon }: StatCardProps) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
