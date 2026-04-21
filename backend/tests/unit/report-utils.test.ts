import { findOwnedReport } from '../../src/modules/reports/report.utils';
import { NotFoundError, ForbiddenError } from '../../src/common/errors';

const mockFindUnique = jest.fn();
const mockPrisma = {
  expenseReport: {
    findUnique: mockFindUnique,
  },
} as any;

const REPORT_ID = 'report-1';
const OWNER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';

describe('findOwnedReport', () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
  });

  it('returns report when user is the owner', async () => {
    const report = { id: REPORT_ID, userId: OWNER_ID, title: 'Test' };
    mockFindUnique.mockResolvedValue(report);

    const result = await findOwnedReport(mockPrisma, REPORT_ID, OWNER_ID);

    expect(result).toEqual(report);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: REPORT_ID },
      include: undefined,
    });
  });

  it('returns report with include param', async () => {
    const report = { id: REPORT_ID, userId: OWNER_ID, items: [] };
    mockFindUnique.mockResolvedValue(report);

    const result = await findOwnedReport(mockPrisma, REPORT_ID, OWNER_ID, { items: true });

    expect(result).toEqual(report);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: REPORT_ID },
      include: { items: true },
    });
  });

  it('throws NotFoundError when report does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const promise = findOwnedReport(mockPrisma, REPORT_ID, OWNER_ID);
    await expect(promise).rejects.toThrow(NotFoundError);
    await expect(promise).rejects.toThrow('Report not found');
  });

  it('throws ForbiddenError when user is not the owner', async () => {
    const report = { id: REPORT_ID, userId: OWNER_ID, title: 'Test' };
    mockFindUnique.mockResolvedValue(report);

    const promise = findOwnedReport(mockPrisma, REPORT_ID, OTHER_USER_ID);
    await expect(promise).rejects.toThrow(ForbiddenError);
    await expect(promise).rejects.toThrow('You do not have access to this report');
  });

  it('throws ForbiddenError even when report exists but belongs to another user', async () => {
    const report = { id: REPORT_ID, userId: 'different-user', title: 'Test' };
    mockFindUnique.mockResolvedValue(report);

    const promise = findOwnedReport(mockPrisma, REPORT_ID, OWNER_ID);
    await expect(promise).rejects.toThrow(ForbiddenError);
  });
});