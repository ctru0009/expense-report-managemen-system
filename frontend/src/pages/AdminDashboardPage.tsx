import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AdminExpenseReport, ReportStatus } from '../types';
import * as adminApi from '../api/admin';
import { formatDate, formatCurrency } from '../utils/format';
import { getErrorMessage } from '../utils/api';
import StatusBadge from '../components/StatusBadge';

const STATUS_TABS: { label: string; value: ReportStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [allReports, setAllReports] = useState<AdminExpenseReport[]>([]);
  const [activeTab, setActiveTab] = useState<ReportStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.fetchAdminReports();
      setAllReports(data);
    } catch (err) {
      console.error('Failed to load admin reports:', err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(
    () => activeTab === 'ALL' ? allReports : allReports.filter((r) => r.status === activeTab),
    [allReports, activeTab],
  );

  const stats = useMemo(() => {
    let submittedCount = 0;
    let approvedTotal = 0;
    let reviewedCount = 0;
    let totalActionable = 0;
    for (const r of allReports) {
      if (r.status === 'SUBMITTED') submittedCount++;
      if (r.status === 'APPROVED') approvedTotal += Number(r.totalAmount);
      if (r.status === 'APPROVED' || r.status === 'REJECTED') reviewedCount++;
      if (r.status === 'SUBMITTED' || r.status === 'APPROVED' || r.status === 'REJECTED') totalActionable++;
    }
    const auditPct = totalActionable > 0 ? Math.round((reviewedCount / totalActionable) * 100) : 0;
    return { submittedCount, approvedTotal, auditPct };
  }, [allReports]);

  const handleApprove = useCallback(async (id: string) => {
    setActionLoading(id + '-approve');
    setError('');
    try {
      const updated = await adminApi.approveReport(id);
      setAllReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to approve report'));
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleReject = useCallback(async (id: string) => {
    setActionLoading(id + '-reject');
    setError('');
    try {
      const updated = await adminApi.rejectReport(id);
      setAllReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to reject report'));
    } finally {
      setActionLoading(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-on-surface-variant font-medium">Loading reports...</p>
      </div>
    );
  }

  if (error && allReports.length === 0) {
    return (
      <div className="p-8">
        <div className="p-4 bg-error-container rounded-md text-on-error-container font-medium">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      {error && (
        <div className="p-4 bg-error-container rounded-md text-on-error-container font-medium">{error}</div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-on-surface">Master Ledger</h1>
          <p className="text-on-surface-variant text-sm mt-1">Oversee and audit corporate expense submissions across all departments.</p>
        </div>
        <div className="bg-surface-container-low p-1 rounded-lg flex items-center gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-5 py-1.5 text-sm font-semibold rounded transition-all ${
                activeTab === tab.value
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-low rounded-xl p-6 flex flex-col justify-between">
          <div>
            <svg className="w-6 h-6 text-primary mb-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.81-.7l-1.46 1.46C9.11 19.56 10.51 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.81.7l1.46-1.46C14.89 4.44 13.49 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z" />
            </svg>
            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-1">Pending Review</h3>
            <p className="text-2xl font-black text-on-surface tabular-nums">{stats.submittedCount}</p>
          </div>
          <p className="text-xs text-primary mt-4 font-medium">
            Awaiting admin action
          </p>
        </div>

        <div className="bg-surface-container-low rounded-xl p-6 flex flex-col justify-between">
          <div>
            <svg className="w-6 h-6 text-primary mb-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
            </svg>
            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total Disbursed</h3>
            <p className="text-2xl font-black text-on-surface tabular-nums">{formatCurrency(stats.approvedTotal)}</p>
          </div>
          <p className="text-xs text-on-surface-variant mt-4 font-medium">
            Approved expenses
          </p>
        </div>

        <div className="bg-primary-container text-on-primary-container rounded-xl p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-2 opacity-80">Audit Completion</h3>
            <p className="text-3xl font-black tabular-nums">{stats.auditPct}%</p>
            <div className="w-full h-1.5 bg-white/20 rounded-full mt-4">
              <div className="h-full bg-white rounded-full" style={{ width: `${stats.auditPct}%` }} />
            </div>
          </div>
          <svg className="absolute -right-4 -bottom-4 opacity-10 w-32 h-32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.41 13.59L6 11.7l1.41-1.41 3.18 3.18 6.59-6.59L18.59 8.29l-8 8z" />
          </svg>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/15 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">User Email</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Report Title</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Total Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Submitted Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                    No reports found.
                  </td>
                </tr>
              ) : (
                filtered.map((report) => (
                  <tr
                    key={report.id}
                    className="group hover:bg-surface-container-high/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/reports/${report.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-on-surface text-sm">{report.user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-on-surface">{report.title}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="px-6 py-4 text-sm font-bold tabular-nums text-on-surface text-right">
                      {formatCurrency(Number(report.totalAmount))}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {report.status !== 'DRAFT' ? formatDate(report.updatedAt) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {report.status === 'SUBMITTED' && (
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleApprove(report.id)}
                            disabled={actionLoading === report.id + '-approve'}
                            className="px-3 py-1.5 text-xs font-bold text-primary bg-primary-container rounded hover:bg-primary-container/80 transition-colors disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(report.id)}
                            disabled={actionLoading === report.id + '-reject'}
                            className="px-3 py-1.5 text-xs font-bold text-on-error-container bg-error-container rounded hover:bg-error-container/80 transition-colors disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-6 py-4 bg-surface-container-low/30 border-t border-outline-variant/10 flex items-center justify-between">
            <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
              Showing {filtered.length} of {allReports.length} reports
            </span>
          </div>
        )}
      </div>
    </div>
  );
}