import api from './client';
import type { ExpenseItem, ReceiptUploadResponse } from '../types';

export async function uploadReceipt(
  reportId: string,
  itemId: string,
  file: File,
): Promise<ReceiptUploadResponse> {
  const formData = new FormData();
  formData.append('receipt', file);

  const { data } = await api.post<ReceiptUploadResponse>(
    `/api/reports/${reportId}/items/${itemId}/receipt`,
    formData,
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