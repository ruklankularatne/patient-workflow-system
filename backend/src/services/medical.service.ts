import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
const prisma = new PrismaClient();

export async function upsertMedicalRecord(options: {
  appointmentId?: string | null;
  patientId: string;
  doctorId: string;
  notes?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  medications?: string | null;
  followUpDate?: string | null;
  attachments?: string[];
}) {
  // If no appointmentId is provided, create a new record without appointment linkage
  if (!options.appointmentId || options.appointmentId.trim() === '') {
    return prisma.medicalRecord.create({
      data: {
        patientId: options.patientId,
        doctorId: options.doctorId,
        notes: options.notes ?? null,
        diagnosis: options.diagnosis ?? null,
        treatment: options.treatment ?? null,
        medications: options.medications ?? null,
        followUpDate: options.followUpDate ? new Date(options.followUpDate) : null,
        attachments: options.attachments ?? []
      }
    });
  }

  return prisma.medicalRecord.upsert({
    where: { appointmentId: options.appointmentId },
    create: {
      appointmentId: options.appointmentId,
      patientId: options.patientId,
      doctorId: options.doctorId,
      notes: options.notes ?? null,
      diagnosis: options.diagnosis ?? null,
      treatment: options.treatment ?? null,
      medications: options.medications ?? null,
      followUpDate: options.followUpDate ? new Date(options.followUpDate) : null,
      attachments: options.attachments ?? []
    },
    update: {
      notes: options.notes ?? null,
      diagnosis: options.diagnosis ?? null,
      treatment: options.treatment ?? null,
      medications: options.medications ?? null,
      followUpDate: options.followUpDate ? new Date(options.followUpDate) : null,
      attachments: options.attachments ?? []
    }
  });
}

export async function getMedicalRecordByAppointment(appointmentId: string) {
  return prisma.medicalRecord.findUnique({ where: { appointmentId } });
}

export async function getMedicalRecordsByPatient(patientId: string) {
  try {
    const records = await prisma.medicalRecord.findMany({
      where: { patientId },
      include: {
        doctor: {
          include: {
            user: true
          }
        },
        patient: true,
        appointment: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return records;
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error), patientId }, 'Error fetching medical records');
    throw error;
  }
}

export async function getMedicalRecordsByAppointment(appointmentId: string) {
  try {
    const records = await prisma.medicalRecord.findMany({
      where: { appointmentId },
      include: {
        doctor: {
          include: {
            user: true
          }
        },
        patient: true,
        appointment: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return records;
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error), appointmentId }, 'Error fetching medical records by appointment');
    throw error;
  }
}

export async function getAllMedicalRecords() {
  try {
    const records = await prisma.medicalRecord.findMany({
      include: {
        doctor: {
          include: {
            user: true
          }
        },
        patient: true,
        appointment: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return records;
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error fetching all medical records');
    throw error;
  }
}

export async function getMedicalRecordById(id: string) {
  try {
    const record = await prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        doctor: {
          include: {
            user: true
          }
        },
        patient: true,
        appointment: true
      }
    });
    return record;
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error), recordId: id }, 'Error fetching medical record by ID');
    throw error;
  }
}

export async function deleteMedicalRecord(id: string) {
  try {
    await prisma.medicalRecord.delete({
      where: { id }
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error), recordId: id }, 'Error deleting medical record');
    throw error;
  }
}
