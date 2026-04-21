import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ExpenseReport, ReportStatus } from '../types';
import * as reportsApi from '../api/reports';
import { formatDate, formatCurrency } from '../utils/format';
import StatusBadge from '../components/StatusBadge';
import StatsCard from '../components/StatsCard';

const STATUS_TABS: { label: string; value: ReportStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

export default function ReportListPage() {
  const navigate = useNavigate();
  const [allReports, setAllReports] = useState<ExpenseReport[]>([]);
  const [activeTab, setActiveTab] = useState<ReportStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    setError('');
    try {
      const data = await reportsApi.fetchReports();
      setAllReports(data);
    } catch {
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
    let totalOutstanding = 0;
    let draftCount = 0;
    let inReviewCount = 0;
    let approvedTotal = 0;
    for (const r of allReports) {
      if (r.status === 'DRAFT') draftCount++;
      if (r.status === 'SUBMITTED') inReviewCount++;
      if (r.status === 'DRAFT' || r.status === 'SUBMITTED') totalOutstanding += Number(r.totalAmount);
      if (r.status === 'APPROVED') approvedTotal += Number(r.totalAmount);
    }
    return { totalOutstanding, draftCount, inReviewCount, approvedTotal };
  }, [allReports]);

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-on-surface-variant font-medium">Loading reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-error-container rounded-md text-on-error-container font-medium">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard label="Total Outstanding" value={formatCurrency(stats.totalOutstanding)} borderColor="border-primary" />
        <StatsCard label="Draft Reports" value={stats.draftCount.toString()} subtitle="Saved for later" borderColor="border-secondary" />
        <StatsCard label="In Review" value={stats.inReviewCount.toString()} subtitle="Awaiting approval" borderColor="border-primary-container" />
        <StatsCard label="Approved YTD" value={formatCurrency(stats.approvedTotal)} borderColor="border-[#137333]" />
      </section>

      <section className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
        <div className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-on-surface">Recent Reports</h2>
            <p className="text-sm text-on-surface-variant">Manage and track your expense submissions</p>
          </div>
        </div>

        <div className="px-8 pb-4 flex gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.value
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-8 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Report Title</th>
                <th className="px-8 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Total Amount</th>
                <th className="px-8 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Created Date</th>
                <th className="px-8 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-on-surface-variant">
                    No reports found. Create your first report to get started.
                  </td>
                </tr>
              ) : (
                filtered.map((report) => (
                  <tr
                    key={report.id}
                    className="group hover:bg-surface-container-high/40 cursor-pointer transition-all"
                    onClick={() => navigate(`/reports/${report.id}`)}
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold text-on-surface group-hover:text-primary transition-colors">{report.title}</p>
                          <p className="text-xs text-on-surface-variant">ID: {report.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="px-8 py-5 text-right tabular-nums font-bold text-on-surface">
                      {formatCurrency(Number(report.totalAmount))}
                    </td>
                    <td className="px-8 py-5 text-sm text-on-surface-variant">{formatDate(report.createdAt)}</td>
                    <td className="px-8 py-5 text-right">
                      <svg className="w-5 h-5 text-outline group-hover:text-primary transition-all opacity-0 group-hover:opacity-100" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                      </svg>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-8 py-4 bg-surface-container-low/30 border-t border-outline-variant/10">
            <p className="text-xs text-on-surface-variant font-medium">
              Showing {filtered.length} of {allReports.length} reports
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
