import { ReportStatus } from '@prisma/client';
import * as itemService from '../../src/modules/items/item.service';
import * as reportUtils from '../../src/modules/reports/report.utils';
import { recomputeTotal } from '../../src/modules/items/item.utils';
import { StateTransitionError, NotFoundError, ForbiddenError } from '../../src/common/errors';

jest.mock('../../src/modules/reports/report.utils');
jest.mock('../../src/modules/items/item.utils');
jest.mock('../../src/config/prisma', () => ({
  prisma: {
    expenseItem: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { prisma } from '../../src/config/prisma';

const REPORT_ID = 'report-1';
const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';
const ITEM_ID = 'item-1';
const OTHER_REPORT_ID = 'report-2';

const ITEM_DATA = {
  amount: 50,
  category: 'MEALS' as any,
  merchantName: 'Test Merchant',
  transactionDate: new Date(),
};

const STATUSES_ALLOWING_EDITS: ReportStatus[] = ['DRAFT', 'REJECTED'];
const STATUSES_BLOCKING_EDITS: ReportStatus[] = ['SUBMITTED', 'APPROVED'];

describe('ItemService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listByReport', () => {
    it('returns items ordered by transactionDate then createdAt', async () => {
      const items = [{ id: ITEM_ID, reportId: REPORT_ID }];
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue({ id: REPORT_ID, userId: USER_ID });
      (prisma.expenseItem.findMany as jest.Mock).mockResolvedValue(items);

      const result = await itemService.listByReport(REPORT_ID, USER_ID);

      expect(result).toEqual(items);
      expect(prisma.expenseItem.findMany).toHaveBeenCalledWith({
        where: { reportId: REPORT_ID },
        orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
      });
    });

    it('throws ForbiddenError if user does not own the report', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockRejectedValue(new ForbiddenError());

      const promise = itemService.listByReport(REPORT_ID, OTHER_USER_ID);
      await expect(promise).rejects.toThrow(ForbiddenError);
    });
  });

  describe('create', () => {
    it.each(STATUSES_ALLOWING_EDITS)('allows create when report is %s', async (status) => {
      const createdItem = { id: ITEM_ID, ...ITEM_DATA, reportId: REPORT_ID, currency: 'USD' };
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue({ id: REPORT_ID, userId: USER_ID, status });
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
        const tx = {
          expenseItem: { create: jest.fn().mockResolvedValue(createdItem) },
        };
        return cb(tx);
      });
      (recomputeTotal as jest.Mock).mockResolvedValue(undefined);

      const result = await itemService.create(REPORT_ID, USER_ID, ITEM_DATA);

      expect(result).toEqual(createdItem);
    });

    it.each(STATUSES_BLOCKING_EDITS)('throws StateTransitionError when report is %s', async (status) => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue({ id: REPORT_ID, userId: USER_ID, status });

      const promise = itemService.create(REPORT_ID, USER_ID, ITEM_DATA);
      await expect(promise).rejects.toThrow(StateTransitionError);
      await expect(promise).rejects.toThrow('Cannot add items to a report in this status');
    });

    it('calls recomputeTotal after creating item', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue({ id: REPORT_ID, userId: USER_ID, status: 'DRAFT' });
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
        const tx = {
          expenseItem: { create: jest.fn().mockResolvedValue({ id: ITEM_ID }) },
        };
        return cb(tx);
      });
      (recomputeTotal as jest.Mock).mockResolvedValue(undefined);

      await itemService.create(REPORT_ID, USER_ID, ITEM_DATA);

      expect(recomputeTotal).toHaveBeenCalledWith(REPORT_ID, expect.anything());
    });

    it('defaults currency to USD when not provided', async () => {
      const { currency: _, ...dataWithoutCurrency } = { ...ITEM_DATA, currency: 'EUR' };

      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue({ id: REPORT_ID, userId: USER_ID, status: 'DRAFT' });
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
        const tx = {
          expenseItem: { create: jest.fn().mockImplementation((args: any) => args) },
        };
        return cb(tx);
      });
      (recomputeTotal as jest.Mock).mockResolvedValue(undefined);

      await itemService.create(REPORT_ID, USER_ID, dataWithoutCurrency as any);

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it.each(STATUSES_ALLOWING_EDITS)('allows update when report is %s', async (status) => {
      const existingItem = { id: ITEM_ID, reportId: REPORT_ID, amount: 50 };
      const updatedItem = { ...existingItem, amount: 100 };
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue({ id: REPORT_ID, userId: USER_ID, status });
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
        const tx = {
          expenseItem: {
            findUnique: jest.fn().mockResolvedValue(existingItem),
            update: jest.fn().mockResolvedValue(updatedItem),
          },
        };
        return cb(tx);
      });
      (recomputeTotal as jest.Mock).mockResolvedValue(undefined);

      const result = await itemService.update(ITEM_ID, REPORT_ID, USER_ID, { amount: 100 });

      expect(result.amount).toBe(100);
    });

    it.each(STATUSES_BLOCKING_EDITS)('throws StateTransitionError when report is %s', async (status) => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue({ id: REPORT_ID, userId: USER_ID, status });

      const promise = itemService.update(ITEM_ID, REPORT_ID, USER_ID, { amount: 100 });
      await expect(promise).rejects.toThrow(StateTransitionError);
    });

    it('calls recomputeTotal after updating item', async () => {
      const existingItem = { id: ITEM_ID, reportId: REPORT_ID, amount: 50 };
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue({ id: REPORT_ID, userId: USER_ID, status: 'DRAFT' });
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
        const tx = {
          expenseItem: {
            findUnique: jest.fn().mockResolvedValue(existingItem),
            update: jest.fn().mockResolvedValue({ ...existingItem, amount: 100 }),
          },
        };
        return cb(tx);
      });
      (recomputeTotal as jest.Mock).mockResolvedValue(undefined);

      await itemService.update(ITEM_ID, REPORT_ID, USER_ID, { amount: 100 });

      expect(recomputeTotal).toHaveBeenCalledWith(REPORT_ID, expect.anything());
    });

    it('throws NotFoundError when item does not exist', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue({ id: REPORT_ID, userId: USER_ID, status: 'DRAFT' });
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
        const tx = {
          expenseItem: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return cb(tx);
      });

      const promise = itemService.update(ITEM_ID, REPORT_ID, USER_ID, { amount: 100 });
      await expect(promise).rejects.toThrow(NotFoundError);
      await expect(promise).rejects.toThrow('Item not found');
    });

    it('throws NotFoundError when item belongs to a different report', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue({ id: REPORT_ID, userId: USER_ID, status: 'DRAFT' });
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
        const tx = {
          expenseItem: {
            findUnique: jest.fn().mockResolvedValue({ id: ITEM_ID, reportId: OTHER_REPORT_ID }),
          },
        };
        return cb(tx);
      });

      const promise = itemService.update(ITEM_ID, REPORT_ID, USER_ID, { amount: 100 });
      await expect(promise).rejects.toThrow(NotFoundError);
    });
  });

  describe('remove', () => {
    it.each(STATUSES_ALLOWING_EDITS)('allows delete when report is %s', async (status) => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue({ id: REPORT_ID, userId: USER_ID, status });
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
        const tx = {
          expenseItem: {
            findUnique: jest.fn().mockResolvedValue({ id: ITEM_ID, reportId: REPORT_ID }),
            delete: jest.fn().mockResolvedValue({}),
          },
        };
        return cb(tx);
      });
      (recomputeTotal as jest.Mock).mockResolvedValue(undefined);

      await itemService.remove(ITEM_ID, REPORT_ID, USER_ID);
    });

    it.each(STATUSES_BLOCKING_EDITS)('throws StateTransitionError when report is %s', async (status) => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue({ id: REPORT_ID, userId: USER_ID, status });

      const promise = itemService.remove(ITEM_ID, REPORT_ID, USER_ID);
      await expect(promise).rejects.toThrow(StateTransitionError);
    });

    it('calls recomputeTotal after deleting item', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue({ id: REPORT_ID, userId: USER_ID, status: 'DRAFT' });
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
        const tx = {
          expenseItem: {
            findUnique: jest.fn().mockResolvedValue({ id: ITEM_ID, reportId: REPORT_ID }),
            delete: jest.fn().mockResolvedValue({}),
          },
        };
        return cb(tx);
      });
      (recomputeTotal as jest.Mock).mockResolvedValue(undefined);

      await itemService.remove(ITEM_ID, REPORT_ID, USER_ID);

      expect(recomputeTotal).toHaveBeenCalledWith(REPORT_ID, expect.anything());
    });

    it('throws NotFoundError when item does not exist', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue({ id: REPORT_ID, userId: USER_ID, status: 'DRAFT' });
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
        const tx = {
          expenseItem: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return cb(tx);
      });

      const promise = itemService.remove(ITEM_ID, REPORT_ID, USER_ID);
      await expect(promise).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when item belongs to a different report', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue({ id: REPORT_ID, userId: USER_ID, status: 'DRAFT' });
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
        const tx = {
          expenseItem: {
            findUnique: jest.fn().mockResolvedValue({ id: ITEM_ID, reportId: OTHER_REPORT_ID }),
          },
        };
        return cb(tx);
      });

      const promise = itemService.remove(ITEM_ID, REPORT_ID, USER_ID);
      await expect(promise).rejects.toThrow(NotFoundError);
    });
  });
});