import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function createAppointment(options: { patientId: string; doctorId: string; date: Date; time: string; notes?: string | null; }) {
  return prisma.appointment.create({ data: { ...options, status: 'pending' } });
}

export async function listAppointments(params: { doctorId?: string; patientId?: string; from?: Date; to?: Date; }) {
  const { doctorId, patientId, from, to } = params;
  return prisma.appointment.findMany({
    where: {
      ...(doctorId ? { doctorId } : {}),
      ...(patientId ? { patientId } : {}),
      ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {})
    },
    include: { doctor: { include: { user: true } }, patient: true },
    orderBy: [{ date: 'asc' }, { time: 'asc' }]
  });
}

export async function updateAppointmentStatus(id: string, status: string) {
  return prisma.appointment.update({ where: { id }, data: { status } });
}
