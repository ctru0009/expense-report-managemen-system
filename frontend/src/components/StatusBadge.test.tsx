import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';
import type { ReportStatus } from '../types';

const STATUS_CLASSES: Record<ReportStatus, string> = {
  DRAFT: 'bg-secondary-container',
  SUBMITTED: 'bg-primary-fixed',
  APPROVED: 'bg-[#e6f4ea]',
  REJECTED: 'bg-error-container',
};

describe('StatusBadge', () => {
  it.each(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as ReportStatus[])(
    'renders the %s status badge with correct text and class',
    (status) => {
      render(<StatusBadge status={status} />);
      const badge = screen.getByText(status);
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain(STATUS_CLASSES[status]);
    },
  );
});