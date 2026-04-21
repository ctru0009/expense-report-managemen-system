import { ReportStatus } from '@prisma/client';

const VALID_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  DRAFT: ['SUBMITTED', 'DRAFT'],
  SUBMITTED: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: ['DRAFT'],
};

export function transition(current: ReportStatus, action: string): ReportStatus {
  const actionMap: Record<string, ReportStatus> = {
    submit: 'SUBMITTED',
    approve: 'APPROVED',
    reject: 'REJECTED',
    reopen: 'DRAFT',
    edit: 'DRAFT',
  };

  const target = actionMap[action];
  if (!target) {
    throw new Error(`Unknown action: ${action}`);
  }

  if (!VALID_TRANSITIONS[current].includes(target)) {
    throw new Error(`Cannot ${action} a report in ${current} status`);
  }

  return target;
}

export function canEditItems(status: ReportStatus): boolean {
  return status === 'DRAFT';
}

export function canDelete(status: ReportStatus): boolean {
  return status === 'DRAFT';
}
