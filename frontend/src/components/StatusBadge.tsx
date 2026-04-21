import type { ReportStatus } from '../types';

const styles: Record<ReportStatus, string> = {
  DRAFT: 'bg-secondary-container text-on-secondary-container',
  SUBMITTED: 'bg-primary-fixed text-on-primary-fixed-variant',
  APPROVED: 'bg-[#e6f4ea] text-[#137333]',
  REJECTED: 'bg-error-container text-on-error-container',
};

export default function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={`px-3 py-1 text-[11px] font-bold rounded-full uppercase tracking-tighter ${styles[status]}`}>
      {status}
    </span>
  );
}
