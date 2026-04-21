import api from './client';
import type { AdminExpenseReport, ReportStatus } from '../types';

export async function fetchAdminReports(status?: ReportStatus, userId?: string): Promise<AdminExpenseReport[]> {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  if (userId) params.userId = userId;
  const { data } = await api.get<AdminExpenseReport[]>('/api/admin/reports', { params });
  return data;
}

export async function getAdminReport(id: string): Promise<AdminExpenseReport> {
  const { data } = await api.get<AdminExpenseReport>(`/api/admin/reports/${id}`);
  return data;
}

export async function approveReport(id: string): Promise<AdminExpenseReport> {
  const { data } = await api.post<AdminExpenseReport>(`/api/admin/reports/${id}/approve`);
  return data;
}

export async function rejectReport(id: string): Promise<AdminExpenseReport> {
  const { data } = await api.post<AdminExpenseReport>(`/api/admin/reports/${id}/reject`);
  return data;
}