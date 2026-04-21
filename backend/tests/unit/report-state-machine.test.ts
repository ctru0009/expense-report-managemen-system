import { ReportStatus } from '@prisma/client';
import { transition, canEditItems, canEditMetadata, canDelete } from '../../src/modules/reports/report-state-machine';
import { StateTransitionError, ValidationError } from '../../src/common/errors';

describe('ReportStateMachine', () => {
  describe('valid transitions', () => {
    it('DRAFT → SUBMITTED via submit', () => {
      expect(transition('DRAFT', 'submit')).toBe('SUBMITTED');
    });

    it('SUBMITTED → APPROVED via approve', () => {
      expect(transition('SUBMITTED', 'approve')).toBe('APPROVED');
    });

    it('SUBMITTED → REJECTED via reject', () => {
      expect(transition('SUBMITTED', 'reject')).toBe('REJECTED');
    });

    it('REJECTED → DRAFT via reopen', () => {
      expect(transition('REJECTED', 'reopen')).toBe('DRAFT');
    });
  });

  describe('invalid transitions', () => {
    it('DRAFT → APPROVED is invalid', () => {
      expect(() => transition('DRAFT', 'approve')).toThrow(StateTransitionError);
      expect(() => transition('DRAFT', 'approve')).toThrow(
        'Cannot approve a report in DRAFT status',
      );
    });

    it('DRAFT → REJECTED is invalid', () => {
      expect(() => transition('DRAFT', 'reject')).toThrow(StateTransitionError);
      expect(() => transition('DRAFT', 'reject')).toThrow(
        'Cannot reject a report in DRAFT status',
      );
    });

    it('SUBMITTED → DRAFT via reopen is invalid', () => {
      expect(() => transition('SUBMITTED', 'reopen')).toThrow(StateTransitionError);
      expect(() => transition('SUBMITTED', 'reopen')).toThrow(
        'Cannot reopen a report in SUBMITTED status',
      );
    });

    it('SUBMITTED → SUBMITTED is invalid', () => {
      expect(() => transition('SUBMITTED', 'submit')).toThrow(StateTransitionError);
      expect(() => transition('SUBMITTED', 'submit')).toThrow(
        'Cannot submit a report in SUBMITTED status',
      );
    });

    it('APPROVED → DRAFT is invalid', () => {
      expect(() => transition('APPROVED', 'reopen')).toThrow(StateTransitionError);
      expect(() => transition('APPROVED', 'reopen')).toThrow(
        'Cannot reopen a report in APPROVED status',
      );
    });

    it('APPROVED → SUBMITTED is invalid', () => {
      expect(() => transition('APPROVED', 'submit')).toThrow(StateTransitionError);
      expect(() => transition('APPROVED', 'submit')).toThrow(
        'Cannot submit a report in APPROVED status',
      );
    });

    it('APPROVED → REJECTED is invalid', () => {
      expect(() => transition('APPROVED', 'reject')).toThrow(StateTransitionError);
      expect(() => transition('APPROVED', 'reject')).toThrow(
        'Cannot reject a report in APPROVED status',
      );
    });

    it('APPROVED → APPROVED is invalid', () => {
      expect(() => transition('APPROVED', 'approve')).toThrow(StateTransitionError);
      expect(() => transition('APPROVED', 'approve')).toThrow(
        'Cannot approve a report in APPROVED status',
      );
    });

    it('REJECTED → SUBMITTED is invalid', () => {
      expect(() => transition('REJECTED', 'submit')).toThrow(StateTransitionError);
      expect(() => transition('REJECTED', 'submit')).toThrow(
        'Cannot submit a report in REJECTED status',
      );
    });

    it('REJECTED → APPROVED is invalid', () => {
      expect(() => transition('REJECTED', 'approve')).toThrow(StateTransitionError);
      expect(() => transition('REJECTED', 'approve')).toThrow(
        'Cannot approve a report in REJECTED status',
      );
    });

    it('REJECTED → REJECTED is invalid', () => {
      expect(() => transition('REJECTED', 'reject')).toThrow(StateTransitionError);
      expect(() => transition('REJECTED', 'reject')).toThrow(
        'Cannot reject a report in REJECTED status',
      );
    });

    it('unknown action throws ValidationError', () => {
      expect(() => transition('DRAFT', 'unknown')).toThrow(ValidationError);
      expect(() => transition('DRAFT', 'unknown')).toThrow('Unknown action: unknown');
    });
  });

  describe('canEditItems', () => {
    it('returns true for DRAFT', () => {
      expect(canEditItems('DRAFT')).toBe(true);
    });

    it('returns false for SUBMITTED', () => {
      expect(canEditItems('SUBMITTED')).toBe(false);
    });

    it('returns false for APPROVED', () => {
      expect(canEditItems('APPROVED')).toBe(false);
    });

    it('returns false for REJECTED', () => {
      expect(canEditItems('REJECTED')).toBe(false);
    });
  });

  describe('canEditMetadata', () => {
    it('returns true for DRAFT', () => {
      expect(canEditMetadata('DRAFT')).toBe(true);
    });

    it('returns false for SUBMITTED', () => {
      expect(canEditMetadata('SUBMITTED')).toBe(false);
    });

    it('returns false for APPROVED', () => {
      expect(canEditMetadata('APPROVED')).toBe(false);
    });

    it('returns false for REJECTED', () => {
      expect(canEditMetadata('REJECTED')).toBe(false);
    });
  });

  describe('canDelete', () => {
    it('returns true for DRAFT', () => {
      expect(canDelete('DRAFT')).toBe(true);
    });

    it('returns false for SUBMITTED', () => {
      expect(canDelete('SUBMITTED')).toBe(false);
    });

    it('returns false for APPROVED', () => {
      expect(canDelete('APPROVED')).toBe(false);
    });

    it('returns false for REJECTED', () => {
      expect(canDelete('REJECTED')).toBe(false);
    });
  });
});