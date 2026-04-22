import { ValidationError } from '../../src/common/errors';
import { createReportSchema, updateReportSchema, statusFilterSchema } from '../../src/modules/reports/report.routes';
import { createItemSchema, updateItemSchema } from '../../src/modules/items/item.routes';

describe('Report Validation Schemas', () => {
  describe('createReportSchema', () => {
    it('accepts valid input', () => {
      const result = createReportSchema.safeParse({ title: 'My Report' });
      expect(result.success).toBe(true);
    });

    it('accepts valid input with description', () => {
      const result = createReportSchema.safeParse({ title: 'My Report', description: 'Details' });
      expect(result.success).toBe(true);
    });

    it('rejects empty title', () => {
      const result = createReportSchema.safeParse({ title: '' });
      expect(result.success).toBe(false);
    });

    it('rejects missing title', () => {
      const result = createReportSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects title exceeding 200 characters', () => {
      const result = createReportSchema.safeParse({ title: 'a'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('rejects description exceeding 1000 characters', () => {
      const result = createReportSchema.safeParse({ title: 'Test', description: 'a'.repeat(1001) });
      expect(result.success).toBe(false);
    });
  });

  describe('updateReportSchema', () => {
    it('accepts partial update with title only', () => {
      const result = updateReportSchema.safeParse({ title: 'New Title' });
      expect(result.success).toBe(true);
    });

    it('accepts setting description to null (clearing it)', () => {
      const result = updateReportSchema.safeParse({ description: null });
      expect(result.success).toBe(true);
    });

    it('accepts empty body (all fields optional)', () => {
      const result = updateReportSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects empty title string', () => {
      const result = updateReportSchema.safeParse({ title: '' });
      expect(result.success).toBe(false);
    });

    it('rejects title exceeding 200 characters', () => {
      const result = updateReportSchema.safeParse({ title: 'a'.repeat(201) });
      expect(result.success).toBe(false);
    });
  });

  describe('statusFilterSchema', () => {
    it('accepts valid status values', () => {
      for (const status of ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']) {
        const result = statusFilterSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('accepts empty object (status optional)', () => {
      const result = statusFilterSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects invalid status value', () => {
      const result = statusFilterSchema.safeParse({ status: 'PENDING' });
      expect(result.success).toBe(false);
    });
  });
});

describe('Item Validation Schemas', () => {
  const validItem = {
    amount: 50,
    category: 'MEALS',
    merchantName: 'Test Merchant',
    transactionDate: '2024-01-15T10:30:00Z',
  };

  describe('createItemSchema', () => {
    it('accepts valid input with required fields', () => {
      const result = createItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('defaults currency to USD when not provided', () => {
      const result = createItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('USD');
      }
    });

    it('accepts custom 3-char currency code', () => {
      const result = createItemSchema.safeParse({ ...validItem, currency: 'EUR' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('EUR');
      }
    });

    it('rejects negative amount', () => {
      const result = createItemSchema.safeParse({ ...validItem, amount: -5 });
      expect(result.success).toBe(false);
    });

    it('rejects zero amount', () => {
      const result = createItemSchema.safeParse({ ...validItem, amount: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects string amount (type coercion not enabled)', () => {
      const result = createItemSchema.safeParse({ ...validItem, amount: '50' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid category', () => {
      const result = createItemSchema.safeParse({ ...validItem, category: 'INVALID' });
      expect(result.success).toBe(false);
    });

    it('rejects empty merchantName', () => {
      const result = createItemSchema.safeParse({ ...validItem, merchantName: '' });
      expect(result.success).toBe(false);
    });

    it('rejects merchantName exceeding 200 characters', () => {
      const result = createItemSchema.safeParse({ ...validItem, merchantName: 'a'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('rejects invalid transactionDate format', () => {
      const result = createItemSchema.safeParse({ ...validItem, transactionDate: 'not-a-date' });
      expect(result.success).toBe(false);
    });

    it('accepts valid receiptUrl path', () => {
      const result = createItemSchema.safeParse({ ...validItem, receiptUrl: '/uploads/123456-abc.png' });
      expect(result.success).toBe(true);
    });

    it('transforms transactionDate string to Date object', () => {
      const result = createItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transactionDate).toBeInstanceOf(Date);
      }
    });

    it('trims merchantName whitespace', () => {
      const result = createItemSchema.safeParse({ ...validItem, merchantName: '  Trimmed  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.merchantName).toBe('Trimmed');
      }
    });
  });

  describe('updateItemSchema', () => {
    it('accepts partial update with amount only', () => {
      const result = updateItemSchema.safeParse({ amount: 100 });
      expect(result.success).toBe(true);
    });

    it('accepts setting receiptUrl to null (clearing it)', () => {
      const result = updateItemSchema.safeParse({ receiptUrl: null });
      expect(result.success).toBe(true);
    });

    it('accepts empty body (all fields optional)', () => {
      const result = updateItemSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects negative amount', () => {
      const result = updateItemSchema.safeParse({ amount: -5 });
      expect(result.success).toBe(false);
    });

    it('rejects zero amount', () => {
      const result = updateItemSchema.safeParse({ amount: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects string amount', () => {
      const result = updateItemSchema.safeParse({ amount: '50' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid category', () => {
      const result = updateItemSchema.safeParse({ category: 'INVALID' });
      expect(result.success).toBe(false);
    });

    it('rejects empty merchantName in update', () => {
      const result = updateItemSchema.safeParse({ merchantName: '' });
      expect(result.success).toBe(false);
    });

    it('accepts valid receiptUrl path', () => {
      const result = updateItemSchema.safeParse({ receiptUrl: '/uploads/file.png' });
      expect(result.success).toBe(true);
    });

    it('trims merchantName whitespace in update', () => {
      const result = updateItemSchema.safeParse({ merchantName: '  Trimmed  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.merchantName).toBe('Trimmed');
      }
    });
  });
});