import OpenAI from 'openai';
import fs from 'fs';
import type { IExtractionService, ExtractedData, ExtractedField } from './extraction.interface';
import { VALID_CATEGORIES } from './extraction.interface';

const EXTRACTION_PROMPT = `You are a receipt data extraction assistant. Extract the following fields from this receipt image/document:
- merchant_name: the business/store name
- amount: the total amount as a number (no currency symbol)
- currency: the 3-letter currency code (e.g., USD, EUR, GBP)
- transaction_date: the date of the transaction in YYYY-MM-DD format
- category: one of [TRAVEL, MEALS, OFFICE_SUPPLIES, SOFTWARE, HARDWARE, MARKETING, OTHER]

For each field, provide a confidence score from 0.0 to 1.0 indicating how certain you are.

Respond with ONLY valid JSON, no extra text:
{"merchant_name": {"value": "...", "confidence": 0.9}, "amount": {"value": 0.00, "confidence": 0.95}, "currency": {"value": "USD", "confidence": 0.8}, "transaction_date": {"value": "YYYY-MM-DD", "confidence": 0.85}, "category": {"value": "OTHER", "confidence": 0.6}}`;

const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseField<T>(raw: unknown, validate?: (v: unknown) => v is T): ExtractedField<T> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const value = obj.value;
  let confidence: number = 0.5;
  if (typeof obj.confidence === 'number' && obj.confidence >= 0 && obj.confidence <= 1) {
    confidence = obj.confidence;
  }
  if (value === undefined || value === null || value === '') return undefined;
  if (validate && !validate(value)) return undefined;
  return { value: value as T, confidence };
}

export class OpenAIExtractionService implements IExtractionService {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, baseURL?: string, model?: string) {
    this.client = new OpenAI({
      apiKey,
      ...(baseURL && { baseURL }),
      timeout: 30000,
    });
    this.model = model || 'gpt-4o-mini';
  }

  async extract(filePath: string, mimeType: string): Promise<ExtractedData> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.callOpenAI(filePath, mimeType);
      } catch (err: unknown) {
        lastError = err;
        console.error(`[Extraction] Attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err);
        const isRetryable = this.isRetryableError(err);
        if (isRetryable && attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  }

  private async callOpenAI(filePath: string, mimeType: string): Promise<ExtractedData> {
    const imageBuffer = fs.readFileSync(filePath);
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: EXTRACTION_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'auto' } },
          ],
        },
      ],
      max_tokens: 400,
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content?.trim() ?? '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {};
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const categoryValue = parsed.category?.value;
      const normalizedCategory =
        typeof categoryValue === 'string'
          ? (VALID_CATEGORIES as readonly string[]).includes(categoryValue.toUpperCase())
            ? categoryValue.toUpperCase()
            : 'OTHER'
          : undefined;

      return {
        merchantName: parseField<string>(parsed.merchant_name),
        amount: parseField<number>(parsed.amount, (v): v is number => typeof v === 'number'),
        currency: parseField<string>(parsed.currency, (v): v is string => typeof v === 'string' && v.length === 3),
        transactionDate: parseField<string>(parsed.transaction_date),
        ...(normalizedCategory
          ? {
              category: {
                value: normalizedCategory,
                confidence:
                  typeof parsed.category?.confidence === 'number'
                    ? Math.min(1, Math.max(0, parsed.category.confidence))
                    : 0.5,
              },
            }
          : {}),
      };
    } catch {
      return {};
    }
  }

  private isRetryableError(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const e = err as { status?: number; code?: string };
    if (e.status === 429) return true;
    if (e.status && e.status >= 500) return true;
    if (e.code === 'ECONNRESET' || e.code === 'ETIMEDOUT') return true;
    return false;
  }
}