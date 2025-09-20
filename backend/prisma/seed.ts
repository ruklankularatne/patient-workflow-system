import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const specialties = [
  'Family Medicine','Internal Medicine','Pediatrics','Cardiology',
  'Dermatology','Orthopedics','Neurology','Psychiatry'
];

const cities = [
  'New York, NY','Los Angeles, CA','Chicago, IL','Houston, TX','Phoenix, AZ',
  'Philadelphia, PA','San Antonio, TX','San Diego, CA','Dallas, TX','San Jose, CA'
];

const doctorPics = [
  'https://placehold.co/192x192?text=Dr+1',
  'https://placehold.co/192x192?text=Dr+2',
  'https://placehold.co/192x192?text=Dr+3',
  'https://placehold.co/192x192?text=Dr+4',
  'https://placehold.co/192x192?text=Dr+5',
  'https://placehold.co/192x192?text=Dr+6'
];

const doctorNames = [
  'Dr. Avery Smith',
  'Dr. Jordan Johnson',
  'Dr. Taylor Miller',
  'Dr. Morgan Davis',
  'Dr. Reese Clark',
  'Dr. Hayden Lopez'
];

async function main() {
  const passwordHash = await bcrypt.hash('P@ssw0rd!', 10);

  // Core users
  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@pws.example' },
    update: {},
    create: {
      fullName: 'Super Admin',
      email: 'superadmin@pws.example',
      passwordHash,
      role: 'superadmin'
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@pws.example' },
    update: {},
    create: {
      fullName: 'Clinic Admin',
      email: 'admin@pws.example',
      passwordHash,
      role: 'admin'
    }
  });

  const patient = await prisma.user.upsert({
    where: { email: 'john.patient@pws.example' },
    update: {},
    create: {
      fullName: 'John Patient',
      email: 'john.patient@pws.example',
      passwordHash,
      role: 'patient'
    }
  });

  // Doctor users
  const doctorUsers = await Promise.all(
    doctorNames.map((fullName, i) =>
      prisma.user.upsert({
        where: { email: `doctor${i + 1}@pws.example` },
        update: {},
        create: {
          fullName,
          email: `doctor${i + 1}@pws.example`,
          passwordHash,
          role: 'doctor'
        }
      })
    )
  );

  // Doctor profiles (note: NO fullName here)
  const doctors = await Promise.all(
    doctorUsers.map((u, i) =>
      prisma.doctor.upsert({
        where: { userId: u.id },
        update: {},
        create: {
          userId: u.id,
          specialty: specialties[i % specialties.length],
          bio: 'Board-certified with 10+ years of experience providing evidence-based care.',
          location: cities[i % cities.length],
          profilePicture: doctorPics[i % doctorPics.length]
        }
      })
    )
  );

  // Schedules: Mon–Fri for next 14 days (09:00–12:00 and 14:00–17:00)
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  for (const d of doctors) {
    for (let offset = 0; offset < 14; offset++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + offset);
      const day = dt.getDay(); // 0=Sun … 6=Sat
      if (day === 0 || day === 6) continue;

      // Make an exact local date @ 00:00:00 to store into DateTime
      const localMidnight = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());

      await prisma.schedule.createMany({
        data: [
          { doctorId: d.id, date: localMidnight, startTime: '09:00', endTime: '12:00' },
          { doctorId: d.id, date: localMidnight, startTime: '14:00', endTime: '17:00' }
        ],
        skipDuplicates: true
      });
    }
  }

  console.log('Seed complete:', {
    superadmin: superadmin.email,
    admin: admin.email,
    patient: patient.email,
    doctors: doctors.length
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
