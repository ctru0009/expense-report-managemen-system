import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import ReportDetailPage from './ReportDetailPage';
import * as reportsApi from '../api/reports';

const mockUser = { id: 'u1', email: 'user@test.com', role: 'USER' as const, createdAt: '2025-01-01T00:00:00Z' };

const baseItem = {
  id: 'item-1',
  reportId: 'report-123',
  amount: 150.50,
  currency: 'USD',
  category: 'TRAVEL' as const,
  merchantName: 'Acme Airlines',
  transactionDate: '2025-01-10T00:00:00Z',
  receiptUrl: null,
  createdAt: '2025-01-10T00:00:00Z',
  updatedAt: '2025-01-10T00:00:00Z',
};

const baseReport = {
  id: 'report-123',
  userId: 'u1',
  title: 'Q1 Expenses',
  description: 'First quarter',
  totalAmount: 150.50,
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T12:00:00Z',
  items: [baseItem],
};

function renderDetailPage(status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED') {
  localStorage.setItem('token', 'fake-token');
  localStorage.setItem('user', JSON.stringify(mockUser));

  vi.mocked(reportsApi.getReport).mockResolvedValueOnce({ ...baseReport, status });

  return render(
    <MemoryRouter initialEntries={[`/reports/${baseReport.id}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/reports/:id" element={<ReportDetailPage />} />
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/reports" element={<div>Reports List</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

vi.mock('../api/reports', () => ({
  fetchReports: vi.fn(),
  getReport: vi.fn(),
  submitReport: vi.fn(),
  reopenReport: vi.fn(),
  deleteReport: vi.fn(),
  createReport: vi.fn(),
  updateReport: vi.fn(),
}));

vi.mock('../api/items', () => ({
  fetchItems: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}));

vi.mock('../api/receipts', () => ({
  uploadReceipt: vi.fn(),
  extractReceipt: vi.fn(),
  applyExtraction: vi.fn(),
  deleteReceipt: vi.fn(),
  getReceiptFileUrl: vi.fn(() => '/api/receipts/123'),
}));

describe('ReportDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows Submit Report button when report is DRAFT with items', async () => {
    renderDetailPage('DRAFT');

    expect(await screen.findByRole('button', { name: /submit report/i })).toBeInTheDocument();
  });

  it('hides Submit Report button when status is SUBMITTED', async () => {
    renderDetailPage('SUBMITTED');

    expect(await screen.findByRole('heading', { name: 'Q1 Expenses' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit report/i })).not.toBeInTheDocument();
    expect(screen.getByText(/awaiting review/i)).toBeInTheDocument();
  });

  it('hides Submit and Delete buttons when status is APPROVED', async () => {
    renderDetailPage('APPROVED');

    expect(await screen.findByRole('heading', { name: 'Q1 Expenses' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit report/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('shows Reopen to Draft button when status is REJECTED', async () => {
    renderDetailPage('REJECTED');

    expect(await screen.findByRole('button', { name: /reopen to draft/i })).toBeInTheDocument();
  });
});