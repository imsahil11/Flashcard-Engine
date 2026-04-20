import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@flashcard/database';
import { env } from '../config.js';

export type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
    createdAt: Date;
  };
};

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
      return res.status(401).json({ message: 'Missing authorization token' });
    }

    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, createdAt: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid authorization token' });
    }

    (req as AuthenticatedRequest).user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid authorization token' });
  }
}
