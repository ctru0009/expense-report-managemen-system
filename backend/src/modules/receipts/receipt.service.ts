import path from 'path';
import { prisma } from '../../config/prisma';
import { NotFoundError, StateTransitionError } from '../../common/errors';
import { findOwnedReport } from '../reports/report.utils';
import { canEditItems } from '../reports/report-state-machine';
import { recomputeTotal } from '../items/item.utils';
import { getExtractionService } from './extraction.factory';
import type { ExtractedData } from './extraction.interface';

export async function uploadReceipt(
  reportId: string,
  itemId: string,
  userId: string,
  file: Express.Multer.File,
): Promise<{ item: Record<string, unknown>; extracted: ExtractedData }> {
  const report = await findOwnedReport(prisma, reportId, userId);

  if (!canEditItems(report.status)) {
    throw new StateTransitionError('Cannot upload receipts to a report in this status');
  }

  const item = await prisma.expenseItem.findUnique({
    where: { id: itemId },
  });

  if (!item || item.reportId !== reportId) {
    throw new NotFoundError('Item');
  }

  const relativePath = path.basename(file.path);
  const receiptUrl = `/uploads/${relativePath}`;

  const extractionService = getExtractionService();
  let extracted: ExtractedData = {};

  try {
    extracted = await extractionService.extract(file.path, file.mimetype);
  } catch (err) {
    console.error('Receipt extraction failed:', err);
  }

  const itemUpdateData: Record<string, unknown> = { receiptUrl };

  if (extracted.merchantName) itemUpdateData.merchantName = extracted.merchantName;
  if (extracted.amount !== undefined) itemUpdateData.amount = extracted.amount;
  if (extracted.currency) itemUpdateData.currency = extracted.currency;
  if (extracted.transactionDate) itemUpdateData.transactionDate = new Date(extracted.transactionDate);

  const updatedItem = await prisma.$transaction(async (tx) => {
    const updated = await tx.expenseItem.update({
      where: { id: itemId },
      data: itemUpdateData,
    });
    await recomputeTotal(reportId, tx);
    return updated;
  });

  return {
    item: updatedItem as unknown as Record<string, unknown>,
    extracted,
  };
}

export async function deleteReceipt(
  reportId: string,
  itemId: string,
  userId: string,
): Promise<Record<string, unknown>> {
  const report = await findOwnedReport(prisma, reportId, userId);

  if (!canEditItems(report.status)) {
    throw new StateTransitionError('Cannot remove receipts from a report in this status');
  }

  const item = await prisma.expenseItem.findUnique({
    where: { id: itemId },
  });

  if (!item || item.reportId !== reportId) {
    throw new NotFoundError('Item');
  }

  const updatedItem = await prisma.expenseItem.update({
    where: { id: itemId },
    data: { receiptUrl: null },
  });

  return updatedItem as unknown as Record<string, unknown>;
}