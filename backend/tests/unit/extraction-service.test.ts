import { VALID_CATEGORIES, LlmResponseSchema } from '../../src/modules/receipts/extraction.interface';
import { MockExtractionService } from '../../src/modules/receipts/mock-extraction.service';

describe('ExtractionService', () => {
  describe('MockExtractionService', () => {
    it('returns extracted data with confidence scores', async () => {
      const service = new MockExtractionService();
      const result = await service.extract('/dummy/path.png', 'image/png');

      expect(result.merchantName).toBeDefined();
      expect(result.merchantName!.value).toBe('Sample Merchant');
      expect(result.merchantName!.confidence).toBeGreaterThanOrEqual(0);
      expect(result.merchantName!.confidence).toBeLessThanOrEqual(1);

      expect(result.amount).toBeDefined();
      expect(result.amount!.value).toBe(42.5);
      expect(typeof result.amount!.confidence).toBe('number');

      expect(result.currency).toBeDefined();
      expect(result.currency!.value).toBe('USD');

      expect(result.transactionDate).toBeDefined();
      expect(result.transactionDate!.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      expect(result.category).toBeDefined();
      expect(result.category!.value).toBe('TRAVEL');
    });

    it('returns category as a valid enum value', async () => {
      const service = new MockExtractionService();
      const result = await service.extract('/dummy/path.png', 'image/png');

      expect(result.category).toBeDefined();
      expect((VALID_CATEGORIES as readonly string[]).includes(result.category!.value)).toBe(true);
    });
  });

  describe('VALID_CATEGORIES constant', () => {
    it('contains all expected categories', () => {
      expect(VALID_CATEGORIES).toContain('TRAVEL');
      expect(VALID_CATEGORIES).toContain('MEALS');
      expect(VALID_CATEGORIES).toContain('OFFICE_SUPPLIES');
      expect(VALID_CATEGORIES).toContain('SOFTWARE');
      expect(VALID_CATEGORIES).toContain('HARDWARE');
      expect(VALID_CATEGORIES).toContain('MARKETING');
      expect(VALID_CATEGORIES).toContain('OTHER');
    });
  });

  describe('LlmResponseSchema (Zod validation)', () => {
    it('accepts a valid LLM response', () => {
      const valid = {
        merchant_name: { value: 'Starbucks', confidence: 0.9 },
        amount: { value: 12.5, confidence: 0.95 },
        currency: { value: 'USD', confidence: 0.8 },
        transaction_date: { value: '2024-01-15', confidence: 0.85 },
        category: { value: 'MEALS', confidence: 0.6 },
      };
      const result = LlmResponseSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('accepts partial LLM response with only some fields', () => {
      const partial = {
        merchant_name: { value: 'Uber', confidence: 0.7 },
      };
      const result = LlmResponseSchema.safeParse(partial);
      expect(result.success).toBe(true);
    });

    it('rejects response with confidence above 1.0', () => {
      const invalid = {
        merchant_name: { value: 'Test', confidence: 1.5 },
      };
      const result = LlmResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects response with confidence below 0', () => {
      const invalid = {
        amount: { value: 10, confidence: -0.1 },
      };
      const result = LlmResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects response with non-numeric confidence', () => {
      const invalid = {
        merchant_name: { value: 'Test', confidence: 'high' },
      };
      const result = LlmResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects extra fields (strict mode)', () => {
      const withExtra = {
        merchant_name: { value: 'Test', confidence: 0.9 },
        unexpected_field: 'should be rejected',
      };
      const result = LlmResponseSchema.safeParse(withExtra);
      expect(result.success).toBe(false);
    });

    it('rejects completely malformed response (not an object)', () => {
      const result = LlmResponseSchema.safeParse('not json');
      expect(result.success).toBe(false);
    });
  });
});