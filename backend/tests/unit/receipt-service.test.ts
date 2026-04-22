import { uploadReceipt, extractReceipt, applyExtraction } from '../../src/modules/receipts/receipt.service';
import { ExtractionError, NotFoundError, StateTransitionError } from '../../src/common/errors';

jest.mock('../../src/config/prisma', () => ({
  prisma: {
    expenseItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    expenseReport: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn({
      expenseItem: {
        update: jest.fn().mockResolvedValue({ id: 'item-1', merchantName: 'Test', amount: 10, currency: 'USD', category: 'TRAVEL', transactionDate: new Date(), receiptUrl: '/uploads/test.png', reportId: 'report-1' }),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 10 } }),
      },
      expenseReport: {
        update: jest.fn(),
      },
    })),
  },
}));

jest.mock('../../src/modules/reports/report.utils', () => ({
  findOwnedReport: jest.fn().mockResolvedValue({ id: 'report-1', userId: 'user-1', status: 'DRAFT' }),
}));

jest.mock('../../src/modules/reports/report-state-machine', () => ({
  canEditItems: jest.fn().mockReturnValue(true),
}));

jest.mock('../../src/modules/items/item.utils', () => ({
  recomputeTotal: jest.fn(),
}));

jest.mock('../../src/modules/receipts/extraction.factory', () => ({
  getExtractionService: jest.fn(),
}));

jest.mock('../../src/config/env', () => ({
  config: {
    uploadDir: './uploads',
  },
}));

import { prisma } from '../../src/config/prisma';
import { findOwnedReport } from '../../src/modules/reports/report.utils';
import { canEditItems } from '../../src/modules/reports/report-state-machine';
import { getExtractionService } from '../../src/modules/receipts/extraction.factory';

const mockItem = {
  id: 'item-1',
  merchantName: 'Test',
  amount: 10,
  currency: 'USD',
  category: 'TRAVEL',
  transactionDate: new Date(),
  receiptUrl: '/uploads/test-file.png',
  reportId: 'report-1',
};

describe('uploadReceipt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (findOwnedReport as jest.Mock).mockResolvedValue({ id: 'report-1', userId: 'user-1', status: 'DRAFT' });
    (canEditItems as jest.Mock).mockReturnValue(true);
    (prisma.expenseItem.findUnique as jest.Mock).mockResolvedValue(mockItem);
    (prisma.expenseItem.update as jest.Mock).mockResolvedValue({ ...mockItem, receiptUrl: '/uploads/new-file.png' });
  });

  it('saves receiptUrl on item without running extraction', async () => {
    const mockFile = { path: '/tmp/uploads/12345-abc.png', mimetype: 'image/png' } as Express.Multer.File;
    const result = await uploadReceipt('report-1', 'item-1', 'user-1', mockFile);

    expect(result.receiptUrl).toBe('/uploads/12345-abc.png');
    expect(result.itemId).toBe('item-1');
    expect(prisma.expenseItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { receiptUrl: '/uploads/12345-abc.png' },
    });
    expect(getExtractionService).not.toHaveBeenCalled();
  });

  it('throws StateTransitionError when report status prevents editing', async () => {
    (canEditItems as jest.Mock).mockReturnValue(false);

    await expect(
      uploadReceipt('report-1', 'item-1', 'user-1', {} as Express.Multer.File),
    ).rejects.toThrow(StateTransitionError);
  });

  it('throws NotFoundError when item does not exist', async () => {
    (prisma.expenseItem.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      uploadReceipt('report-1', 'item-1', 'user-1', {} as Express.Multer.File),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('extractReceipt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (findOwnedReport as jest.Mock).mockResolvedValue({ id: 'report-1', userId: 'user-1', status: 'DRAFT' });
    (canEditItems as jest.Mock).mockReturnValue(true);
  });

  it('returns extracted data without writing to DB', async () => {
    (prisma.expenseItem.findUnique as jest.Mock).mockResolvedValue(mockItem);
    const mockExtract = jest.fn().mockResolvedValue({
      merchantName: { value: 'Test Merchant', confidence: 0.9 },
      amount: { value: 50.0, confidence: 0.85 },
    });
    (getExtractionService as jest.Mock).mockReturnValue({ extract: mockExtract });

    const fs = require('fs');
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    const result = await extractReceipt('report-1', 'item-1', 'user-1');

    expect(result.extracted.merchantName).toEqual({ value: 'Test Merchant', confidence: 0.9 });
    expect(result.extracted.amount).toEqual({ value: 50.0, confidence: 0.85 });
    expect(result.receiptUrl).toBe('/uploads/test-file.png');
    expect(prisma.expenseItem.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when item has no receipt', async () => {
    (prisma.expenseItem.findUnique as jest.Mock).mockResolvedValue({ ...mockItem, receiptUrl: null });

    await expect(extractReceipt('report-1', 'item-1', 'user-1')).rejects.toThrow(NotFoundError);
  });

  it('throws ExtractionError when extraction service fails', async () => {
    (prisma.expenseItem.findUnique as jest.Mock).mockResolvedValue(mockItem);
    const mockExtract = jest.fn().mockRejectedValue(new Error('API timeout'));
    (getExtractionService as jest.Mock).mockReturnValue({ extract: mockExtract });

    const fs = require('fs');
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    await expect(extractReceipt('report-1', 'item-1', 'user-1')).rejects.toThrow(ExtractionError);
  });
});

describe('applyExtraction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (findOwnedReport as jest.Mock).mockResolvedValue({ id: 'report-1', userId: 'user-1', status: 'DRAFT' });
    (canEditItems as jest.Mock).mockReturnValue(true);
    (prisma.expenseItem.findUnique as jest.Mock).mockResolvedValue(mockItem);
  });

  it('only updates accepted fields', async () => {
    const txUpdate = jest.fn().mockResolvedValue({ ...mockItem, merchantName: 'Marriott', amount: 452.12 });
    (prisma.$transaction as jest.Mock).mockImplementation((fn) =>
      fn({
        expenseItem: { update: txUpdate, aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 452.12 } }) },
        expenseReport: { update: jest.fn() },
      }),
    );

    await applyExtraction('report-1', 'item-1', 'user-1', {
      merchantName: 'Marriott',
      amount: 452.12,
    });

    expect(txUpdate).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { merchantName: 'Marriott', amount: 452.12 },
    });
  });

  it('returns item unchanged when no fields provided', async () => {
    const result = await applyExtraction('report-1', 'item-1', 'user-1', {});

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(result).toEqual(mockItem);
  });

  it('throws StateTransitionError when report status prevents editing', async () => {
    (canEditItems as jest.Mock).mockReturnValue(false);

    await expect(
      applyExtraction('report-1', 'item-1', 'user-1', { merchantName: 'Test' }),
    ).rejects.toThrow(StateTransitionError);
  });
});