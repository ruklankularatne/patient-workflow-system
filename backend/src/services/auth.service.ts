import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

export async function createUser(opts: {
  email: string; fullName: string; password: string; role?: Role;
}) {
  const passwordHash = await bcrypt.hash(opts.password, 12);
  return prisma.user.create({
    data: {
      email: opts.email,
      passwordHash,
      fullName: opts.fullName,
      role: opts.role ?? 'patient'
    }
  });
}

export async function verifyUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return user;
}
