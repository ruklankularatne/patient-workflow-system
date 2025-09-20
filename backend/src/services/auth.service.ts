import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function createUser(opts: {
  email: string;
  fullName: string;
  password: string;
  role: keyof typeof Role | 'superadmin' | 'admin' | 'doctor' | 'patient';
}) {
  const passwordHash = await bcrypt.hash(opts.password, 12);
  return prisma.user.create({
    data: {
      email: opts.email,
      fullName: opts.fullName,
      passwordHash,
      role: opts.role as any
    }
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function validatePassword(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  return bcrypt.compare(password, user.passwordHash);
}
