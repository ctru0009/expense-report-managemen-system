import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { UnauthorizedError } from '../common/errors';

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  let token: string | undefined;

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return next(new UnauthorizedError('Missing authorization token'));
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret) as { userId: string; role: Role };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}