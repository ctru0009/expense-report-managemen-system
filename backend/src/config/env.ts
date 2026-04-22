import path from 'path';
import dotenv from 'dotenv';
import type { SignOptions } from 'jsonwebtoken';

dotenv.config();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required in production');
}

export const config = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '7d') as NonNullable<SignOptions['expiresIn']>,
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL!,
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
  llmApiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '',
  llmBaseUrl: process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1',
  llmModel: process.env.LLM_MODEL || 'google/gemini-2.0-flash-001',
};
