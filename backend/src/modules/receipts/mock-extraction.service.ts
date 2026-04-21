import type { IExtractionService, ExtractedData } from './extraction.interface';

export class MockExtractionService implements IExtractionService {
  async extract(_filePath: string, _mimeType: string): Promise<ExtractedData> {
    return {
      merchantName: 'Sample Merchant',
      amount: 42.50,
      currency: 'USD',
      transactionDate: new Date().toISOString().slice(0, 10),
    };
  }
}