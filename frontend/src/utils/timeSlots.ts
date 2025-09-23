export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  appointmentId?: string;
}

export interface ScheduleWithSlots {
  id: string;
  date: Date;
  doctorId: string;
  doctor: {
    id: string;
    user: {
      fullName: string;
    };
    specialty: string;
  };
  timeSlots: TimeSlot[];
}

/**
 * Generate 30-minute time slots from a time range
 */
export function generateTimeSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  
  for (let minutes = start; minutes < end; minutes += 30) {
    slots.push(minutesToTime(minutes));
  }
  
  return slots;
}

/**
 * Convert time string (HH:mm) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:mm)
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Process schedule data into 30-minute slots with availability
 * Groups schedules by doctor and date to avoid duplicate cards
 */
export function processScheduleIntoSlots(
  schedules: any[],
  appointments: any[] = []
): ScheduleWithSlots[] {
  // Group schedules by doctor and date
  const groupedSchedules = new Map<string, {
    doctorId: string;
    date: string;
    doctor: any;
    schedules: any[];
  }>();

  schedules.forEach(schedule => {
    const key = `${schedule.doctorId}-${schedule.date}`;
    
    if (!groupedSchedules.has(key)) {
      groupedSchedules.set(key, {
        doctorId: schedule.doctorId,
        date: schedule.date,
        doctor: schedule.doctor,
        schedules: []
      });
    }
    
    groupedSchedules.get(key)!.schedules.push(schedule);
  });

  // Process each grouped schedule
  return Array.from(groupedSchedules.values()).map(group => {
    const allTimeSlots: TimeSlot[] = [];
    
    // Generate time slots for each schedule in the group
    group.schedules.forEach(schedule => {
      const timeSlots = generateTimeSlots(schedule.startTime, schedule.endTime);
      
      timeSlots.forEach(startTime => {
        const endTime = minutesToTime(timeToMinutes(startTime) + 30);
        
        // Check if this slot has an appointment
        const appointment = appointments.find(apt => 
          apt.doctorId === schedule.doctorId &&
          apt.date === schedule.date &&
          apt.startTime === startTime
        );
        
        allTimeSlots.push({
          startTime,
          endTime,
          isAvailable: !appointment,
          appointmentId: appointment?.id
        });
      });
    });

    // Sort time slots by start time and remove duplicates
    const uniqueTimeSlots = allTimeSlots
      .filter((slot, index, array) => 
        array.findIndex(s => s.startTime === slot.startTime) === index
      )
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    // Use the first schedule's ID for the combined schedule
    const firstSchedule = group.schedules[0];
    
    return {
      id: firstSchedule.id,
      date: new Date(group.date),
      doctorId: group.doctorId,
      doctor: group.doctor,
      timeSlots: uniqueTimeSlots
    };
  });
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format time for display
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}