import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ExpenseReport, ExpenseItem } from '../types';
import * as reportsApi from '../api/reports';
import * as itemsApi from '../api/items';
import { formatDate, formatCurrency } from '../utils/format';
import { getErrorMessage } from '../utils/api';
import { CATEGORY_LABELS } from '../utils/constants';
import StatusBadge from '../components/StatusBadge';
import StatsCard from '../components/StatsCard';
import ItemFormModal from '../components/ItemFormModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseItem | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'report' | 'item'; id: string } | null>(null);

  useEffect(() => {
    if (id) loadReport();
  }, [id]);

  async function loadReport() {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await reportsApi.getReport(id);
      setReport(data);
    } catch {
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await reportsApi.submitReport(id);
      setReport(updated);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to submit report'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReopen() {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await reportsApi.reopenReport(id);
      setReport(updated);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to reopen report'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteReport() {
    if (!id) return;
    setActionLoading(true);
    try {
      await reportsApi.deleteReport(id);
      navigate('/reports');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to delete report'));
      setActionLoading(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!id) return;
    setActionLoading(true);
    try {
      await itemsApi.deleteItem(id, itemId);
      await loadReport();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to delete item'));
    } finally {
      setActionLoading(false);
      setDeleteTarget(null);
    }
  }

  const items = report?.items ?? [];
  const editRights = report?.status === 'DRAFT' || report?.status === 'REJECTED';
  const canEditItems = editRights;
  const canSubmit = report?.status === 'DRAFT' && items.length > 0;
  const canDelete = report?.status === 'DRAFT';
  const canReopen = report?.status === 'REJECTED';
  const isReportDelete = deleteTarget?.type === 'report';

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
            <button onClick={() => navigate('/reports')} className="hover:text-primary transition-colors">Reports</button>
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
            {canDelete && (
              <button
                onClick={() => setDeleteTarget({ type: 'report', id: report.id })}
                className="px-4 py-2.5 rounded-lg border-2 border-error text-error font-bold text-sm hover:bg-error/5 transition-colors active:scale-95"
              >
                Delete
              </button>
            )}
            {canReopen && (
              <button
                onClick={handleReopen}
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-lg border-2 border-primary text-primary font-bold text-sm hover:bg-primary/5 transition-colors active:scale-95 disabled:opacity-60"
              >
                Reopen to Draft
              </button>
            )}
            {canSubmit && (
              <button
                onClick={handleSubmit}
                disabled={actionLoading}
                className="px-8 py-2.5 rounded-lg bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-60"
              >
                Submit Report
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            )}
            {report.status === 'SUBMITTED' && (
              <span className="text-on-surface-variant text-sm font-medium">Awaiting review</span>
            )}
            {report.status === 'APPROVED' && (
              <span className="text-[#137333] text-sm font-bold">Approved</span>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          label="Report ID"
          value={report.id.slice(0, 8).toUpperCase()}
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
        <div className="p-6 flex items-center justify-between border-b border-outline-variant/5">
          <h3 className="text-lg font-bold text-on-surface tracking-tight">Expense Line Items</h3>
          {canEditItems && (
            <button
              onClick={() => { setEditingItem(undefined); setItemModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-low text-primary font-bold text-xs hover:bg-surface-container-high transition-colors active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
              </svg>
              Add Item
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant">
            <p>No expense items yet.</p>
            {canEditItems && (
              <button onClick={() => { setEditingItem(undefined); setItemModalOpen(true); }} className="mt-4 text-primary font-bold hover:underline">
                Add your first item
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Merchant</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Receipt</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Amount</th>
                  {canEditItems && (
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-high/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-bold text-on-surface">{item.merchantName}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant tabular-nums">{formatDate(item.transactionDate)}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider rounded">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.receiptUrl ? (
                        <a
                          href={item.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary font-bold text-xs hover:underline"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5v5h-1v-5h1zM10 8v1H9V8h1zm8 6.5h-1V14h1v.5zm-1-2h-1V12h1v.5zm0-2h-1v-1h1v.5zm0-2h-1V10h1v.5zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z" />
                          </svg>
                          View
                        </a>
                      ) : (
                        <span className="text-on-surface-variant/50 text-xs">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-black text-on-surface tabular-nums text-right">{item.currency} {Number(item.amount).toFixed(2)}</td>
                    {canEditItems && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingItem(item); setItemModalOpen(true); }}
                            className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'item', id: item.id })}
                            className="p-2 text-on-surface-variant hover:text-error transition-colors"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canEditItems && (
        <div className="fixed bottom-8 right-8">
          <button
            onClick={() => { setEditingItem(undefined); setItemModalOpen(true); }}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
          </button>
        </div>
      )}

      <ItemFormModal
        key={editingItem?.id ?? 'new'}
        open={itemModalOpen}
        reportId={report.id}
        item={editingItem}
        onClose={() => { setItemModalOpen(false); setEditingItem(undefined); }}
        onSaved={() => { setItemModalOpen(false); setEditingItem(undefined); loadReport(); }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={isReportDelete ? 'Delete Report' : 'Delete Item'}
        message={isReportDelete ? 'This action cannot be undone. The report and all its items will be permanently deleted.' : 'This action cannot be undone. The expense item will be permanently deleted.'}
        onConfirm={() => {
          if (isReportDelete) handleDeleteReport();
          else if (deleteTarget?.id) handleDeleteItem(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
