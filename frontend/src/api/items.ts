import api from './client';
import type { ExpenseItem, CreateItemRequest, UpdateItemRequest } from '../types';

export async function fetchItems(reportId: string): Promise<ExpenseItem[]> {
  const { data } = await api.get<ExpenseItem[]>(`/api/reports/${reportId}/items`);
  return data;
}

export async function createItem(reportId: string, payload: CreateItemRequest): Promise<ExpenseItem> {
  const { data } = await api.post<ExpenseItem>(`/api/reports/${reportId}/items`, payload);
  return data;
}

export async function updateItem(reportId: string, itemId: string, payload: UpdateItemRequest): Promise<ExpenseItem> {
  const { data } = await api.put<ExpenseItem>(`/api/reports/${reportId}/items/${itemId}`, payload);
  return data;
}

export async function deleteItem(reportId: string, itemId: string): Promise<void> {
  await api.delete(`/api/reports/${reportId}/items/${itemId}`);
}
