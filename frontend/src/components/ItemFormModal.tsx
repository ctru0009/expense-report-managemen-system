import { useState, type FormEvent } from 'react';
import type { ExpenseItem, Category, CreateItemRequest } from '../types';
import * as itemsApi from '../api/items';
import { getErrorMessage } from '../utils/api';
import { CATEGORIES, CURRENCIES } from '../utils/constants';

interface Props {
  open: boolean;
  reportId: string;
  item?: ExpenseItem;
  onClose: () => void;
  onSaved: () => void;
}

export default function ItemFormModal({ open, reportId, item, onClose, onSaved }: Props) {
  const [merchantName, setMerchantName] = useState(item?.merchantName ?? '');
  const [amount, setAmount] = useState(item?.amount?.toString() ?? '');
  const [currency, setCurrency] = useState(item?.currency ?? 'USD');
  const [category, setCategory] = useState<Category>(item?.category ?? 'TRAVEL');
  const [transactionDate, setTransactionDate] = useState(
    item?.transactionDate ? item.transactionDate.slice(0, 10) : '',
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload: CreateItemRequest = {
      merchantName,
      amount: parseFloat(amount),
      currency,
      category,
      transactionDate: new Date(transactionDate).toISOString(),
    };

    if (isNaN(payload.amount) || payload.amount <= 0) {
      setError('Please enter a valid amount');
      setLoading(false);
      return;
    }

    try {
      if (item) {
        await itemsApi.updateItem(reportId, item.id, payload);
      } else {
        await itemsApi.createItem(reportId, payload);
      }
      onSaved();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save item'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-container-lowest w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black text-on-surface tracking-tight">
                {item ? 'Edit Expense Item' : 'Add Expense Item'}
              </h2>
              <p className="text-on-surface-variant text-sm mt-1">
                {item ? 'Update the details of this expense.' : 'Add a new expense line item.'}
              </p>
            </div>
            <button onClick={onClose} className="text-on-surface-variant hover:text-error transition-colors">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="p-4 bg-error-container rounded-md text-on-error-container text-sm font-medium">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Merchant Name</label>
              <input
                type="text"
                required
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                placeholder="e.g. Starbucks"
                className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant px-0 py-2 text-on-surface font-semibold focus:ring-0 focus:border-primary focus:bg-surface-container-lowest transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant px-0 py-2 text-on-surface font-semibold focus:ring-0 focus:border-primary focus:bg-surface-container-lowest tabular-nums transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant px-0 py-2 text-on-surface font-semibold focus:ring-0 focus:border-primary focus:bg-surface-container-lowest transition-all"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant px-0 py-2 text-on-surface font-semibold focus:ring-0 focus:border-primary focus:bg-surface-container-lowest transition-all"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Transaction Date</label>
                <input
                  type="date"
                  required
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant px-0 py-2 text-on-surface font-semibold focus:ring-0 focus:border-primary focus:bg-surface-container-lowest transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-surface-container-high text-on-surface font-bold rounded-lg hover:bg-surface-variant transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-lg shadow-lg active:scale-95 transition-all disabled:opacity-60"
              >
                {loading ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
