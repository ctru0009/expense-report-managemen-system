import { ReportStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../common/errors';
import { transition } from '../reports/report-state-machine';

const adminInclude = {
  user: { select: { id: true, email: true } },
  items: true,
};

export async function listAllReports(status?: ReportStatus, userId?: string) {
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;

  return prisma.expenseReport.findMany({
    where,
    include: adminInclude,
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getReportById(reportId: string) {
  const report = await prisma.expenseReport.findUnique({
    where: { id: reportId },
    include: adminInclude,
  });

  if (!report) {
    throw new NotFoundError('Report');
  }

  return report;
}

export async function approveReport(reportId: string) {
  const report = await getReportById(reportId);

  const newStatus = transition(report.status, 'approve');

  return prisma.expenseReport.update({
    where: { id: reportId },
    data: { status: newStatus },
    include: adminInclude,
  });
}

export async function rejectReport(reportId: string) {
  const report = await getReportById(reportId);

  const newStatus = transition(report.status, 'reject');

  return prisma.expenseReport.update({
    where: { id: reportId },
    data: { status: newStatus },
    include: adminInclude,
  });
}