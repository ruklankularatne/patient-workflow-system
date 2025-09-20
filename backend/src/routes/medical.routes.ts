import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth';
import { FEATURES } from '../configs/features';
import { upsertMedicalRecord, getMedicalRecordByAppointment } from '../services/medical.service';
import { writeAudit } from '../audit/audit.service';

const router = Router();

const UpsertSchema = z.object({
  appointmentId: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  diagnosis: z.string().optional().nullable(),
  prescription: z.string().optional().nullable(),
  attachments: z.array(z.string()).optional()
});

router.get('/:appointmentId', requireAuth, async (req, res, next) => {
  try {
    const rec = await getMedicalRecordByAppointment(req.params.appointmentId);
    if (!rec) return res.status(404).json({ message: 'Not found' });
    return res.json(rec);
  } catch (e) { return next(e); }
});

router.post('/', requireAuth, requireRole('doctor','admin','superadmin'), async (req, res, next) => {
  try {
    const body = UpsertSchema.parse(req.body);
    if ((req as any).user?.role === 'admin' && !FEATURES.ALLOW_ADMIN_MEDICAL_RECORD_WRITE) {
      return res.status(403).json({ message: 'Admin write disabled for medical records' });
    }
    const rec = await upsertMedicalRecord(body);
    await writeAudit({ actorUserId: (req as any).user?.sub, entity: 'MedicalRecord', entityId: rec.id, action: 'upsert', ip: req.ip, userAgent: req.get('user-agent') || undefined, before: null, after: rec });
    return res.status(201).json(rec);
  } catch (e) { return next(e); }
});

export default router;
