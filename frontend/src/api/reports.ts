import api from './client';
import type { ExpenseReport, ReportStatus, CreateReportRequest, UpdateReportRequest } from '../types';

export async function fetchReports(status?: ReportStatus): Promise<ExpenseReport[]> {
  const params = status ? { status } : {};
  const { data } = await api.get<ExpenseReport[]>('/api/reports', { params });
  return data;
}

export async function getReport(id: string): Promise<ExpenseReport> {
  const { data } = await api.get<ExpenseReport>(`/api/reports/${id}`);
  return data;
}

export async function createReport(payload: CreateReportRequest): Promise<ExpenseReport> {
  const { data } = await api.post<ExpenseReport>('/api/reports', payload);
  return data;
}

export async function updateReport(id: string, payload: UpdateReportRequest): Promise<ExpenseReport> {
  const { data } = await api.put<ExpenseReport>(`/api/reports/${id}`, payload);
  return data;
}

export async function deleteReport(id: string): Promise<void> {
  await api.delete(`/api/reports/${id}`);
}

export async function submitReport(id: string): Promise<ExpenseReport> {
  const { data } = await api.post<ExpenseReport>(`/api/reports/${id}/submit`);
  return data;
}

export async function reopenReport(id: string): Promise<ExpenseReport> {
  const { data } = await api.post<ExpenseReport>(`/api/reports/${id}/reopen`);
  return data;
}
