import type { IExtractionService } from './extraction.interface';
import { OpenAIExtractionService } from './openai-extraction.service';
import { MockExtractionService } from './mock-extraction.service';
import { config } from '../../config/env';

let _instance: IExtractionService | null = null;

export function getExtractionService(): IExtractionService {
  if (_instance) return _instance;

  const apiKey = config.openaiApiKey;

  if (!apiKey || apiKey === 'dummy') {
    _instance = new MockExtractionService();
  } else {
    _instance = new OpenAIExtractionService(apiKey, config.openaiBaseUrl);
  }

  return _instance;
}