import 'express';
import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: Role;
      };
      params: Record<string, string | string[] | undefined> & {
        reportId?: string;
      };
    }
  }
}

export {};
