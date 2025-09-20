import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function upsertMedicalRecord(options: {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  diagnosis?: string | null;
  prescription?: string | null;
  attachments?: string[];
}) {
  return prisma.medicalRecord.upsert({
    where: { appointmentId: options.appointmentId },
    create: {
      appointmentId: options.appointmentId,
      patientId: options.patientId,
      doctorId: options.doctorId,
      diagnosis: options.diagnosis ?? null,
      prescription: options.prescription ?? null,
      attachments: options.attachments ?? []
    },
    update: {
      diagnosis: options.diagnosis ?? null,
      prescription: options.prescription ?? null,
      attachments: options.attachments ?? []
    }
  });
}

export async function getMedicalRecordByAppointment(appointmentId: string) {
  return prisma.medicalRecord.findUnique({ where: { appointmentId } });
}
