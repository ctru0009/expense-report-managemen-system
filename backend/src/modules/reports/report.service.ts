import { ReportStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotFoundError, ForbiddenError, StateTransitionError, ValidationError } from '../../common/errors';
import { transition, canDelete, canEditMetadata } from './report-state-machine';
import { findOwnedReport } from './report.utils';

export async function listByUser(userId: string, status?: ReportStatus) {
  const where = status ? { userId, status } : { userId };

  return prisma.expenseReport.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getById(reportId: string, userId: string) {
  return findOwnedReport(prisma, reportId, userId, { items: true });
}

export async function create(userId: string, data: { title: string; description?: string }) {
  return prisma.expenseReport.create({
    data: {
      userId,
      title: data.title,
      description: data.description,
      status: ReportStatus.DRAFT,
      totalAmount: 0,
    },
  });
}

export async function update(reportId: string, userId: string, data: { title?: string; description?: string | null }) {
  const report = await findOwnedReport(prisma, reportId, userId);

  if (!canEditMetadata(report.status)) {
    throw new StateTransitionError('Cannot edit report in this status');
  }

  return prisma.expenseReport.update({
    where: { id: reportId },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
    },
  });
}

export async function remove(reportId: string, userId: string) {
  const report = await findOwnedReport(prisma, reportId, userId);

  if (!canDelete(report.status)) {
    throw new StateTransitionError('Cannot delete report in this status');
  }

  await prisma.expenseReport.delete({
    where: { id: reportId },
  });
}

export async function submit(reportId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const report = await tx.expenseReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundError('Report');
    }

    if (report.userId !== userId) {
      throw new ForbiddenError('You do not have access to this report');
    }

    const newStatus = transition(report.status, 'submit');

    const itemCount = await tx.expenseItem.count({
      where: { reportId },
    });

    if (itemCount === 0) {
      throw new ValidationError('Cannot submit an empty report. Add at least one expense item.');
    }

    return tx.expenseReport.update({
      where: { id: reportId },
      data: { status: newStatus },
      include: { items: true },
    });
  });
}

export async function reopen(reportId: string, userId: string) {
  const report = await findOwnedReport(prisma, reportId, userId);

  const newStatus = transition(report.status, 'reopen');

  return prisma.expenseReport.update({
    where: { id: reportId },
    data: { status: newStatus },
    include: { items: true },
  });
}