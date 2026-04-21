import { PrismaClient, Category } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotFoundError, ForbiddenError, StateTransitionError } from '../../common/errors';
import { canEditItems } from '../reports/report-state-machine';
import { findOwnedReport } from '../reports/report.utils';

export async function listByReport(reportId: string, userId: string) {
  await findOwnedReport(prisma, reportId, userId);

  return prisma.expenseItem.findMany({
    where: { reportId },
    orderBy: [
      { transactionDate: 'asc' },
      { createdAt: 'asc' },
    ],
  });
}

export async function create(reportId: string, userId: string, data: {
  amount: number;
  currency?: string;
  category: Category;
  merchantName: string;
  transactionDate: Date;
  receiptUrl?: string;
}) {
  const report = await findOwnedReport(prisma, reportId, userId);

  if (!canEditItems(report.status)) {
    throw new StateTransitionError('Cannot add items to a report in this status');
  }

  return prisma.$transaction(async (tx) => {
    const item = await tx.expenseItem.create({
      data: {
        reportId,
        amount: data.amount,
        currency: data.currency || 'USD',
        category: data.category,
        merchantName: data.merchantName,
        transactionDate: data.transactionDate,
        receiptUrl: data.receiptUrl,
      },
    });

    await recomputeTotal(reportId, tx);

    return item;
  });
}

export async function update(itemId: string, reportId: string, userId: string, data: {
  amount?: number;
  currency?: string;
  category?: Category;
  merchantName?: string;
  transactionDate?: Date;
  receiptUrl?: string | null;
}) {
  const report = await findOwnedReport(prisma, reportId, userId);

  if (!canEditItems(report.status)) {
    throw new StateTransitionError('Cannot edit items in a report in this status');
  }

  return prisma.$transaction(async (tx) => {
    const existingItem = await tx.expenseItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem || existingItem.reportId !== reportId) {
      throw new NotFoundError('Item');
    }

    const item = await tx.expenseItem.update({
      where: { id: itemId },
      data: {
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.currency && { currency: data.currency }),
        ...(data.category && { category: data.category }),
        ...(data.merchantName && { merchantName: data.merchantName }),
        ...(data.transactionDate && { transactionDate: data.transactionDate }),
        ...(data.receiptUrl !== undefined && { receiptUrl: data.receiptUrl }),
      },
    });

    await recomputeTotal(reportId, tx);

    return item;
  });
}

export async function remove(itemId: string, reportId: string, userId: string) {
  const report = await findOwnedReport(prisma, reportId, userId);

  if (!canEditItems(report.status)) {
    throw new StateTransitionError('Cannot delete items from a report in this status');
  }

  await prisma.$transaction(async (tx) => {
    const existingItem = await tx.expenseItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem || existingItem.reportId !== reportId) {
      throw new NotFoundError('Item');
    }

    await tx.expenseItem.delete({
      where: { id: itemId },
    });

    await recomputeTotal(reportId, tx);
  });
}

async function recomputeTotal(reportId: string, tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) {
  const result = await tx.expenseItem.aggregate({
    where: { reportId },
    _sum: { amount: true },
  });

  await tx.expenseReport.update({
    where: { id: reportId },
    data: { totalAmount: result._sum.amount ?? 0 },
  });
}