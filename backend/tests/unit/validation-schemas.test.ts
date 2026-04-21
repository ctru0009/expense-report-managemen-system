import { z } from 'zod';
import { ValidationError } from '../../src/common/errors';

const createReportSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
});

const updateReportSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
});

const statusFilterSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).optional(),
});

const createItemSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('USD'),
  category: z.enum(['TRAVEL', 'MEALS', 'OFFICE_SUPPLIES', 'SOFTWARE', 'HARDWARE', 'MARKETING', 'OTHER']),
  merchantName: z.string().min(1, 'Merchant name is required').max(200),
  transactionDate: z.string().datetime().transform((val) => new Date(val)),
  receiptUrl: z.string().url().optional(),
});

const updateItemSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  category: z.enum(['TRAVEL', 'MEALS', 'OFFICE_SUPPLIES', 'SOFTWARE', 'HARDWARE', 'MARKETING', 'OTHER']).optional(),
  merchantName: z.string().min(1).max(200).optional(),
  transactionDate: z.string().datetime().transform((val) => new Date(val)).optional(),
  receiptUrl: z.string().url().nullable().optional(),
});

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

    it('rejects invalid receiptUrl', () => {
      const result = createItemSchema.safeParse({ ...validItem, receiptUrl: 'not-a-url' });
      expect(result.success).toBe(false);
    });

    it('accepts valid receiptUrl', () => {
      const result = createItemSchema.safeParse({ ...validItem, receiptUrl: 'https://example.com/receipt.pdf' });
      expect(result.success).toBe(true);
    });

    it('transforms transactionDate string to Date object', () => {
      const result = createItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transactionDate).toBeInstanceOf(Date);
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
  });
});