import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '@flashcard/database';
import { env } from '../config.js';
import { AppError } from '../middleware/error.js';

const SALT_ROUNDS = 12;

export async function registerUser(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('Email is already registered', 409);
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword },
    select: { id: true, email: true, createdAt: true },
  });

  return { user, token: signToken(user.id) };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new AppError('Invalid email or password', 401);
  }

  return {
    user: { id: user.id, email: user.email, createdAt: user.createdAt },
    token: signToken(user.id),
  };
}

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '7d' });
}
