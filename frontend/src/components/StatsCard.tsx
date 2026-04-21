import type { ReactNode } from 'react';

export default function StatsCard({
  label,
  value,
  subtitle,
  borderColor = 'border-primary',
}: {
  label: string;
  value: ReactNode;
  subtitle?: ReactNode;
  borderColor?: string;
}) {
  return (
    <div className={`bg-surface-container-lowest p-6 rounded-xl border-l-4 ${borderColor} shadow-sm`}>
      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-black text-on-surface tabular-nums tracking-tighter">{value}</p>
      {subtitle && <p className="text-[11px] text-on-surface-variant font-semibold mt-2">{subtitle}</p>}
    </div>
  );
}
