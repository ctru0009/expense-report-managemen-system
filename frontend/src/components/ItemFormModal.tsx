import { useState, useRef, type FormEvent, type DragEvent } from 'react';
import type { ExpenseItem, Category, CreateItemRequest, ExtractedData } from '../types';
import * as itemsApi from '../api/items';
import * as receiptsApi from '../api/receipts';
import { getErrorMessage } from '../utils/api';
import { CATEGORIES, CURRENCIES } from '../utils/constants';

interface Props {
  open: boolean;
  reportId: string;
  item?: ExpenseItem;
  onClose: () => void;
  onSaved: () => void;
}

type ExtractionState = 'idle' | 'uploading' | 'extracting' | 'done' | 'error';

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

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(
    item?.receiptUrl ?? null,
  );
  const [receiptFileName, setReceiptFileName] = useState<string>(
    item?.receiptUrl ? item.receiptUrl.split('/').pop() ?? '' : '',
  );
  const [extractionState, setExtractionState] = useState<ExtractionState>('idle');
  const [extractionError, setExtractionError] = useState('');
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }

  function processFile(file: File) {
    const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      setError('Unsupported file type. Allowed: PDF, PNG, JPG, WEBP');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      return;
    }

    setReceiptFile(file);
    setReceiptFileName(file.name);
    setError('');

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setReceiptPreviewUrl(url);
    } else {
      setReceiptPreviewUrl(null);
    }

    if (item?.id) {
      uploadAndExtract(file);
    }
  }

  async function uploadAndExtract(file: File) {
    if (!item?.id) return;

    setExtractionState('uploading');
    setExtractionError('');

    try {
      const result = await receiptsApi.uploadReceipt(reportId, item.id, file);

      setReceiptPreviewUrl(result.item.receiptUrl ?? receiptPreviewUrl);
      setExtractionState('done');

      const extracted: ExtractedData = result.extracted;
      const newHighlighted = new Set<string>();

      if (extracted.merchantName) {
        setMerchantName(extracted.merchantName);
        newHighlighted.add('merchantName');
      }
      if (extracted.amount !== undefined) {
        setAmount(extracted.amount.toString());
        newHighlighted.add('amount');
      }
      if (extracted.currency) {
        setCurrency(extracted.currency);
        newHighlighted.add('currency');
      }
      if (extracted.transactionDate) {
        setTransactionDate(extracted.transactionDate);
        newHighlighted.add('transactionDate');
      }

      setHighlightedFields(newHighlighted);
    } catch (err: unknown) {
      setExtractionState('error');
      setExtractionError(getErrorMessage(err, 'AI extraction failed'));
    }
  }

  function clearHighlight(field: string) {
    setHighlightedFields((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }

  function handleReplaceFile() {
    setReceiptFile(null);
    setReceiptPreviewUrl(null);
    setReceiptFileName('');
    setExtractionState('idle');
    setExtractionError('');
    setHighlightedFields(new Set());
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

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

  const isPdf = receiptFileName.toLowerCase().endsWith('.pdf');
  const hasExtraction = extractionState === 'done' && highlightedFields.size > 0;
  const hasReceipt = !!(receiptFile || item?.receiptUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-surface-container-lowest w-full max-w-4xl rounded-xl shadow-[0px_12px_32px_rgba(23,28,31,0.06)] overflow-hidden flex flex-col md:flex-row max-h-[850px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Receipt Preview */}
        <div className="w-full md:w-5/12 bg-surface-container-high p-8 flex flex-col justify-center items-center space-y-6 min-h-[280px]">
          {!hasReceipt ? (
            <div
              className="w-full flex flex-col items-center justify-center py-12 border-2 border-dashed border-outline-variant rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="w-12 h-12 text-on-surface-variant mb-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm8-6v4h-4v-4H8l4-4 4 4h-2z" />
              </svg>
              <p className="text-on-surface-variant font-bold text-sm">Drop receipt here</p>
              <p className="text-on-surface-variant text-xs mt-1">or click to browse</p>
              <p className="text-on-surface-variant/60 text-[10px] mt-2 uppercase tracking-wider">PDF, PNG, JPG, WEBP · Max 10MB</p>
            </div>
          ) : (
            <>
              {receiptPreviewUrl && !isPdf ? (
                <div className="w-full aspect-[3/4] bg-white rounded-lg shadow-lg relative overflow-hidden group">
                  <img
                    src={receiptPreviewUrl}
                    alt="Receipt preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full aspect-[3/4] bg-white rounded-lg shadow-lg flex flex-col items-center justify-center">
                  <svg className="w-16 h-16 text-error mb-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5v5h-1v-5h1zM10 8v1H9V8h1zm8 6.5h-1V14h1v.5zm-1-2h-1V12h1v.5zm0-2h-1v-1h1v1zm0-2h-1V10h1v.5z" />
                  </svg>
                  <p className="text-on-surface-variant text-xs font-bold">PDF Receipt</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider mb-2">File Uploaded</p>
                <p className="text-on-surface font-semibold text-sm">{receiptFileName}</p>
                <button
                  onClick={handleReplaceFile}
                  className="mt-4 text-primary text-xs font-bold flex items-center justify-center gap-1 mx-auto hover:underline"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                  </svg>
                  Replace File
                </button>
              </div>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Right: Form */}
        <div className="w-full md:w-7/12 flex flex-col min-h-0">
          {/* AI Banner */}
          {hasExtraction && (
            <div className="bg-[#fff9c4] text-[#827717] px-8 py-3 flex items-center gap-3 flex-shrink-0">
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />
              </svg>
              <span className="text-sm font-semibold">AI extracted — please review for accuracy</span>
            </div>
          )}

          {/* Extraction error banner */}
          {extractionState === 'error' && (
            <div className="bg-error-container text-on-error-container px-8 py-3 flex items-center gap-3 flex-shrink-0">
              <span className="text-sm font-semibold">{extractionError || 'Extraction failed. You can still fill in the details manually.'}</span>
            </div>
          )}

          {/* Extraction loading */}
          {(extractionState === 'uploading' || extractionState === 'extracting') && (
            <div className="bg-surface-container-low px-8 py-3 flex items-center gap-3 flex-shrink-0">
              <svg className="w-5 h-5 text-primary animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm font-semibold text-on-surface-variant">Analyzing receipt...</span>
            </div>
          )}

          {/* Form Content */}
          <div className="p-8 flex-1 overflow-y-auto space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-on-surface tracking-tight">
                  {item && hasExtraction ? 'Edit Expense Item' : item ? 'Edit Expense Item' : 'Add Expense Item'}
                </h2>
                <p className="text-on-surface-variant text-sm mt-1">
                  {hasExtraction ? 'Review the details extracted from your receipt.' : item ? 'Update the details of this expense.' : 'Add a new expense line item.'}
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
                  onChange={(e) => { setMerchantName(e.target.value); clearHighlight('merchantName'); }}
                  placeholder="e.g. Starbucks"
                  className={`w-full bg-surface-container-low border-0 border-b-2 border-outline-variant px-0 py-2 text-on-surface font-semibold focus:ring-0 focus:border-primary focus:bg-surface-container-lowest transition-all ${highlightedFields.has('merchantName') ? 'ai-highlight' : ''}`}
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
                    onChange={(e) => { setAmount(e.target.value); clearHighlight('amount'); }}
                    placeholder="0.00"
                    className={`w-full bg-surface-container-low border-0 border-b-2 border-outline-variant px-0 py-2 text-on-surface font-semibold focus:ring-0 focus:border-primary focus:bg-surface-container-lowest tabular-nums transition-all ${highlightedFields.has('amount') ? 'ai-highlight' : ''}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => { setCurrency(e.target.value); clearHighlight('currency'); }}
                    className={`w-full bg-surface-container-low border-0 border-b-2 border-outline-variant px-0 py-2 text-on-surface font-semibold focus:ring-0 focus:border-primary focus:bg-surface-container-lowest transition-all ${highlightedFields.has('currency') ? 'ai-highlight' : ''}`}
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
                    onChange={(e) => { setTransactionDate(e.target.value); clearHighlight('transactionDate'); }}
                    className={`w-full bg-surface-container-low border-0 border-b-2 border-outline-variant px-0 py-2 text-on-surface font-semibold focus:ring-0 focus:border-primary focus:bg-surface-container-lowest transition-all ${highlightedFields.has('transactionDate') ? 'ai-highlight' : ''}`}
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="p-8 bg-surface-container-low flex items-center justify-between flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="text-on-surface-variant font-bold text-sm hover:text-on-surface transition-colors"
            >
              Discard
            </button>
            <div className="flex gap-4">
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || extractionState === 'uploading'}
                className="px-6 py-2.5 rounded-lg font-bold text-sm bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg hover:scale-95 active:opacity-80 transition-transform disabled:opacity-60"
              >
                {loading ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}