import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
      };
      params: Record<string, string | string[] | undefined> & {
        reportId?: string;
      };
    }
  }
}

export {};
