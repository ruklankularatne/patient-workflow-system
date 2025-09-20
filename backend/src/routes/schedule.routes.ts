import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth';
import { createSchedule, getSchedules, getScheduleById, updateSchedule, deleteSchedule } from '../services/schedule.service';
import { writeAudit } from '../audit/audit.service';

const router = Router();

const CreateScheduleSchema = z.object({
  doctorId: z.string(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date' }),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/)
});

const UpdateScheduleSchema = z.object({
  date: z.string().refine((v) => !v || !isNaN(Date.parse(v)), { message: 'Invalid date' }).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional()
});

router.get('/', async (req, res, next) => {
  try {
    const { doctorId, startDate, endDate, skip, take } = req.query;
    const schedules = await getSchedules({
      doctorId: doctorId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined
    });
    return res.json(schedules);
  } catch (e) { return next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const schedule = await getScheduleById(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    return res.json(schedule);
  } catch (e) { return next(e); }
});

router.post('/', requireAuth, requireRole('admin', 'doctor', 'superadmin'), async (req, res, next) => {
  try {
    const parsed = CreateScheduleSchema.parse(req.body);
    if ((req as any).user?.role === 'doctor' && (req as any).user.sub !== parsed.doctorId) {
      return res.status(403).json({ message: 'Doctors may only create their own schedules' });
    }
    const schedule = await createSchedule({ doctorId: parsed.doctorId, date: new Date(parsed.date), startTime: parsed.startTime, endTime: parsed.endTime });
    await writeAudit({ actorUserId: (req as any).user?.sub, entity: 'Schedule', entityId: schedule.id, action: 'create', ip: req.ip, userAgent: req.get('user-agent') || undefined, before: null, after: schedule });
    return res.status(201).json(schedule);
  } catch (e) { return next(e); }
});

router.put('/:id', requireAuth, requireRole('admin', 'doctor', 'superadmin'), async (req, res, next) => {
  try {
    const existing = await getScheduleById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Schedule not found' });
    if ((req as any).user?.role === 'doctor' && (req as any).user.sub !== existing.doctor.user.id) {
      return res.status(403).json({ message: 'You can only edit your own schedules' });
    }
    const updatesRaw = UpdateScheduleSchema.parse(req.body);
    const updates: any = {};
    if (updatesRaw.date) updates.date = new Date(updatesRaw.date);
    if (updatesRaw.startTime) updates.startTime = updatesRaw.startTime;
    if (updatesRaw.endTime) updates.endTime = updatesRaw.endTime;
    const updated = await updateSchedule(req.params.id, updates);
    await writeAudit({ actorUserId: (req as any).user?.sub, entity: 'Schedule', entityId: req.params.id, action: 'update', ip: req.ip, userAgent: req.get('user-agent') || undefined, before: existing, after: updated });
    return res.json(updated);
  } catch (e) { return next(e); }
});

router.delete('/:id', requireAuth, requireRole('admin', 'doctor', 'superadmin'), async (req, res, next) => {
  try {
    const existing = await getScheduleById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Schedule not found' });
    if ((req as any).user?.role === 'doctor' && (req as any).user.sub !== existing.doctor.user.id) {
      return res.status(403).json({ message: 'You can only delete your own schedules' });
    }
    await deleteSchedule(req.params.id);
    await writeAudit({ actorUserId: (req as any).user?.sub, entity: 'Schedule', entityId: req.params.id, action: 'delete', ip: req.ip, userAgent: req.get('user-agent') || undefined, before: existing, after: null });
    return res.status(204).send();
  } catch (e) { return next(e); }
});

export default router;
