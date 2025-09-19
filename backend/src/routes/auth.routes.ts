import { Router } from 'express';
import { z } from 'zod';
import { createUser, verifyUser } from '../services/auth.service';
import { writeAudit } from '../audit/audit.service';
import { cookieOptions, signAccessToken, signRefreshToken, ACCESS_COOKIE_NAME } from '../utils/jwt';
import { requireAuth } from '../middlewares/auth';

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['superadmin','admin','doctor','patient']).optional()
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, fullName, password, role } = RegisterSchema.parse(req.body);
    const user = await createUser({ email, fullName, password, role });

    await writeAudit({
      actorUserId: user.id,
      entity: 'User',
      entityId: user.id,
      action: 'create',
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined,
      before: null,
      after: { id: user.id, email: user.email, role: user.role }
    });

    return res.status(201).json({ id: user.id, email: user.email, fullName: user.fullName, role: user.role });
  } catch (err) {
    return next(err);
  }
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const user = await verifyUser(email, password);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const access = signAccessToken({ sub: user.id, role: user.role });
    const refresh = signRefreshToken({ sub: user.id, role: user.role });

    res.cookie(process.env.COOKIE_NAME!, access, cookieOptions());
    res.cookie(process.env.REFRESH_COOKIE_NAME!, refresh, { ...cookieOptions(), maxAge: 1000 * 60 * 60 * 24 * 7 });

    await writeAudit({
      actorUserId: user.id,
      entity: 'User',
      entityId: user.id,
      action: 'login',
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined
    });

    return res.json({ id: user.id, email: user.email, fullName: user.fullName, role: user.role });
  } catch (err) {
    return next(err);
  }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    res.clearCookie(process.env.COOKIE_NAME!, { path: '/' });
    res.clearCookie(process.env.REFRESH_COOKIE_NAME!, { path: '/' });

    await writeAudit({
      actorUserId: req.user?.sub,
      entity: 'User',
      entityId: req.user?.sub,
      action: 'logout',
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined
    });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  return res.json({ userId: req.user!.sub, role: req.user!.role });
});

export default router;
