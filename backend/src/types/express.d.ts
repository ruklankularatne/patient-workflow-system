import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: {
        id: string;
        email: string;
        fullName: string;
        role: Role;
        doctorId?: string;
      };
      doctorId?: string;
    }
  }
}

export {};