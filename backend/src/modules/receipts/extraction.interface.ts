export interface ExtractedData {
  merchantName?: string;
  amount?: number;
  currency?: string;
  transactionDate?: string;
}

export interface IExtractionService {
  extract(filePath: string, mimeType: string): Promise<ExtractedData>;
}