import api from './client';
import type { ExpenseItem, UploadReceiptResponse, ExtractionResponse, ApplyExtractionRequest } from '../types';

export async function uploadReceipt(
  reportId: string,
  itemId: string,
  file: File,
): Promise<UploadReceiptResponse> {
  const formData = new FormData();
  formData.append('receipt', file);

  const { data } = await api.post<UploadReceiptResponse>(
    `/api/reports/${reportId}/items/${itemId}/receipt`,
    formData,
  );
  return data;
}

export async function extractReceipt(
  reportId: string,
  itemId: string,
): Promise<ExtractionResponse> {
  const { data } = await api.post<ExtractionResponse>(
    `/api/reports/${reportId}/items/${itemId}/receipt/extract`,
  );
  return data;
}

export async function applyExtraction(
  reportId: string,
  itemId: string,
  fields: ApplyExtractionRequest,
): Promise<ExpenseItem> {
  const { data } = await api.post<ExpenseItem>(
    `/api/reports/${reportId}/items/${itemId}/receipt/apply`,
    fields,
  );
  return data;
}

export async function deleteReceipt(
  reportId: string,
  itemId: string,
): Promise<ExpenseItem> {
  const { data } = await api.delete<ExpenseItem>(
    `/api/reports/${reportId}/items/${itemId}/receipt`,
  );
  return data;
}