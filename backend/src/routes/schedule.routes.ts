import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth';
import { createSchedule, getSchedules, getScheduleById, updateSchedule, deleteSchedule } from '../services/schedule.service';
import { writeAudit } from '../audit/audit.service';
import { logger } from '../utils/logger';

const router = Router();

const CreateScheduleSchema = z.object({
  doctorId: z.string(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date' }),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isAvailable: z.boolean().optional().default(true)
});

const UpdateScheduleSchema = z.object({
  date: z.string().refine((v) => !v || !isNaN(Date.parse(v)), { message: 'Invalid date' }).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isAvailable: z.boolean().optional()
});

router.get('/', async (req, res, next) => {
  try {
    const { doctorId, startDate, endDate, skip, take, onlyAvailable } = req.query;
    
    // For patient safety, limit future date range to 2 weeks for non-authenticated or patient users
    let effectiveEndDate = endDate ? new Date(endDate as string) : undefined;
    if (req.user?.role === 'patient' || !req.user) {
      const today = new Date();
      const twoWeeksFromNow = new Date(today);
      twoWeeksFromNow.setDate(today.getDate() + 14);
      
      // If no end date specified or end date is beyond 2 weeks, limit to 2 weeks
      if (!effectiveEndDate || effectiveEndDate > twoWeeksFromNow) {
        effectiveEndDate = twoWeeksFromNow;
      }
    }
    
    const schedules = await getSchedules({
      doctorId: doctorId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: effectiveEndDate,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      onlyAvailable: onlyAvailable === 'true' || req.user?.role === 'patient' || !req.user // Auto-filter for patients/unauthenticated
    });
    return res.json({
      success: true,
      data: schedules
    });
  } catch (e) { return next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const schedule = await getScheduleById(req.params.id);
    if (!schedule) return res.status(404).json({ 
      success: false, 
      message: 'Schedule not found' 
    });
    return res.json({
      success: true,
      data: schedule
    });
  } catch (e) { return next(e); }
});

router.post('/', requireAuth, requireRole('admin', 'doctor', 'superadmin'), async (req, res, next) => {
  const actorId = (req as any).user?.id;
  
  try {
    const parsed = CreateScheduleSchema.parse(req.body);
    
    logger.info({ doctorId: parsed.doctorId, actorId }, 'Schedule creation requested');
    
    if ((req as any).user?.role === 'doctor') {
      const { getUserById } = await import('../services/auth.service');
      const user = await getUserById((req as any).user.id);
      
      if (!user?.doctor || user.doctor.id !== parsed.doctorId) {
        logger.warn({ actorId, doctorId: parsed.doctorId }, 'Authorization failed: Doctor attempted to create schedule for different doctor');
        return res.status(403).json({ message: 'Doctors may only create their own schedules' });
      }
    }
    
    const schedule = await createSchedule({ 
      doctorId: parsed.doctorId, 
      date: new Date(parsed.date), 
      startTime: parsed.startTime, 
      endTime: parsed.endTime,
      isAvailable: parsed.isAvailable 
    });
    
    logger.info({ scheduleId: schedule.id, doctorId: parsed.doctorId, actorId }, 'Schedule created successfully');
    
    await writeAudit({ actorUserId: (req as any).user?.id, entity: 'Schedule', entityId: schedule.id, action: 'create', ip: req.ip, userAgent: req.get('user-agent') || undefined, before: null, after: schedule });
    return res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: schedule
    });
  } catch (e) { 
    logger.error({ error: e instanceof Error ? e.message : String(e), actorId, stack: e instanceof Error ? e.stack : undefined }, 'Schedule creation failed');
    return next(e); 
  }
});

router.put('/:id', requireAuth, requireRole('admin', 'doctor', 'superadmin'), async (req, res, next) => {
  try {
    const existing = await getScheduleById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Schedule not found' });
    
    // For doctors, ensure they can only edit their own schedules
    if ((req as any).user?.role === 'doctor') {
      // Get the user with doctor relation to check if it belongs to this user
      const { getUserById } = await import('../services/auth.service');
      const user = await getUserById((req as any).user.id);
      if (!user?.doctor || user.doctor.id !== existing.doctorId) {
        return res.status(403).json({ message: 'You can only edit your own schedules' });
      }
    }
    
    const updatesRaw = UpdateScheduleSchema.parse(req.body);
    const updates: any = {};
    if (updatesRaw.date) updates.date = new Date(updatesRaw.date);
    if (updatesRaw.startTime) updates.startTime = updatesRaw.startTime;
    if (updatesRaw.endTime) updates.endTime = updatesRaw.endTime;
    if (typeof updatesRaw.isAvailable === 'boolean') updates.isAvailable = updatesRaw.isAvailable;
    const updated = await updateSchedule(req.params.id, updates);
    await writeAudit({ actorUserId: (req as any).user?.id, entity: 'Schedule', entityId: req.params.id, action: 'update', ip: req.ip, userAgent: req.get('user-agent') || undefined, before: existing, after: updated });
    return res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: updated
    });
  } catch (e) { return next(e); }
});

router.delete('/:id', requireAuth, requireRole('admin', 'doctor', 'superadmin'), async (req, res, next) => {
  try {
    const existing = await getScheduleById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Schedule not found' });
    
    // For doctors, ensure they can only delete their own schedules
    if ((req as any).user?.role === 'doctor') {
      // Get the user with doctor relation to check if it belongs to this user
      const { getUserById } = await import('../services/auth.service');
      const user = await getUserById((req as any).user.id);
      if (!user?.doctor || user.doctor.id !== existing.doctorId) {
        return res.status(403).json({ message: 'You can only delete your own schedules' });
      }
    }
    
    await deleteSchedule(req.params.id);
    await writeAudit({ actorUserId: (req as any).user?.id, entity: 'Schedule', entityId: req.params.id, action: 'delete', ip: req.ip, userAgent: req.get('user-agent') || undefined, before: existing, after: null });
    return res.status(204).send();
  } catch (e) { return next(e); }
});

export default router;
