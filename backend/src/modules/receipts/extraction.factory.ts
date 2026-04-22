import type { IExtractionService } from './extraction.interface';
import { OpenAIExtractionService } from './openai-extraction.service';
import { MockExtractionService } from './mock-extraction.service';
import { config } from '../../config/env';

let _instance: IExtractionService | null = null;
let _lastApiKey: string | null = null;

export function resetExtractionService(): void {
  _instance = null;
  _lastApiKey = null;
}

export function getExtractionService(): IExtractionService {
  const apiKey = config.llmApiKey;

  if (_instance && _lastApiKey === apiKey) return _instance;

  _lastApiKey = apiKey;

  if (!apiKey || apiKey === 'dummy') {
    console.log('[Extraction] No LLM_API_KEY set — using mock extraction service');
    _instance = new MockExtractionService();
  } else {
    console.log(`[Extraction] Using OpenAI-compatible extraction (model: ${config.llmModel}, base: ${config.llmBaseUrl})`);
    _instance = new OpenAIExtractionService(apiKey, config.llmBaseUrl, config.llmModel);
  }

  return _instance;
}