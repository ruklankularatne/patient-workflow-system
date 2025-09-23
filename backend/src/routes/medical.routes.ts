import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth';
import { uploadMedicalRecord } from '../middlewares/fileUpload';
import { 
  upsertMedicalRecord, 
  getMedicalRecordByAppointment, 
  getMedicalRecordsByPatient,
  getAllMedicalRecords,
  getMedicalRecordById,
  deleteMedicalRecord
} from '../services/medical.service';
import { writeAudit } from '../audit/audit.service';

const router = Router();

const MedicalRecordSchema = z.object({
  appointmentId: z.string().optional().nullable(),
  patientId: z.string(),
  doctorId: z.string(),
  notes: z.string().optional().nullable(),
  diagnosis: z.string().optional().nullable(),
  treatment: z.string().optional().nullable(),
  medications: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  attachments: z.array(z.string()).optional()
});

router.get('/appointment/:appointmentId', requireAuth, async (req, res, next) => {
  try {
    const record = await getMedicalRecordByAppointment(req.params.appointmentId);
    return res.json({
      success: true,
      data: record
    });
  } catch (err) { 
    return next(err); 
  }
});

router.get('/patient/:patientId', requireAuth, async (req, res, next) => {
  try {
    const records = await getMedicalRecordsByPatient(req.params.patientId);
    return res.json({
      success: true,
      data: records
    });
  } catch (err) { 
    return next(err); 
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const records = await getAllMedicalRecords();
    return res.json({
      success: true,
      data: records
    });
  } catch (err) { 
    return next(err); 
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const record = await getMedicalRecordById(req.params.id);
    if (!record) {
      return res.status(404).json({ 
        success: false, 
        message: 'Medical record not found' 
      });
    }
    return res.json({
      success: true,
      data: record
    });
  } catch (err) { 
    return next(err); 
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = MedicalRecordSchema.parse(req.body);
    const record = await upsertMedicalRecord(data);
    
    await writeAudit({ 
      actorUserId: (req as any).user?.sub, 
      entity: 'MedicalRecord', 
      entityId: record.id, 
      action: 'upsert', 
      ip: req.ip, 
      userAgent: req.get('user-agent') || undefined, 
      before: null, 
      after: record 
    });
    
    return res.status(201).json({
      success: true,
      data: record
    });
  } catch (err) { 
    return next(err); 
  }
});

// Upload attachment for medical record
router.post('/:id/upload', requireAuth, uploadMedicalRecord.single('attachment'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const record = await getMedicalRecordById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    // Add the new file path to attachments
    const updatedAttachments = [...(record.attachments || []), req.file.filename];
    const updatedRecord = await upsertMedicalRecord({
      appointmentId: record.appointmentId,
      patientId: record.patientId,
      doctorId: record.doctorId,
      notes: record.notes,
      diagnosis: record.diagnosis,
      treatment: record.treatment,
      medications: record.medications,
      followUpDate: record.followUpDate?.toISOString(),
      attachments: updatedAttachments
    });

    await writeAudit({
      actorUserId: (req as any).user?.sub,
      entity: 'MedicalRecord',
      entityId: req.params.id,
      action: 'update',
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined,
      before: record,
      after: updatedRecord
    });

    return res.json({
      success: true,
      data: updatedRecord,
      message: 'File uploaded successfully'
    });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const record = await getMedicalRecordById(req.params.id);
    if (!record) {
      return res.status(404).json({ 
        success: false, 
        message: 'Medical record not found' 
      });
    }
    
    const before = { ...record };
    await deleteMedicalRecord(req.params.id);
    
    await writeAudit({ 
      actorUserId: (req as any).user?.sub, 
      entity: 'MedicalRecord', 
      entityId: req.params.id, 
      action: 'delete', 
      ip: req.ip, 
      userAgent: req.get('user-agent') || undefined, 
      before, 
      after: null 
    });
    
    return res.status(204).send();
  } catch (err) { 
    return next(err); 
  }
});

export default router;
