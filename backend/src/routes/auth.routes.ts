import { Router } from 'express';
import { z } from 'zod';
import { createUser, findUserByEmail, validatePassword } from '../services/auth.service';
import { signAccess, signRefresh } from '../utils/jwt';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, COOKIE_SECURE, COOKIE_SAME_SITE } from '../configs/security';

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['superadmin', 'admin', 'doctor', 'patient']).default('patient')
});

router.post('/register', async (req, res, next) => {
  try {
    const body = RegisterSchema.parse(req.body);
    const existing = await findUserByEmail(body.email);
    if (existing) return res.status(409).json({ message: 'Email already registered' });
    const user = await createUser(body);
    return res.status(201).json({ id: user.id, email: user.email });
  } catch (e) { return next(e); }
});

const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await validatePassword(user.id, password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const payload = { sub: user.id, role: user.role };
    const access = signAccess(payload);
    const refresh = signRefresh(payload);
    res.cookie(ACCESS_COOKIE_NAME, access, { httpOnly: true, secure: COOKIE_SECURE, sameSite: COOKIE_SAME_SITE, path: '/' });
    res.cookie(REFRESH_COOKIE_NAME, refresh, { httpOnly: true, secure: COOKIE_SECURE, sameSite: COOKIE_SAME_SITE, path: '/' });
    return res.json({ userId: user.id, role: user.role });
  } catch (e) { return next(e); }
});

router.post('/logout', async (_req, res) => {
  res.clearCookie(ACCESS_COOKIE_NAME);
  res.clearCookie(REFRESH_COOKIE_NAME);
  return res.status(204).send();
});

export default router;
