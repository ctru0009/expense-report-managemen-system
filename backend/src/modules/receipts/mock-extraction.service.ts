import type { IExtractionService, ExtractedData } from './extraction.interface';

export class MockExtractionService implements IExtractionService {
  async extract(_filePath: string, _mimeType: string): Promise<ExtractedData> {
    return {
      merchantName: { value: 'Sample Merchant', confidence: 0.95 },
      amount: { value: 42.5, confidence: 0.9 },
      currency: { value: 'USD', confidence: 0.85 },
      transactionDate: { value: new Date().toISOString().slice(0, 10), confidence: 0.88 },
      category: { value: 'TRAVEL', confidence: 0.65 },
    };
  }
}