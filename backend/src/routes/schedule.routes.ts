import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth';
import {
  createSchedule,
  getSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule
} from '../services/schedule.service';
import { writeAudit } from '../audit/audit.service';

const router = Router();

// Validation schemas
const CreateScheduleSchema = z.object({
  doctorId: z.string(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date'
  }),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/)
});

const UpdateScheduleSchema = z.object({
  date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid date'
    })
    .optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional()
});

// List schedules 
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
  } catch (err) {
    return next(err);
  }
});

// Get a schedule by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const schedule = await getScheduleById(id);
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    return res.json(schedule);
  } catch (err) {
    return next(err);
  }
});

// Create a new schedule (doctors, admins, superadmins)
router.post('/', requireAuth, requireRole('admin', 'doctor', 'superadmin'), async (req, res, next) => {
  try {
    const parsed = CreateScheduleSchema.parse(req.body);

    if (req.user?.role === 'doctor' && req.user.sub !== parsed.doctorId) {
      return res.status(403).json({ message: 'Doctors may only create schedules for themselves' });
    }
    const schedule = await createSchedule({
      doctorId: parsed.doctorId,
      date: new Date(parsed.date),
      startTime: parsed.startTime,
      endTime: parsed.endTime
    });
    await writeAudit({
      actorUserId: req.user?.sub,
      entity: 'Schedule',
      entityId: schedule.id,
      action: 'create',
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined,
      before: null,
      after: schedule
    });
    return res.status(201).json(schedule);
  } catch (err) {
    return next(err);
  }
});

// Update a schedule (only owner doctor or admins/superadmins)
router.put('/:id', requireAuth, requireRole('admin', 'doctor', 'superadmin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await getScheduleById(id);
    if (!existing) return res.status(404).json({ message: 'Schedule not found' });
    // Doctors can only edit their own schedules
    if (req.user?.role === 'doctor' && req.user.sub !== existing.doctor.user.id) {
      return res.status(403).json({ message: 'You can only edit your own schedules' });
    }
    const updatesRaw = UpdateScheduleSchema.parse(req.body);
    const updates: any = {};
    if (updatesRaw.date) updates.date = new Date(updatesRaw.date);
    if (updatesRaw.startTime) updates.startTime = updatesRaw.startTime;
    if (updatesRaw.endTime) updates.endTime = updatesRaw.endTime;
    const updated = await updateSchedule(id, updates);
    await writeAudit({
      actorUserId: req.user?.sub,
      entity: 'Schedule',
      entityId: id,
      action: 'update',
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined,
      before: existing,
      after: updated
    });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

// Delete a schedule (only owner doctor or admins/superadmins)
router.delete('/:id', requireAuth, requireRole('admin', 'doctor', 'superadmin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await getScheduleById(id);
    if (!existing) return res.status(404).json({ message: 'Schedule not found' });
    // Doctors can only delete their own schedules
    if (req.user?.role === 'doctor' && req.user.sub !== existing.doctor.user.id) {
      return res.status(403).json({ message: 'You can only delete your own schedules' });
    }
    await deleteSchedule(id);
    await writeAudit({
      actorUserId: req.user?.sub,
      entity: 'Schedule',
      entityId: id,
      action: 'delete',
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined,
      before: existing,
      after: null
    });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;
