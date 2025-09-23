import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.get('/visits-by-day', requireAuth, requireRole('admin','superadmin'), async (_req, res) => {
  const data = await prisma.appointment.groupBy({
    by: ['date'],
    _count: { _all: true },
    orderBy: { date: 'asc' }
  });
  res.json(data);
});

router.get('/visits-by-doctor', requireAuth, requireRole('admin','superadmin'), async (_req, res) => {
  const data = await prisma.appointment.groupBy({ by: ['doctorId'], _count: { _all: true } });
  res.json(data);
});

router.get('/visits-by-specialty', requireAuth, requireRole('admin','superadmin'), async (_req, res) => {
  const rows = await prisma.doctor.findMany({ include: { appointments: true } });
  const map: Record<string, number> = {};
  for (const d of rows) map[d.specialty] = (map[d.specialty] || 0) + d.appointments.length;
  res.json(map);
});

export default router;
