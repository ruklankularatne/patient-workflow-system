import { PrismaClient, AppointmentStatus } from '@prisma/client';
import { webSocketService } from './websocket.service.js';
const prisma = new PrismaClient();

export async function createAppointment(options: { patientId: string; doctorId: string; date: Date; time: string; notes?: string | null; }, userId?: string) {
  // Calculate endTime (30 minutes after startTime)
  const [hours, minutes] = options.time.split(':').map(Number);
  const endMinutes = minutes + 30;
  const endHours = endMinutes >= 60 ? hours + 1 : hours;
  const finalEndMinutes = endMinutes >= 60 ? endMinutes - 60 : endMinutes;
  const endTime = `${endHours.toString().padStart(2, '0')}:${finalEndMinutes.toString().padStart(2, '0')}`;

  const appointment = await prisma.appointment.create({ 
    data: { 
      patientId: options.patientId,
      doctorId: options.doctorId,
      date: options.date,
      startTime: options.time,
      endTime: endTime,
      notes: options.notes,
      status: 'confirmed' // Appointments are confirmed immediately when booked
    } 
  });

  // Broadcast appointment creation via WebSocket (exclude the user who created it)
  webSocketService.broadcastAppointmentCreated(appointment, userId);

  return appointment;
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
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
  });
}

export async function updateAppointmentStatus(id: string, status: string, userId?: string) {
  // Get the current appointment to track the old status
  const currentAppointment = await prisma.appointment.findUnique({ where: { id } });
  if (!currentAppointment) {
    throw new Error('Appointment not found');
  }

  const oldStatus = currentAppointment.status;
  
  const updatedAppointment = await prisma.appointment.update({ 
    where: { id }, 
    data: { status: status as AppointmentStatus } 
  });

  // Broadcast status change via WebSocket (exclude the user who made the change)
  webSocketService.broadcastAppointmentStatusChanged(updatedAppointment, oldStatus, status, userId);

  // If appointment is cancelled, broadcast slot availability
  if (status === 'cancelled') {
    webSocketService.broadcastAppointmentCancelled(updatedAppointment, userId);
  }

  return updatedAppointment;
}
