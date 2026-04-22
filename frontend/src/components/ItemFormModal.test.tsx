import { render, screen } from '@testing-library/react';
import ItemFormModal from './ItemFormModal';

const baseProps = {
  open: true,
  reportId: 'test-report-id',
  onClose: vi.fn(),
  onSaved: vi.fn(),
};

describe('ItemFormModal', () => {
  it('enables all form inputs when reportStatus is DRAFT', () => {
    render(<ItemFormModal {...baseProps} reportStatus="DRAFT" />);

    expect(screen.getByPlaceholderText(/e\.g\. starbucks/i)).not.toBeDisabled();
    expect(screen.getByPlaceholderText('0.00')).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /add item/i })).not.toBeDisabled();
  });

  it.each(['SUBMITTED', 'APPROVED', 'REJECTED'] as const)(
    'disables all form inputs when reportStatus is %s',
    (status) => {
      render(<ItemFormModal {...baseProps} reportStatus={status} />);

      expect(screen.getByPlaceholderText(/e\.g\. starbucks/i)).toBeDisabled();
      expect(screen.getByPlaceholderText('0.00')).toBeDisabled();
      expect(screen.getByRole('button', { name: /add item/i })).toBeDisabled();
    },
  );

  it('enables inputs when reportStatus is undefined (new item in draft)', () => {
    render(<ItemFormModal {...baseProps} />);

    expect(screen.getByPlaceholderText(/e\.g\. starbucks/i)).not.toBeDisabled();
    expect(screen.getByPlaceholderText('0.00')).not.toBeDisabled();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(<ItemFormModal {...baseProps} open={false} />);
    expect(container.innerHTML).toBe('');
  });
});