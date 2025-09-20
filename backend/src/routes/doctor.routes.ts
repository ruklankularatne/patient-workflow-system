import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth';
import { FEATURES } from '../configs/features';
import { createDoctor, getDoctors, getDoctorById, updateDoctor, deleteDoctor } from '../services/doctor.service';
import { writeAudit } from '../audit/audit.service';

const router = Router();

const CreateDoctorSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(8),
  specialty: z.string().min(1),
  location: z.string().min(1),
  bio: z.string().optional(),
  profilePicture: z.string().optional()
});

const UpdateDoctorSchema = z.object({
  specialty: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional().nullable(),
  profilePicture: z.string().optional().nullable(),
  fullName: z.string().optional(),
  email: z.string().email().optional()
});

router.get('/', async (req, res, next) => {
  try {
    const { specialty, location, skip, take } = req.query;
    const doctors = await getDoctors({
      specialty: specialty as string | undefined,
      location: location as string | undefined,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined
    });
    return res.json(doctors);
  } catch (err) { return next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doctor = await getDoctorById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    return res.json(doctor);
  } catch (err) { return next(err); }
});

router.post('/', requireAuth, requireRole('admin', 'superadmin'), async (req, res, next) => {
  try {
    const data = CreateDoctorSchema.parse(req.body);
    const doctor = await createDoctor(data);
    await writeAudit({ actorUserId: (req as any).user?.sub, entity: 'Doctor', entityId: doctor.id, action: 'create', ip: req.ip, userAgent: req.get('user-agent') || undefined, before: null, after: { doctorId: doctor.id, userId: doctor.userId } });
    return res.status(201).json(doctor);
  } catch (err) { return next(err); }
});

router.put('/:id', requireAuth, requireRole('admin', 'doctor', 'superadmin'), async (req, res, next) => {
  try {
    const updates = UpdateDoctorSchema.parse(req.body);
    const doctor = await getDoctorById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    if ((req as any).user?.role === 'doctor') {
      if (!FEATURES.ALLOW_DOCTOR_PROFILE_UPDATE) return res.status(403).json({ message: 'Doctor profile editing is disabled' });
      if ((req as any).user.sub !== doctor.userId) return res.status(403).json({ message: 'You can only edit your own profile' });
    }
    const before = { ...doctor };
    const updated = await updateDoctor(req.params.id, updates);
    await writeAudit({ actorUserId: (req as any).user?.sub, entity: 'Doctor', entityId: req.params.id, action: 'update', ip: req.ip, userAgent: req.get('user-agent') || undefined, before, after: updated ?? undefined });
    return res.json(updated);
  } catch (err) { return next(err); }
});

router.delete('/:id', requireAuth, requireRole('admin', 'superadmin'), async (req, res, next) => {
  try {
    const doctor = await getDoctorById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    const before = { ...doctor };
    await deleteDoctor(req.params.id);
    await writeAudit({ actorUserId: (req as any).user?.sub, entity: 'Doctor', entityId: req.params.id, action: 'delete', ip: req.ip, userAgent: req.get('user-agent') || undefined, before, after: null });
    return res.status(204).send();
  } catch (err) { return next(err); }
});

export default router;
