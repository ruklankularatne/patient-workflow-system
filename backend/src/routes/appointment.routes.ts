import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth';
import { FEATURES } from '../configs/features';
import { createAppointment, listAppointments, updateAppointmentStatus } from '../services/appointment.service';
import { writeAudit } from '../audit/audit.service';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const CreateSchema = z.object({
  patientId: z.string(),
  doctorId: z.string(),
  date: z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid date' }),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().optional()
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { doctorId, patientId, from, to } = req.query;
    const items = await listAppointments({
      doctorId: doctorId as string | undefined,
      patientId: patientId as string | undefined,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined
    });
    return res.json({ success: true, message: 'Appointments retrieved successfully', data: items });
  } catch (e) { return next(e); }
});

router.post('/', requireAuth, requireRole('admin', 'doctor', 'superadmin', 'patient'), async (req, res, next) => {
  try {
    const parsed = CreateSchema.parse(req.body);
    const userId = (req as any).user?.id;
    const app = await createAppointment({ patientId: parsed.patientId, doctorId: parsed.doctorId, date: new Date(parsed.date), time: parsed.time, notes: parsed.notes ?? null }, userId);
    await writeAudit({ actorUserId: userId, entity: 'Appointment', entityId: app.id, action: 'create', ip: req.ip, userAgent: req.get('user-agent') || undefined, before: null, after: app });
    return res.status(201).json({ success: true, message: 'Appointment created successfully', data: app });
  } catch (e) { return next(e); }
});

const StatusSchema = z.object({ status: z.enum(['pending','confirmed','completed','cancelled']) });

router.put('/:id/status', requireAuth, requireRole('admin','doctor','superadmin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = StatusSchema.parse(req.body);
    const userId = (req as any).user?.id;
    if ((req as any).user?.role === 'doctor' && !FEATURES.ALLOW_DOCTOR_APPOINTMENT_STATUS_UPDATE) {
      return res.status(403).json({ success: false, message: 'Doctor status updates disabled' });
    }
    const updated = await updateAppointmentStatus(id, status, userId);
    await writeAudit({ actorUserId: userId, entity: 'Appointment', entityId: id, action: 'status', ip: req.ip, userAgent: req.get('user-agent') || undefined, before: null, after: updated });
    return res.json({ success: true, data: updated });
  } catch (e) { return next(e); }
});

// Specific status update endpoints that frontend expects
router.patch('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    // Allow patients to cancel their own appointments, or admin/doctor to cancel any
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    if (user.role === 'patient' && appointment.patientId !== user.id) {
      return res.status(403).json({ success: false, message: 'Can only cancel your own appointments' });
    }
    
    const updated = await updateAppointmentStatus(id, 'cancelled', user.id);
    await writeAudit({ actorUserId: user.id, entity: 'Appointment', entityId: id, action: 'cancel', ip: req.ip, userAgent: req.get('user-agent') || undefined, before: appointment, after: updated });
    return res.json({ success: true, data: updated });
  } catch (e) { return next(e); }
});

router.patch('/:id/confirm', requireAuth, requireRole('admin','doctor','superadmin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const updated = await updateAppointmentStatus(id, 'confirmed', userId);
    await writeAudit({ actorUserId: userId, entity: 'Appointment', entityId: id, action: 'confirm', ip: req.ip, userAgent: req.get('user-agent') || undefined, before: null, after: updated });
    return res.json({ success: true, data: updated });
  } catch (e) { return next(e); }
});

router.patch('/:id/complete', requireAuth, requireRole('admin','doctor','superadmin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const updated = await updateAppointmentStatus(id, 'completed', userId);
    await writeAudit({ actorUserId: userId, entity: 'Appointment', entityId: id, action: 'complete', ip: req.ip, userAgent: req.get('user-agent') || undefined, before: null, after: updated });
    return res.json({ success: true, data: updated });
  } catch (e) { return next(e); }
});

// Cleanup endpoint to convert pending appointments to confirmed (one-time use)
router.post('/cleanup-pending', requireAuth, requireRole('admin','superadmin'), async (req, res, next) => {
  try {
    const { updatePendingAppointments } = await import('../scripts/update-pending-appointments');
    await updatePendingAppointments();
    return res.json({ success: true, message: 'Pending appointments updated to confirmed' });
  } catch (e) { return next(e); }
});

export default router;
