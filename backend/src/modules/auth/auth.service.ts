import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { config } from '../../config/env';
import { ConflictError, UnauthorizedError, ValidationError } from '../../common/errors';

function signToken(userId: string, role: string) {
  return jwt.sign({ userId, role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as string });
}

export async function signup(email: string, password: string) {
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }
  if (password.length < 6) {
    throw new ValidationError('Password must be at least 6 characters');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError('Email already registered');
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed },
  });

  const token = signToken(user.id, user.role);
  return {
    token,
    user: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt },
  };
}

export async function login(email: string, password: string) {
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = signToken(user.id, user.role);
  return {
    token,
    user: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt },
  };
}
