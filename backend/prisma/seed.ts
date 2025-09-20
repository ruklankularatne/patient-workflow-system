import { PrismaClient, Role, AppointmentStatus, AuditAction } from '@prisma/client';
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
  'Dr. Sarah Johnson',
  'Dr. Michael Chen',
  'Dr. Emily Rodriguez',
  'Dr. David Thompson',
  'Dr. Jennifer Williams',
  'Dr. Robert Anderson'
];

const patientNames = [
  'John Smith',
  'Maria Garcia',
  'Robert Johnson',
  'Lisa Anderson',
  'James Wilson',
  'Patricia Brown',
  'Michael Davis',
  'Jennifer Martinez'
];

async function main() {
  console.log('🌱 Starting comprehensive seed process...');

  // Clear existing data in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleared existing data');

  const passwordHash = await bcrypt.hash('P@ssw0rd!', 10);

  // Core admin users
  const superadmin = await prisma.user.create({
    data: {
      fullName: 'System Administrator',
      email: 'superadmin@pws.example',
      passwordHash,
      role: Role.superadmin
    }
  });

  const admin = await prisma.user.create({
    data: {
      fullName: 'Hospital Administrator',
      email: 'admin@pws.example',
      passwordHash,
      role: Role.admin
    }
  });

  console.log('✅ Created admin users');

  // Patient users
  const patients = await Promise.all(
    patientNames.map((fullName, i) =>
      prisma.user.create({
        data: {
          fullName,
          email: `patient${i + 1}@email.com`,
          passwordHash,
          role: Role.patient
        }
      })
    )
  );

  console.log('✅ Created patient users');

  // Doctor users
  const doctorUsers = await Promise.all(
    doctorNames.map((fullName, i) =>
      prisma.user.create({
        data: {
          fullName,
          email: `doctor${i + 1}@pws.example`,
          passwordHash,
          role: Role.doctor
        }
      })
    )
  );

  // Doctor profiles
  const doctors = await Promise.all(
    doctorUsers.map((u, i) =>
      prisma.doctor.create({
        data: {
          userId: u.id,
          specialty: specialties[i % specialties.length],
          bio: 'Board-certified with 10+ years of experience providing evidence-based care.',
          location: cities[i % cities.length],
          profilePicture: doctorPics[i % doctorPics.length]
        }
      })
    )
  );

  console.log('✅ Created doctor users and profiles');

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

  console.log('✅ Created doctor schedules');

  // Create appointments for the next 5 weekdays
  const appointments = [];
  
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(start);
    date.setDate(start.getDate() + dayOffset);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Create 2-3 appointments per doctor per day
    for (let doctorIndex = 0; doctorIndex < doctors.length; doctorIndex++) {
      const doctor = doctors[doctorIndex];
      const appointmentsPerDay = 2 + (dayOffset % 2); // 2 or 3 appointments
      
      for (let appointmentIndex = 0; appointmentIndex < appointmentsPerDay; appointmentIndex++) {
        const hour = 9 + appointmentIndex * 2; // 9 AM, 11 AM, 1 PM
        const patientIndex = (doctorIndex * 3 + appointmentIndex) % patients.length;
        
        // Determine status based on day
        let status: AppointmentStatus;
        if (dayOffset <= 1) {
          status = AppointmentStatus.completed;
        } else if (dayOffset <= 3) {
          status = AppointmentStatus.confirmed;
        } else {
          status = AppointmentStatus.pending;
        }
        
        const appointment = await prisma.appointment.create({
          data: {
            doctorId: doctor.id,
            patientId: patients[patientIndex].id,
            date: localDate,
            startTime: `${hour.toString().padStart(2, '0')}:00`,
            endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
            status,
            notes: status === AppointmentStatus.completed 
              ? 'Follow-up appointment completed successfully' 
              : status === AppointmentStatus.confirmed
              ? 'Regular checkup scheduled'
              : 'Initial consultation requested',
          },
        });
        appointments.push(appointment);
      }
    }
  }

  console.log('✅ Created appointments');

  // Create medical records for completed appointments
  const completedAppointments = appointments.filter(apt => apt.status === AppointmentStatus.completed);
  
  for (const appointment of completedAppointments) {
    await prisma.medicalRecord.create({
      data: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        notes: 'Patient presented with routine health concerns. Vital signs normal. Blood pressure: 120/80. Heart rate: 72 bpm. Recommended follow-up in 6 months. Continue current medications.',
        attachments: [],
      },
    });
  }

  console.log('✅ Created medical records');

  // Create sample audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorUserId: superadmin.id,
        entity: 'User',
        entityId: superadmin.id,
        action: AuditAction.create,
        after: { role: 'superadmin', email: 'superadmin@pws.example' },
        ip: '127.0.0.1',
        userAgent: 'Seed Script',
        requestId: 'seed-001',
      },
      {
        actorUserId: admin.id,
        entity: 'Doctor',
        entityId: doctors[0].id,
        action: AuditAction.create,
        after: { specialty: specialties[0], location: cities[0] },
        ip: '127.0.0.1',
        userAgent: 'Seed Script',
        requestId: 'seed-002',
      },
    ],
  });

  console.log('✅ Created audit logs');

  // Print summary
  const userCount = await prisma.user.count();
  const doctorCount = await prisma.doctor.count();
  const appointmentCount = await prisma.appointment.count();
  const scheduleCount = await prisma.schedule.count();
  const medicalRecordCount = await prisma.medicalRecord.count();
  const auditLogCount = await prisma.auditLog.count();
  
  console.log('\n🎉 Comprehensive seed completed successfully!');
  console.log('📊 Summary:');
  console.log(`   Users: ${userCount} (1 superadmin, 1 admin, ${userCount - doctorCount - 2} patients, ${doctorCount} doctors)`);
  console.log(`   Doctors: ${doctorCount}`);
  console.log(`   Schedules: ${scheduleCount}`);
  console.log(`   Appointments: ${appointmentCount}`);
  console.log(`   Medical Records: ${medicalRecordCount}`);
  console.log(`   Audit Logs: ${auditLogCount}`);
  console.log('\n🔑 Login Credentials (all use P@ssw0rd!):');
  console.log('   Superadmin: superadmin@pws.example');
  console.log('   Admin: admin@pws.example');
  console.log('   Doctor: doctor1@pws.example (Dr. Sarah Johnson)');
  console.log('   Patient: patient1@email.com (John Smith)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
