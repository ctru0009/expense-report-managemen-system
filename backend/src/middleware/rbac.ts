import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../common/errors';

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}
