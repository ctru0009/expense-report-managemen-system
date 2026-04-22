import { useState, useRef, type FormEvent, type DragEvent } from 'react';
import type { ExpenseItem, Category, CreateItemRequest, ExtractedData, ApplyExtractionRequest } from '../types';
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

const CONFIDENCE_THRESHOLD = 0.8;

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
  const [highlightedFields, setHighlightedFields] = useState<Map<string, 'high' | 'low'>>(new Map());
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [dismissedFields, setDismissedFields] = useState<Set<string>>(new Set());
  const [draftItemId, setDraftItemId] = useState<string | null>(null);
  const [isDraft, setIsDraft] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const isEditing = !!item?.id;
  const effectiveItemId = item?.id ?? draftItemId;
  const hasExtraction = extractionState === 'done' && highlightedFields.size > 0;
  const hasReceipt = !!(receiptFile || item?.receiptUrl || receiptPreviewUrl);
  const isPdf = receiptFileName.toLowerCase().endsWith('.pdf');

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
    setDismissedFields(new Set());

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setReceiptPreviewUrl(url);
    } else {
      setReceiptPreviewUrl(null);
    }

    startUploadAndExtract(file);
  }

  async function ensureItemId(): Promise<string> {
    if (item?.id) return item.id;
    if (draftItemId) return draftItemId;

    const draft = await itemsApi.createItem(reportId, {
      merchantName: 'New Expense',
      amount: 0.01,
      currency: 'USD',
      category: 'OTHER',
      transactionDate: new Date().toISOString(),
    });

    setDraftItemId(draft.id);
    setIsDraft(true);
    return draft.id;
  }

  async function startUploadAndExtract(file: File) {
    setExtractionState('uploading');
    setExtractionError('');

    try {
      const itemId = await ensureItemId();

      await receiptsApi.uploadReceipt(reportId, itemId, file);

      setExtractionState('extracting');

      const result = await receiptsApi.extractReceipt(reportId, itemId);

      setReceiptPreviewUrl((prev) => result.receiptUrl ? `/uploads/${result.receiptUrl.split('/').pop()}` : prev);
      setExtractedData(result.extracted);
      setExtractionState('done');
      applyExtractedData(result.extracted);
    } catch (err: unknown) {
      setExtractionState('error');
      setExtractionError(getErrorMessage(err, 'AI extraction failed'));
    }
  }

  function applyExtractedData(data: ExtractedData) {
    const newHighlighted = new Map<string, 'high' | 'low'>();

    if (data.merchantName && !dismissedFields.has('merchantName')) {
      if (data.merchantName.confidence >= CONFIDENCE_THRESHOLD) {
        setMerchantName(data.merchantName.value);
        newHighlighted.set('merchantName', 'high');
      } else {
        newHighlighted.set('merchantName', 'low');
      }
    }

    if (data.amount && !dismissedFields.has('amount')) {
      if (data.amount.confidence >= CONFIDENCE_THRESHOLD) {
        setAmount(data.amount.value.toString());
        newHighlighted.set('amount', 'high');
      } else {
        newHighlighted.set('amount', 'low');
      }
    }

    if (data.currency && !dismissedFields.has('currency')) {
      if (data.currency.confidence >= CONFIDENCE_THRESHOLD) {
        setCurrency(data.currency.value);
        newHighlighted.set('currency', 'high');
      } else {
        newHighlighted.set('currency', 'low');
      }
    }

    if (data.category && !dismissedFields.has('category')) {
      const validCats = CATEGORIES.map((c) => c.value);
      const catValue = validCats.includes(data.category.value as Category)
        ? (data.category.value as Category)
        : 'OTHER';
      if (data.category.confidence >= CONFIDENCE_THRESHOLD) {
        setCategory(catValue);
        newHighlighted.set('category', 'high');
      } else {
        newHighlighted.set('category', 'low');
      }
    }

    if (data.transactionDate && !dismissedFields.has('transactionDate')) {
      if (data.transactionDate.confidence >= CONFIDENCE_THRESHOLD) {
        setTransactionDate(data.transactionDate.value);
        newHighlighted.set('transactionDate', 'high');
      } else {
        newHighlighted.set('transactionDate', 'low');
      }
    }

    setHighlightedFields(newHighlighted);
  }

  function acceptField(field: string) {
    if (!extractedData) return;

    const data = extractedData as Record<string, { value: unknown; confidence: number } | undefined>;
    const fieldData = data[field];
    if (!fieldData) return;

    switch (field) {
      case 'merchantName':
        if (typeof fieldData.value === 'string') setMerchantName(fieldData.value);
        break;
      case 'amount':
        if (typeof fieldData.value === 'number') setAmount(fieldData.value.toString());
        break;
      case 'currency':
        if (typeof fieldData.value === 'string') setCurrency(fieldData.value);
        break;
      case 'category': {
        const validCats = CATEGORIES.map((c) => c.value);
        const cat = validCats.includes(fieldData.value as Category)
          ? (fieldData.value as Category)
          : 'OTHER';
        setCategory(cat);
        break;
      }
      case 'transactionDate':
        if (typeof fieldData.value === 'string') setTransactionDate(fieldData.value);
        break;
    }

    setHighlightedFields((prev) => {
      const next = new Map(prev);
      next.set(field, 'high');
      return next;
    });
    setDismissedFields((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }

  function dismissField(field: string) {
    setHighlightedFields((prev) => {
      const next = new Map(prev);
      next.delete(field);
      return next;
    });
    setDismissedFields((prev) => {
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  }

  function acceptAllFields() {
    if (!extractedData) return;

    const newHighlighted = new Map<string, 'high' | 'low'>();

    if (extractedData.merchantName) {
      setMerchantName(extractedData.merchantName.value);
      newHighlighted.set('merchantName', extractedData.merchantName.confidence >= CONFIDENCE_THRESHOLD ? 'high' : 'high');
    }
    if (extractedData.amount) {
      setAmount(extractedData.amount.value.toString());
      newHighlighted.set('amount', 'high');
    }
    if (extractedData.currency) {
      setCurrency(extractedData.currency.value);
      newHighlighted.set('currency', 'high');
    }
    if (extractedData.category) {
      const validCats = CATEGORIES.map((c) => c.value);
      const cat = validCats.includes(extractedData.category.value as Category)
        ? (extractedData.category.value as Category)
        : 'OTHER';
      setCategory(cat);
      newHighlighted.set('category', 'high');
    }
    if (extractedData.transactionDate) {
      setTransactionDate(extractedData.transactionDate.value);
      newHighlighted.set('transactionDate', 'high');
    }

    setHighlightedFields(newHighlighted);
    setDismissedFields(new Set());
  }

  function dismissAllLow() {
    const newDismissed = new Set(dismissedFields);
    highlightedFields.forEach((level, field) => {
      if (level === 'low') {
        newDismissed.add(field);
      }
    });
    setDismissedFields(newDismissed);

    const newHighlighted = new Map(highlightedFields);
    highlightedFields.forEach((level, field) => {
      if (level === 'low') {
        newHighlighted.delete(field);
      }
    });
    setHighlightedFields(newHighlighted);
  }

  function clearHighlight(field: string) {
    setHighlightedFields((prev) => {
      const next = new Map(prev);
      next.delete(field);
      return next;
    });
  }

  async function handleDeleteReceipt() {
    const itemId = effectiveItemId;
    if (!itemId) return;
    try {
      await receiptsApi.deleteReceipt(reportId, itemId);
      setReceiptFile(null);
      setReceiptPreviewUrl(null);
      setReceiptFileName('');
      setExtractionState('idle');
      setExtractionError('');
      setHighlightedFields(new Map());
      setExtractedData(null);
      setDismissedFields(new Set());
      onSaved();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to remove receipt'));
    }
  }

  function handleClearReceipt() {
    setReceiptFile(null);
    setReceiptPreviewUrl(null);
    setReceiptFileName('');
    setExtractionState('idle');
    setExtractionError('');
    setHighlightedFields(new Map());
    setExtractedData(null);
    setDismissedFields(new Set());
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleReExtract() {
    const itemId = effectiveItemId;
    if (!itemId) return;

    setExtractionState('extracting');
    setExtractionError('');
    setDismissedFields(new Set());

    try {
      const result = await receiptsApi.extractReceipt(reportId, itemId);
      setExtractedData(result.extracted);
      setExtractionState('done');
      applyExtractedData(result.extracted);
    } catch (err: unknown) {
      setExtractionState('error');
      setExtractionError(getErrorMessage(err, 'AI extraction failed'));
    }
  }

  async function cleanupDraft() {
    if (isDraft && draftItemId) {
      try {
        await itemsApi.deleteItem(reportId, draftItemId);
      } catch {
        // best-effort cleanup
      }
      setDraftItemId(null);
      setIsDraft(false);
    }
  }

  async function handleClose() {
    await cleanupDraft();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!merchantName.trim()) {
      setError('Merchant name is required');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than zero');
      return;
    }

    if (!transactionDate) {
      setError('Transaction date is required');
      return;
    }

    const dateObj = new Date(transactionDate);
    if (isNaN(dateObj.getTime())) {
      setError('Invalid transaction date');
      return;
    }

    setLoading(true);

    const payload: CreateItemRequest = {
      merchantName: merchantName.trim(),
      amount: parsedAmount,
      currency,
      category,
      transactionDate: dateObj.toISOString(),
    };

    try {
      if (isDraft && draftItemId) {
        await itemsApi.updateItem(reportId, draftItemId, payload);

        if (highlightedFields.size > 0) {
          const applyFields: ApplyExtractionRequest = {};
          if (highlightedFields.has('merchantName')) applyFields.merchantName = merchantName.trim();
          if (highlightedFields.has('amount')) applyFields.amount = parsedAmount;
          if (highlightedFields.has('currency')) applyFields.currency = currency;
          if (highlightedFields.has('category')) applyFields.category = category;
          if (highlightedFields.has('transactionDate')) applyFields.transactionDate = transactionDate;

          if (Object.keys(applyFields).length > 0) {
            try {
              await receiptsApi.applyExtraction(reportId, draftItemId, applyFields);
            } catch {
              // non-fatal — item is already updated via updateItem
            }
          }
        }

        setIsDraft(false);
      } else if (item) {
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

  function renderSuggestionChips() {
    if (!extractedData || extractionState !== 'done') return null;

    const chips: { field: string; label: string; valueDisplay: string; confidence: number }[] = [];

    if (extractedData.merchantName && !highlightedFields.has('merchantName') && !dismissedFields.has('merchantName')) {
      chips.push({ field: 'merchantName', label: 'Merchant', valueDisplay: extractedData.merchantName.value, confidence: extractedData.merchantName.confidence });
    }
    if (extractedData.amount && !highlightedFields.has('amount') && !dismissedFields.has('amount')) {
      chips.push({ field: 'amount', label: 'Amount', valueDisplay: extractedData.amount.value.toFixed(2), confidence: extractedData.amount.confidence });
    }
    if (extractedData.currency && !highlightedFields.has('currency') && !dismissedFields.has('currency')) {
      chips.push({ field: 'currency', label: 'Currency', valueDisplay: extractedData.currency.value, confidence: extractedData.currency.confidence });
    }
    if (extractedData.category && !highlightedFields.has('category') && !dismissedFields.has('category')) {
      chips.push({ field: 'category', label: 'Category', valueDisplay: extractedData.category.value, confidence: extractedData.category.confidence });
    }
    if (extractedData.transactionDate && !highlightedFields.has('transactionDate') && !dismissedFields.has('transactionDate')) {
      chips.push({ field: 'transactionDate', label: 'Date', valueDisplay: extractedData.transactionDate.value, confidence: extractedData.transactionDate.confidence });
    }

    if (chips.length === 0) return null;

    return (
      <div className="space-y-2 pt-2">
        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">AI Suggestions</p>
        {chips.map((chip) => (
          <div
            key={chip.field}
            className={`flex items-center gap-2 text-sm ${chip.confidence < CONFIDENCE_THRESHOLD ? 'suggestion-chip-low' : ''} suggestion-chip`}
          >
            <svg className="w-3.5 h-3.5 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5z" />
            </svg>
            <span className="font-medium text-on-surface">{chip.label}:</span>
            <span className="font-semibold text-on-surface">{chip.valueDisplay}</span>
            <span className="text-on-surface-variant text-[10px]">({Math.round(chip.confidence * 100)}%)</span>
            <button
              type="button"
              onClick={() => acceptField(chip.field)}
              className="ml-auto text-primary font-bold text-xs hover:underline"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => dismissField(chip.field)}
              className="text-on-surface-variant hover:text-error text-xs"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        ))}
        {chips.length > 1 && (
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={acceptAllFields}
              className="text-primary font-bold text-xs hover:underline"
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={dismissAllLow}
              className="text-on-surface-variant font-bold text-xs hover:underline"
            >
              Dismiss Low-Confidence
            </button>
          </div>
        )}
      </div>
    );
  }

  function getFieldHighlightClass(field: string): string {
    const level = highlightedFields.get(field);
    if (level === 'high') return 'ai-highlight';
    if (level === 'low') return 'ai-highlight-low';
    return '';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4" onClick={handleClose}>
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
                    <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5v5h-1v-5h1zM10 8v1H9V8h1zm8 6.5h-1V14h1v.5zm-1-2h-1V12h1v.5zm0-2h-1v-1h1v1zm0-2h-1V10h1v.5zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z" />
                  </svg>
                  <p className="text-on-surface-variant text-xs font-bold">PDF Receipt</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider mb-2">File Uploaded</p>
                <p className="text-on-surface font-semibold text-sm">{receiptFileName}</p>
                <div className="flex items-center justify-center gap-4 mt-4">
                  {extractionState === 'done' && (
                    <button
                      onClick={handleReExtract}
                      className="text-primary text-xs font-bold flex items-center justify-center gap-1 hover:underline"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                      </svg>
                      Re-extract
                    </button>
                  )}
                  <button
                    onClick={effectiveItemId ? handleDeleteReceipt : handleClearReceipt}
                    className="text-error text-xs font-bold flex items-center justify-center gap-1 hover:underline"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                    Remove
                  </button>
                </div>
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
            <div className="bg-[#fff9c4] text-[#827717] px-8 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />
                </svg>
                <span className="text-sm font-semibold">AI extracted — please review for accuracy</span>
              </div>
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
              <span className="text-sm font-semibold text-on-surface-variant">
                {extractionState === 'uploading' ? 'Uploading receipt...' : 'Analyzing receipt...'}
              </span>
            </div>
          )}

          {/* Form Content */}
          <div className="p-8 flex-1 overflow-y-auto space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-on-surface tracking-tight">
                  {isDraft ? 'Add Expense Item' : isEditing ? 'Edit Expense Item' : 'Add Expense Item'}
                </h2>
                <p className="text-on-surface-variant text-sm mt-1">
                  {hasExtraction ? 'Review the details extracted from your receipt.' : isEditing ? 'Update the details of this expense.' : 'Add a new expense line item.'}
                </p>
              </div>
              <button onClick={handleClose} className="text-on-surface-variant hover:text-error transition-colors">
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
                  className={`w-full bg-surface-container-low border-0 border-b-2 border-outline-variant px-0 py-2 text-on-surface font-semibold focus:ring-0 focus:border-primary focus:bg-surface-container-lowest transition-all ${getFieldHighlightClass('merchantName')}`}
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
                    className={`w-full bg-surface-container-low border-0 border-b-2 border-outline-variant px-0 py-2 text-on-surface font-semibold focus:ring-0 focus:border-primary focus:bg-surface-container-lowest tabular-nums transition-all ${getFieldHighlightClass('amount')}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => { setCurrency(e.target.value); clearHighlight('currency'); }}
                    className={`w-full bg-surface-container-low border-0 border-b-2 border-outline-variant px-0 py-2 text-on-surface font-semibold focus:ring-0 focus:border-primary focus:bg-surface-container-lowest transition-all ${getFieldHighlightClass('currency')}`}
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
                    onChange={(e) => { setCategory(e.target.value as Category); clearHighlight('category'); }}
                    className={`w-full bg-surface-container-low border-0 border-b-2 border-outline-variant px-0 py-2 text-on-surface font-semibold focus:ring-0 focus:border-primary focus:bg-surface-container-lowest transition-all ${getFieldHighlightClass('category')}`}
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
                    className={`w-full bg-surface-container-low border-0 border-b-2 border-outline-variant px-0 py-2 text-on-surface font-semibold focus:ring-0 focus:border-primary focus:bg-surface-container-lowest transition-all ${getFieldHighlightClass('transactionDate')}`}
                  />
                </div>
              </div>

              {/* AI Suggestion Chips */}
              {renderSuggestionChips()}
            </form>
          </div>

          {/* Footer */}
          <div className="p-8 bg-surface-container-low flex items-center justify-between flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="text-on-surface-variant font-bold text-sm hover:text-on-surface transition-colors"
            >
              Discard
            </button>
            <div className="flex gap-4">
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || extractionState === 'uploading' || extractionState === 'extracting'}
                className="px-6 py-2.5 rounded-lg font-bold text-sm bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg hover:scale-95 active:opacity-80 transition-transform disabled:opacity-60"
              >
                {loading ? 'Saving...' : isDraft ? 'Add Item' : item ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}