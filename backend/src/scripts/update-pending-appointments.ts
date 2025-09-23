import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import path from 'path';

const prisma = new PrismaClient();

/**
 * Update all pending appointments to confirmed status
 * This is part of the simplified appointment workflow implementation
 */
async function updatePendingAppointments() {
  try {
    console.log('Starting update of pending appointments...');
    
    // Find all pending appointments
    const pendingAppointments = await prisma.appointment.findMany({
      where: {
        status: 'pending'
      }
    });
    
    console.log(`Found ${pendingAppointments.length} pending appointments`);
    
    if (pendingAppointments.length === 0) {
      console.log('No pending appointments to update');
      return;
    }
    
    // Update all pending appointments to confirmed
    const result = await prisma.appointment.updateMany({
      where: {
        status: 'pending'
      },
      data: {
        status: 'confirmed'
      }
    });
    
    console.log(`Successfully updated ${result.count} appointments from pending to confirmed`);
    
  } catch (error) {
    console.error('Error updating pending appointments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update immediately
updatePendingAppointments();

export { updatePendingAppointments };