import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { AdminExpenseReport } from '../types';
import * as adminApi from '../api/admin';
import { formatDate, formatCurrency } from '../utils/format';
import { getErrorMessage } from '../utils/api';
import { CATEGORY_LABELS } from '../utils/constants';
import StatusBadge from '../components/StatusBadge';
import StatsCard from '../components/StatsCard';

export default function AdminReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<AdminExpenseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) loadReport();
  }, [id]);

  async function loadReport() {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getAdminReport(id);
      setReport(data);
    } catch (err) {
      console.error('Failed to load admin report:', err);
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = useCallback(async () => {
    if (!id) return;
    setActionLoading(true);
    setError('');
    try {
      const updated = await adminApi.approveReport(id);
      setReport(updated);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to approve report'));
    } finally {
      setActionLoading(false);
    }
  }, [id]);

  const handleReject = useCallback(async () => {
    if (!id) return;
    setActionLoading(true);
    setError('');
    try {
      const updated = await adminApi.rejectReport(id);
      setReport(updated);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to reject report'));
    } finally {
      setActionLoading(false);
    }
  }, [id]);

  const items = report?.items ?? [];
  const canAction = report?.status === 'SUBMITTED';

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-on-surface-variant font-medium">Loading report...</p>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="p-8">
        <div className="p-4 bg-error-container rounded-md text-on-error-container font-medium">{error}</div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      {error && (
        <div className="p-4 bg-error-container rounded-md text-on-error-container font-medium">{error}</div>
      )}

      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div className="space-y-4">
          <nav className="flex items-center gap-2 text-on-surface-variant text-xs font-medium tracking-wide uppercase">
            <button onClick={() => navigate('/admin')} className="hover:text-primary transition-colors">Admin</button>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
            <span className="text-on-surface">{report.title}</span>
          </nav>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-4xl font-extrabold tracking-tight text-on-surface">{report.title}</h2>
              <StatusBadge status={report.status} />
            </div>
            <p className="text-on-surface-variant text-sm font-medium">Submitted by <span className="text-on-surface font-bold">{report.user.email}</span></p>
            {report.description && (
              <p className="text-on-surface-variant font-medium">{report.description}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Calculated Total</span>
            <span className="text-4xl font-black text-primary tabular-nums tracking-tighter">
              {formatCurrency(Number(report.totalAmount))}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {canAction && (
              <>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-lg border-2 border-error text-error font-bold text-sm hover:bg-error/5 transition-colors active:scale-95 disabled:opacity-60"
                >
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-8 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm shadow-lg hover:opacity-90 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-60"
                >
                  Approve
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </button>
              </>
            )}
            {report.status === 'APPROVED' && (
              <span className="text-primary text-sm font-bold">Approved</span>
            )}
            {report.status === 'REJECTED' && (
              <span className="text-on-error-container text-sm font-bold">Rejected</span>
            )}
            {report.status === 'DRAFT' && (
              <span className="text-on-surface-variant text-sm font-medium">Not yet submitted</span>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          label="Report ID"
          value={report.id.slice(0, 8).toUpperCase()}
          borderColor="border-outline-variant/10"
        />
        <StatsCard
          label="Submitted By"
          value={report.user.email}
          borderColor="border-outline-variant/10"
        />
        <StatsCard
          label="Total Items"
          value={
            <>
              <span>{items.length}</span>
              <span className="text-on-surface-variant text-sm font-medium ml-2">
                {items.length === 1 ? 'item' : 'items'}
              </span>
            </>
          }
          borderColor="border-outline-variant/10"
        />
        <StatsCard
          label="Created Date"
          value={formatDate(report.createdAt)}
          borderColor="border-outline-variant/10"
        />
      </section>

      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-outline-variant/5">
          <h3 className="text-lg font-bold text-on-surface tracking-tight">Expense Line Items</h3>
        </div>

        {items.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant">
            <p>No expense items.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Merchant</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-high/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-on-surface">{item.merchantName}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant tabular-nums">{formatDate(item.transactionDate)}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider rounded">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-on-surface tabular-nums text-right">{formatCurrency(Number(item.amount))}</td>
                    <td className="px-6 py-4">
                      {item.receiptUrl ? (
                        <a
                          href={item.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-xs font-bold hover:underline"
                        >
                          View Receipt
                        </a>
                      ) : (
                        <span className="text-on-surface-variant text-xs">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}