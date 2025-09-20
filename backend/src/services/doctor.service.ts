import { PrismaClient } from '@prisma/client';
import { createUser } from './auth.service';

const prisma = new PrismaClient();

export async function createDoctor(options: {
  email: string;
  fullName: string;
  password: string;
  specialty: string;
  location: string;
  bio?: string | null;
  profilePicture?: string | null;
}) {
  const user = await createUser({
    email: options.email,
    fullName: options.fullName,
    password: options.password,
    role: 'doctor'
  });
  const doctor = await prisma.doctor.create({
    data: {
      userId: user.id,
      specialty: options.specialty,
      location: options.location,
      bio: options.bio ?? null,
      profilePicture: options.profilePicture ?? null
    },
    include: { user: true }
  });
  return doctor;
}

export async function getDoctors(params: {
  specialty?: string;
  location?: string;
  skip?: number;
  take?: number;
} = {}) {
  const { specialty, location, skip, take } = params;
  return prisma.doctor.findMany({
    where: {
      ...(specialty ? { specialty: { contains: specialty, mode: 'insensitive' } } : {}),
      ...(location ? { location: { contains: location, mode: 'insensitive' } } : {})
    },
    include: { user: true },
    skip,
    take,
    orderBy: { createdAt: 'desc' }
  });
}

export async function getDoctorById(id: string) {
  return prisma.doctor.findUnique({ where: { id }, include: { user: true } });
}

export async function updateDoctor(
  id: string,
  updates: { specialty?: string; location?: string; bio?: string | null; profilePicture?: string | null; fullName?: string; email?: string; }
) {
  const doctor = await prisma.doctor.findUnique({ where: { id }, include: { user: true } });
  if (!doctor) return null;
  const { fullName, email, ...doctorUpdates } = updates;
  const [updatedUser, updatedDoctor] = await prisma.$transaction([
    fullName || email
      ? prisma.user.update({
          where: { id: doctor.userId },
          data: {
            ...(fullName ? { fullName } : {}),
            ...(email ? { email } : {})
          }
        })
      : prisma.user.findUnique({ where: { id: doctor.userId } }),
    prisma.doctor.update({
      where: { id },
      data: {
        ...(doctorUpdates.specialty !== undefined ? { specialty: doctorUpdates.specialty } : {}),
        ...(doctorUpdates.location !== undefined ? { location: doctorUpdates.location } : {}),
        bio: doctorUpdates.bio ?? undefined,
        profilePicture: doctorUpdates.profilePicture ?? undefined
      }
    })
  ]);
  return { ...updatedDoctor, user: updatedUser };
}

export async function deleteDoctor(id: string) {
  const doctor = await prisma.doctor.findUnique({ where: { id } });
  if (!doctor) return null;
  return prisma.$transaction([
    prisma.doctor.delete({ where: { id } }),
    prisma.user.update({ where: { id: doctor.userId }, data: { isActive: false } })
  ]);
}
