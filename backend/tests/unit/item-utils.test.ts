import { recomputeTotal } from '../../src/modules/items/item.utils';

describe('recomputeTotal', () => {
  const REPORT_ID = 'report-1';

  function createMockTx(aggregateResult: { _sum: { amount: number | null } }) {
    return {
      expenseItem: {
        aggregate: jest.fn().mockResolvedValue(aggregateResult),
      },
      expenseReport: {
        update: jest.fn().mockResolvedValue({}),
      },
    } as any;
  }

  it('sets totalAmount to aggregated sum of item amounts', async () => {
    const tx = createMockTx({ _sum: { amount: 15000 } });

    await recomputeTotal(REPORT_ID, tx);

    expect(tx.expenseItem.aggregate).toHaveBeenCalledWith({
      where: { reportId: REPORT_ID },
      _sum: { amount: true },
    });
    expect(tx.expenseReport.update).toHaveBeenCalledWith({
      where: { id: REPORT_ID },
      data: { totalAmount: 15000 },
    });
  });

  it('sets totalAmount to 0 when report has no items (null aggregate)', async () => {
    const tx = createMockTx({ _sum: { amount: null } });

    await recomputeTotal(REPORT_ID, tx);

    expect(tx.expenseReport.update).toHaveBeenCalledWith({
      where: { id: REPORT_ID },
      data: { totalAmount: 0 },
    });
  });
});