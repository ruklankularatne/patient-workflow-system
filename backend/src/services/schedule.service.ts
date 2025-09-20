import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function createSchedule(options: { doctorId: string; date: Date; startTime: string; endTime: string; }) {
  return prisma.schedule.create({ data: options });
}

export async function getSchedules(params: { doctorId?: string; startDate?: Date; endDate?: Date; skip?: number; take?: number; } = {}) {
  const { doctorId, startDate, endDate, skip, take } = params;
  return prisma.schedule.findMany({
    where: {
      ...(doctorId ? { doctorId } : {}),
      ...(startDate || endDate ? { date: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } } : {})
    },
    include: { doctor: { include: { user: true } } },
    skip,
    take,
    orderBy: { date: 'asc' }
  });
}

export async function getScheduleById(id: string) {
  return prisma.schedule.findUnique({ where: { id }, include: { doctor: { include: { user: true } } } });
}

export async function updateSchedule(id: string, updates: { date?: Date; startTime?: string; endTime?: string }) {
  return prisma.schedule.update({ where: { id }, data: updates });
}

export async function deleteSchedule(id: string) {
  return prisma.schedule.delete({ where: { id } });
}
