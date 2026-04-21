import { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../common/errors';

export async function findOwnedReport(
  prisma: PrismaClient,
  reportId: string,
  userId: string,
  include?: object,
) {
  const report = await prisma.expenseReport.findUnique({
    where: { id: reportId },
    include,
  });

  if (!report) {
    throw new NotFoundError('Report');
  }

  if (report.userId !== userId) {
    throw new ForbiddenError('You do not have access to this report');
  }

  return report;
}