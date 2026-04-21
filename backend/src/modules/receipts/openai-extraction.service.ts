import OpenAI from 'openai';
import fs from 'fs';
import type { IExtractionService, ExtractedData } from './extraction.interface';

const EXTRACTION_PROMPT = `You are a receipt data extraction assistant. Extract the following fields from this receipt image/document:
- merchant_name: the business/store name
- amount: the total amount as a number (no currency symbol)
- currency: the 3-letter currency code (e.g., USD, EUR, GBP)
- transaction_date: the date of the transaction in YYYY-MM-DD format

Respond with ONLY valid JSON, no extra text:
{"merchant_name": "...", "amount": 0.00, "currency": "USD", "transaction_date": "YYYY-MM-DD"}`;

export class OpenAIExtractionService implements IExtractionService {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({
      apiKey,
      ...(baseURL && { baseURL }),
    });
  }

  async extract(filePath: string, mimeType: string): Promise<ExtractedData> {
    const imageBuffer = fs.readFileSync(filePath);
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: EXTRACTION_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
          ],
        },
      ],
      max_tokens: 300,
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content?.trim() ?? '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {};
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        merchantName: parsed.merchant_name,
        amount: typeof parsed.amount === 'number' ? parsed.amount : undefined,
        currency: parsed.currency,
        transactionDate: parsed.transaction_date,
      };
    } catch {
      return {};
    }
  }
}