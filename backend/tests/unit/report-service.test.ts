import { ReportStatus } from '@prisma/client';
import * as reportService from '../../src/modules/reports/report.service';
import * as reportUtils from '../../src/modules/reports/report.utils';
import { StateTransitionError, ValidationError, ForbiddenError, NotFoundError } from '../../src/common/errors';

jest.mock('../../src/modules/reports/report.utils');
jest.mock('../../src/config/prisma', () => ({
  prisma: {
    expenseReport: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    expenseItem: {
      count: jest.fn(),
    },
    $transaction: jest.fn((fn) => {
      const tx = {
        expenseReport: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        expenseItem: {
          count: jest.fn(),
        },
      };
      return fn(tx);
    }),
  },
}));

import { prisma } from '../../src/config/prisma';

const REPORT_ID = 'report-1';
const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';

function makeReport(overrides: Partial<{ id: string; userId: string; status: ReportStatus; title: string }> = {}) {
  return {
    id: REPORT_ID,
    userId: USER_ID,
    status: 'DRAFT' as ReportStatus,
    title: 'Test Report',
    totalAmount: 0,
    ...overrides,
  };
}

describe('ReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listByUser', () => {
    it('returns reports for user ordered by updatedAt desc', async () => {
      const reports = [makeReport({ title: 'A' }), makeReport({ title: 'B' })];
      (prisma.expenseReport.findMany as jest.Mock).mockResolvedValue(reports);

      const result = await reportService.listByUser(USER_ID);

      expect(result).toEqual(reports);
      expect(prisma.expenseReport.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('filters by status when provided', async () => {
      (prisma.expenseReport.findMany as jest.Mock).mockResolvedValue([]);

      await reportService.listByUser(USER_ID, 'DRAFT' as ReportStatus);

      expect(prisma.expenseReport.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, status: 'DRAFT' },
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('getById', () => {
    it('returns report with items included', async () => {
      const report = { ...makeReport(), items: [] };
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue(report);

      const result = await reportService.getById(REPORT_ID, USER_ID);

      expect(result).toEqual(report);
      expect(reportUtils.findOwnedReport).toHaveBeenCalledWith(prisma, REPORT_ID, USER_ID, { items: true });
    });

    it('throws NotFoundError for missing report', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockRejectedValue(new NotFoundError('Report'));

      const promise = reportService.getById('nonexistent', USER_ID);
      await expect(promise).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError for another user\'s report', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockRejectedValue(new ForbiddenError('You do not have access to this report'));

      const promise = reportService.getById(REPORT_ID, OTHER_USER_ID);
      await expect(promise).rejects.toThrow(ForbiddenError);
    });
  });

  describe('create', () => {
    it('creates a report with DRAFT status and zero totalAmount', async () => {
      const newReport = makeReport();
      (prisma.expenseReport.create as jest.Mock).mockResolvedValue(newReport);

      const result = await reportService.create(USER_ID, { title: 'Test Report' });

      expect(result).toEqual(newReport);
      expect(prisma.expenseReport.create).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          title: 'Test Report',
          description: undefined,
          status: ReportStatus.DRAFT,
          totalAmount: 0,
        },
      });
    });

    it('creates a report with description when provided', async () => {
      (prisma.expenseReport.create as jest.Mock).mockResolvedValue(makeReport());

      await reportService.create(USER_ID, { title: 'Test Report', description: 'Desc' });

      expect(prisma.expenseReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: 'Desc' }),
        }),
      );
    });
  });

  describe('update', () => {
    it('allows update when report is DRAFT', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue(makeReport({ status: 'DRAFT' }));
      (prisma.expenseReport.update as jest.Mock).mockResolvedValue({ ...makeReport(), title: 'New' });

      await reportService.update(REPORT_ID, USER_ID, { title: 'New' });

      expect(prisma.expenseReport.update).toHaveBeenCalled();
    });

    it('allows update when report is REJECTED', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue(makeReport({ status: 'REJECTED' }));
      (prisma.expenseReport.update as jest.Mock).mockResolvedValue({ ...makeReport(), title: 'New' });

      await reportService.update(REPORT_ID, USER_ID, { title: 'New' });

      expect(prisma.expenseReport.update).toHaveBeenCalled();
    });

    it('throws StateTransitionError when report is SUBMITTED', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue(makeReport({ status: 'SUBMITTED' }));

      const promise = reportService.update(REPORT_ID, USER_ID, { title: 'New' });
      await expect(promise).rejects.toThrow(StateTransitionError);
    });

    it('throws StateTransitionError when report is APPROVED', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue(makeReport({ status: 'APPROVED' }));

      const promise = reportService.update(REPORT_ID, USER_ID, { title: 'New' });
      await expect(promise).rejects.toThrow(StateTransitionError);
    });

    it('clears description when set to null', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue(makeReport({ status: 'DRAFT' }));
      (prisma.expenseReport.update as jest.Mock).mockResolvedValue(makeReport());

      await reportService.update(REPORT_ID, USER_ID, { description: null });

      expect(prisma.expenseReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('allows delete when report is DRAFT', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue(makeReport({ status: 'DRAFT' }));
      (prisma.expenseReport.delete as jest.Mock).mockResolvedValue(makeReport());

      await reportService.remove(REPORT_ID, USER_ID);

      expect(prisma.expenseReport.delete).toHaveBeenCalledWith({ where: { id: REPORT_ID } });
    });

    it('throws StateTransitionError when report is SUBMITTED', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue(makeReport({ status: 'SUBMITTED' }));

      const promise = reportService.remove(REPORT_ID, USER_ID);
      await expect(promise).rejects.toThrow(StateTransitionError);
    });

    it('throws StateTransitionError when report is APPROVED', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue(makeReport({ status: 'APPROVED' }));

      const promise = reportService.remove(REPORT_ID, USER_ID);
      await expect(promise).rejects.toThrow(StateTransitionError);
    });

    it('throws StateTransitionError when report is REJECTED', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue(makeReport({ status: 'REJECTED' }));

      const promise = reportService.remove(REPORT_ID, USER_ID);
      await expect(promise).rejects.toThrow(StateTransitionError);
    });

    it('throws ForbiddenError if user does not own report', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockRejectedValue(new ForbiddenError());

      const promise = reportService.remove(REPORT_ID, OTHER_USER_ID);
      await expect(promise).rejects.toThrow(ForbiddenError);
    });
  });

  describe('submit', () => {
    it('submits a DRAFT report with items', async () => {
      const mockReport = makeReport({ status: 'DRAFT' });
      const mockUpdated = { ...mockReport, status: 'SUBMITTED', items: [] };

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          expenseReport: {
            findUnique: jest.fn().mockResolvedValue(mockReport),
            update: jest.fn().mockResolvedValue(mockUpdated),
          },
          expenseItem: {
            count: jest.fn().mockResolvedValue(3),
          },
        };
        return fn(tx);
      });

      const result = await reportService.submit(REPORT_ID, USER_ID);

      expect(result.status).toBe('SUBMITTED');
    });

    it('throws ValidationError when report has no items', async () => {
      const mockReport = makeReport({ status: 'DRAFT' });

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          expenseReport: {
            findUnique: jest.fn().mockResolvedValue(mockReport),
            update: jest.fn(),
          },
          expenseItem: {
            count: jest.fn().mockResolvedValue(0),
          },
        };
        return fn(tx);
      });

      const promise = reportService.submit(REPORT_ID, USER_ID);
      await expect(promise).rejects.toThrow('Cannot submit an empty report');
    });

    it('throws NotFoundError when report does not exist', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          expenseReport: {
            findUnique: jest.fn().mockResolvedValue(null),
            update: jest.fn(),
          },
          expenseItem: {
            count: jest.fn(),
          },
        };
        return fn(tx);
      });

      const promise = reportService.submit(REPORT_ID, USER_ID);
      await expect(promise).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when user does not own report', async () => {
      const mockReport = makeReport({ status: 'DRAFT', userId: OTHER_USER_ID });

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          expenseReport: {
            findUnique: jest.fn().mockResolvedValue(mockReport),
            update: jest.fn(),
          },
          expenseItem: {
            count: jest.fn(),
          },
        };
        return fn(tx);
      });

      const promise = reportService.submit(REPORT_ID, USER_ID);
      await expect(promise).rejects.toThrow(ForbiddenError);
    });

    it('throws StateTransitionError when report is already SUBMITTED', async () => {
      const mockReport = makeReport({ status: 'SUBMITTED' });

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          expenseReport: {
            findUnique: jest.fn().mockResolvedValue(mockReport),
            update: jest.fn(),
          },
          expenseItem: {
            count: jest.fn(),
          },
        };
        return fn(tx);
      });

      const promise = reportService.submit(REPORT_ID, USER_ID);
      await expect(promise).rejects.toThrow(StateTransitionError);
    });

    it('throws StateTransitionError when report is APPROVED', async () => {
      const mockReport = makeReport({ status: 'APPROVED' });

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          expenseReport: {
            findUnique: jest.fn().mockResolvedValue(mockReport),
            update: jest.fn(),
          },
          expenseItem: {
            count: jest.fn(),
          },
        };
        return fn(tx);
      });

      const promise = reportService.submit(REPORT_ID, USER_ID);
      await expect(promise).rejects.toThrow(StateTransitionError);
    });
  });

  describe('reopen', () => {
    it('reopens a REJECTED report back to DRAFT', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue(makeReport({ status: 'REJECTED' }));
      (prisma.expenseReport.update as jest.Mock).mockResolvedValue({ ...makeReport(), status: 'DRAFT' });

      const result = await reportService.reopen(REPORT_ID, USER_ID);

      expect(result.status).toBe('DRAFT');
    });

    it('throws StateTransitionError when report is DRAFT', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue(makeReport({ status: 'DRAFT' }));

      const promise = reportService.reopen(REPORT_ID, USER_ID);
      await expect(promise).rejects.toThrow(StateTransitionError);
    });

    it('throws StateTransitionError when report is SUBMITTED', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue(makeReport({ status: 'SUBMITTED' }));

      const promise = reportService.reopen(REPORT_ID, USER_ID);
      await expect(promise).rejects.toThrow(StateTransitionError);
    });

    it('throws StateTransitionError when report is APPROVED', async () => {
      (reportUtils.findOwnedReport as jest.Mock).mockResolvedValue(makeReport({ status: 'APPROVED' }));

      const promise = reportService.reopen(REPORT_ID, USER_ID);
      await expect(promise).rejects.toThrow(StateTransitionError);
    });
  });
});