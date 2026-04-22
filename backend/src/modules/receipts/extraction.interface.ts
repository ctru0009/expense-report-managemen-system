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

const ExtractedStringFieldSchema = z.object({
  value: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

const ExtractedNumberFieldSchema = z.object({
  value: z.number(),
  confidence: z.number().min(0).max(1),
});

export const LlmResponseSchema = z.object({
  merchant_name: ExtractedStringFieldSchema.optional(),
  amount: ExtractedNumberFieldSchema.optional(),
  currency: z.object({
    value: z.string().length(3),
    confidence: z.number().min(0).max(1),
  }).optional(),
  transaction_date: z.object({
    value: z.string().min(1),
    confidence: z.number().min(0).max(1),
  }).optional(),
  category: z.object({
    value: z.string(),
    confidence: z.number().min(0).max(1),
  }).optional(),
}).strict();