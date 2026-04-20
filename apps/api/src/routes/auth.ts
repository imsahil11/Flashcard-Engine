import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { loginUser, registerUser } from '../services/auth.service.js';

const router = Router();

const authSchema = z.object({
  email: z.string().email().transform((email) => email.toLowerCase()),
  password: z.string().min(8),
});

router.post('/register', async (req, res, next) => {
  try {
    const body = authSchema.parse(req.body);
    const data = await registerUser(body.email, body.password);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const body = authSchema.parse(req.body);
    const data = await loginUser(body.email, body.password);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  const { user } = req as AuthenticatedRequest;
  res.json({ data: { user } });
});

export { router as authRouter };
