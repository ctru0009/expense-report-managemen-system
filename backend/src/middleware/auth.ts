import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { UnauthorizedError } from '../common/errors';

interface JwtPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing authorization token'));
  }

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, config.jwtSecret) as JwtPayload;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
