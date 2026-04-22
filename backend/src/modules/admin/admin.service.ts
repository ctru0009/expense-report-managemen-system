import { Prisma, ReportStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../common/errors';
import { transition } from '../reports/report-state-machine';

const adminInclude = {
  user: { select: { id: true, email: true } },
  items: true,
};

export async function listAllReports(status?: ReportStatus, userId?: string) {
  const where: Prisma.ExpenseReportWhereInput = {};
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
  return prisma.$transaction(async (tx) => {
    const report = await tx.expenseReport.findUnique({
      where: { id: reportId },
      include: adminInclude,
    });
    if (!report) throw new NotFoundError('Report');

    const newStatus = transition(report.status, 'approve');

    return tx.expenseReport.update({
      where: { id: reportId },
      data: { status: newStatus },
      include: adminInclude,
    });
  });
}

export async function rejectReport(reportId: string) {
  return prisma.$transaction(async (tx) => {
    const report = await tx.expenseReport.findUnique({
      where: { id: reportId },
      include: adminInclude,
    });
    if (!report) throw new NotFoundError('Report');

    const newStatus = transition(report.status, 'reject');

    return tx.expenseReport.update({
      where: { id: reportId },
      data: { status: newStatus },
      include: adminInclude,
    });
  });
}