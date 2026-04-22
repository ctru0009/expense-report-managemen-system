import path from 'path';
import fs from 'fs';
import { prisma } from '../../config/prisma';
import { NotFoundError, ForbiddenError, StateTransitionError, ExtractionError } from '../../common/errors';
import { findOwnedReport } from '../reports/report.utils';
import { canEditItems } from '../reports/report-state-machine';
import { recomputeTotal } from '../items/item.utils';
import { getExtractionService } from './extraction.factory';
import type { ExtractedData, ExtractionResponse } from './extraction.interface';
import { config } from '../../config/env';

export async function getReceiptFilePath(
  reportId: string,
  itemId: string,
  userId: string,
  userRole: string,
): Promise<string> {
  const report = await prisma.expenseReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new NotFoundError('Report');
  }

  if (report.userId !== userId && userRole !== 'ADMIN') {
    throw new ForbiddenError('You do not have access to this report');
  }

  const item = await prisma.expenseItem.findUnique({
    where: { id: itemId },
  });

  if (!item || item.reportId !== reportId) {
    throw new NotFoundError('Item');
  }

  if (!item.receiptUrl) {
    throw new NotFoundError('Receipt');
  }

  const filename = item.receiptUrl.replace('/uploads/', '');
  const filePath = path.join(config.uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new NotFoundError('Receipt file');
  }

  return filePath;
}

export async function uploadReceipt(
  reportId: string,
  itemId: string,
  userId: string,
  file: Express.Multer.File,
): Promise<{ receiptUrl: string; itemId: string }> {
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

  await prisma.expenseItem.update({
    where: { id: itemId },
    data: { receiptUrl },
  });

  return { receiptUrl, itemId };
}

export async function extractReceipt(
  reportId: string,
  itemId: string,
  userId: string,
): Promise<ExtractionResponse> {
  const report = await findOwnedReport(prisma, reportId, userId);

  if (!canEditItems(report.status)) {
    throw new StateTransitionError('Cannot extract from a report in this status');
  }

  const item = await prisma.expenseItem.findUnique({
    where: { id: itemId },
  });

  if (!item || item.reportId !== reportId) {
    throw new NotFoundError('Item');
  }

  if (!item.receiptUrl) {
    throw new NotFoundError('Receipt');
  }

  const filename = item.receiptUrl.replace('/uploads/', '');
  const filePath = path.join(config.uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new NotFoundError('Receipt file');
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };
  const mimeType = mimeMap[ext] || 'application/octet-stream';

  const extractionService = getExtractionService();

  try {
    const extracted = await extractionService.extract(filePath, mimeType);
    return {
      extracted,
      receiptUrl: item.receiptUrl,
    };
  } catch (err: unknown) {
    if (err instanceof ExtractionError) throw err;
    const message = err instanceof Error ? err.message : 'Unknown extraction error';
    throw new ExtractionError(message);
  }
}

export async function applyExtraction(
  reportId: string,
  itemId: string,
  userId: string,
  acceptedFields: {
    merchantName?: string;
    amount?: number;
    currency?: string;
    category?: string;
    transactionDate?: string;
  },
): Promise<Record<string, unknown>> {
  const report = await findOwnedReport(prisma, reportId, userId);

  if (!canEditItems(report.status)) {
    throw new StateTransitionError('Cannot modify items in a report in this status');
  }

  const item = await prisma.expenseItem.findUnique({
    where: { id: itemId },
  });

  if (!item || item.reportId !== reportId) {
    throw new NotFoundError('Item');
  }

  const updateData: Record<string, unknown> = {};

  if (acceptedFields.merchantName) updateData.merchantName = acceptedFields.merchantName;
  if (acceptedFields.amount !== undefined) updateData.amount = acceptedFields.amount;
  if (acceptedFields.currency) updateData.currency = acceptedFields.currency;
  if (acceptedFields.category) updateData.category = acceptedFields.category;
  if (acceptedFields.transactionDate) {
    updateData.transactionDate = new Date(acceptedFields.transactionDate);
  }

  if (Object.keys(updateData).length === 0) {
    return item as unknown as Record<string, unknown>;
  }

  const updatedItem = await prisma.$transaction(async (tx) => {
    const updated = await tx.expenseItem.update({
      where: { id: itemId },
      data: updateData,
    });
    await recomputeTotal(reportId, tx);
    return updated;
  });

  return updatedItem as unknown as Record<string, unknown>;
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

  if (item.receiptUrl) {
    const filename = item.receiptUrl.replace('/uploads/', '');
    const filePath = path.join(config.uploadDir, filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // non-fatal — file cleanup failure should not block the operation
    }
  }

  const updatedItem = await prisma.expenseItem.update({
    where: { id: itemId },
    data: { receiptUrl: null },
  });

  return updatedItem as unknown as Record<string, unknown>;
}