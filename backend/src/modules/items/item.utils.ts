import { PrismaClient } from '@prisma/client';

export async function recomputeTotal(
  reportId: string,
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
) {
  const result = await tx.expenseItem.aggregate({
    where: { reportId },
    _sum: { amount: true },
  });

  await tx.expenseReport.update({
    where: { id: reportId },
    data: { totalAmount: result._sum.amount ?? 0 },
  });
}