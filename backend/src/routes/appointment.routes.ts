import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth';
import { FEATURES } from '../configs/features';
import { createAppointment, listAppointments, updateAppointmentStatus } from '../services/appointment.service';
import { writeAudit } from '../audit/audit.service';

const router = Router();

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
    return res.json(items);
  } catch (e) { return next(e); }
});

router.post('/', requireAuth, requireRole('admin', 'doctor', 'superadmin', 'patient'), async (req, res, next) => {
  try {
    const parsed = CreateSchema.parse(req.body);
    const app = await createAppointment({ patientId: parsed.patientId, doctorId: parsed.doctorId, date: new Date(parsed.date), time: parsed.time, notes: parsed.notes ?? null });
    await writeAudit({ actorUserId: (req as any).user?.sub, entity: 'Appointment', entityId: app.id, action: 'create', ip: req.ip, userAgent: req.get('user-agent') || undefined, before: null, after: app });
    return res.status(201).json(app);
  } catch (e) { return next(e); }
});

const StatusSchema = z.object({ status: z.enum(['pending','confirmed','completed','cancelled']) });

router.put('/:id/status', requireAuth, requireRole('admin','doctor','superadmin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = StatusSchema.parse(req.body);
    if ((req as any).user?.role === 'doctor' && !FEATURES.ALLOW_DOCTOR_APPOINTMENT_STATUS_UPDATE) {
      return res.status(403).json({ message: 'Doctor status updates disabled' });
    }
    const updated = await updateAppointmentStatus(id, status);
    await writeAudit({ actorUserId: (req as any).user?.sub, entity: 'Appointment', entityId: id, action: 'status', ip: req.ip, userAgent: req.get('user-agent') || undefined, before: null, after: updated });
    return res.json(updated);
  } catch (e) { return next(e); }
});

export default router;
