import { z } from 'zod';

export interface ExtractedField<T> {
  value: T;
  confidence: number;
}

export interface ExtractedData {
  merchantName?: ExtractedField<string>;
  amount?: ExtractedField<number>;
  currency?: ExtractedField<string>;
  category?: ExtractedField<string>;
  transactionDate?: ExtractedField<string>;
}

export interface ExtractionResponse {
  extracted: ExtractedData;
  receiptUrl: string;
}

export interface IExtractionService {
  extract(filePath: string, mimeType: string): Promise<ExtractedData>;
}

export const VALID_CATEGORIES = [
  'TRAVEL',
  'MEALS',
  'OFFICE_SUPPLIES',
  'SOFTWARE',
  'HARDWARE',
  'MARKETING',
  'OTHER',
] as const;

const ExtractedFieldSchema = z.object({
  value: z.unknown(),
  confidence: z.number().min(0).max(1),
});

export const LlmResponseSchema = z.object({
  merchant_name: ExtractedFieldSchema.optional(),
  amount: ExtractedFieldSchema.optional(),
  currency: ExtractedFieldSchema.optional(),
  transaction_date: ExtractedFieldSchema.optional(),
  category: ExtractedFieldSchema.optional(),
}).passthrough();