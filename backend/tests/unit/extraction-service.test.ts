import { VALID_CATEGORIES } from '../../src/modules/receipts/extraction.interface';
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
});