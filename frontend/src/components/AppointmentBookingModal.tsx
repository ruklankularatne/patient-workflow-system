'use client';

import { useState, useEffect } from 'react';
import { Doctor, Schedule, AppointmentRequest, Appointment } from '@/types';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useSlotAvailability } from '@/hooks/useWebSocket';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import BookingConfirmation from './BookingConfirmation';
import { generateTimeSlots } from '@/utils/timeSlots';

interface AppointmentBookingModalProps {
  doctor: Doctor;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedDate?: string; // YYYY-MM-DD format
  preselectedTime?: string; // HH:mm format
}

export default function AppointmentBookingModal({
  doctor,
  isOpen,
  onClose,
  onSuccess,
  preselectedDate,
  preselectedTime,
}: AppointmentBookingModalProps) {
  const { user } = useAuth();
  const { getSlotAvailability, subscribeToDoctor, isConnected } = useSlotAvailability(user?.id);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<Schedule[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isPreselected, setIsPreselected] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<any>(null);

  // Generate dates for appointment booking (rest of current month)
  const availableDates = Array.from({ length: 31 }, (_, i) => {
    const today = new Date();
    const date = addDays(today, i + 1); // Start from tomorrow
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
    
    if (date <= endOfMonth) {
      return format(date, 'yyyy-MM-dd');
    }
    return null;
  }).filter(Boolean) as string[];

  // Generate time slots based on available schedules for selected date
  const getAvailableTimeSlots = () => {
    if (!selectedDate) return [];
    
    const scheduleForDate = availableSlots.find(slot => {
      const scheduleDate = new Date(slot.date).toISOString().split('T')[0];
      return scheduleDate === selectedDate && slot.isAvailable === true;
    });
    if (!scheduleForDate) return [];
    
    return generateTimeSlots(scheduleForDate.startTime, scheduleForDate.endTime);
  };

  const timeSlots = getAvailableTimeSlots();

  // Handle preselected values
  useEffect(() => {
    if (preselectedDate && preselectedTime) {
      setSelectedDate(preselectedDate);
      setSelectedTime(preselectedTime);
      setIsPreselected(true);
    }
  }, [preselectedDate, preselectedTime]);

  // Subscribe to real-time updates for this doctor
  useEffect(() => {
    if (doctor.id) {
      subscribeToDoctor(doctor.id);
    }
  }, [doctor.id, subscribeToDoctor]);

  useEffect(() => {
    if (selectedDate && doctor.id && !isPreselected) {
      fetchAvailableSlots();
    }
  }, [selectedDate, doctor.id, isPreselected]);

  const fetchAvailableSlots = async () => {
    try {
      setLoading(true);
      
      // Fetch both schedules and appointments for the doctor
      const [schedulesResponse, appointmentsResponse] = await Promise.all([
        apiClient.getSchedules(doctor.id),
        apiClient.getAppointments({ doctorId: doctor.id })
      ]);
      
      if (schedulesResponse.success && schedulesResponse.data) {
        // Get ALL schedules for the selected date (both available and unavailable)
        const daySchedules = schedulesResponse.data.filter(
          schedule => {
            const scheduleDate = new Date(schedule.date).toISOString().split('T')[0];
            return scheduleDate === selectedDate;
          }
        );
        setAvailableSlots(daySchedules);
      }
      
      if (appointmentsResponse.success && appointmentsResponse.data) {
        setExistingAppointments(appointmentsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load available time slots');
    } finally {
      setLoading(false);
    }
  };

  const isTimeSlotAvailable = (time: string) => {
    // First check real-time WebSocket updates
    const realTimeAvailability = getSlotAvailability(doctor.id, selectedDate, time);
    if (realTimeAvailability !== null) {
      return realTimeAvailability;
    }
    
    // Check if there's an unavailable block that covers this time
    const unavailableBlock = availableSlots.find(schedule => {
      const scheduleDate = new Date(schedule.date).toISOString().split('T')[0];
      if (scheduleDate !== selectedDate || schedule.isAvailable !== false) {
        return false;
      }
      
      // Check if this time falls within the unavailable block
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);
      const [timeHour, timeMin] = time.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const timeMinutes = timeHour * 60 + timeMin;
      
      return timeMinutes >= startMinutes && timeMinutes < endMinutes;
    });
    
    if (unavailableBlock) {
      return false; // Time slot is within an unavailable block
    }
    
    // Check if there's an available schedule that includes this time
    const availableSchedule = availableSlots.find(schedule => {
      const scheduleDate = new Date(schedule.date).toISOString().split('T')[0];
      return scheduleDate === selectedDate && schedule.isAvailable === true;
    });
    
    if (!availableSchedule) {
      return false; // No available schedule for this date
    }
    
    // Generate time slots for the available schedule
    const timeSlots = generateTimeSlots(availableSchedule.startTime, availableSchedule.endTime);
    if (!timeSlots.includes(time)) {
      return false; // Time is outside the available schedule
    }
    
    // Check if this time slot has an existing appointment
    const hasAppointment = existingAppointments.some(appointment => {
      const appointmentDate = new Date(appointment.date).toISOString().split('T')[0];
      return appointment.doctorId === doctor.id &&
        appointmentDate === selectedDate &&
        appointment.startTime === time &&
        appointment.status !== 'cancelled';
    });
    
    return !hasAppointment;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }
    
    if (!user?.id) {
      toast.error('You must be logged in to book an appointment');
      return;
    }

    const appointmentData: AppointmentRequest = {
      patientId: user.id,
      doctorId: doctor.id,
      date: selectedDate,
      time: selectedTime,
      notes: notes.trim() || undefined
    };

    try {
      setSubmitting(true);
      const response = await apiClient.createAppointment(appointmentData);
      
      if (response.success) {
        // Show confirmation modal instead of just toast
        setConfirmedAppointment({
          id: response.data?.id || 'N/A',
          date: selectedDate,
          time: selectedTime,
          doctorName: doctor.user.fullName,
          specialty: doctor.specialty,
          notes: notes.trim() || undefined
        });
        
        setShowConfirmation(true);
        onSuccess();
        onClose();
        resetForm();
      } else {
        toast.error(response.message || 'Failed to book appointment');
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedDate('');
    setSelectedTime('');
    setNotes('');
    setAvailableSlots([]);
  };

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">
                Book Appointment
              </h2>
              {/* Real-time connection indicator */}
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-xs text-gray-500">
                  {isConnected ? 'Live updates' : 'Offline'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Doctor Info */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Dr. {doctor.user.fullName}</h3>
              <p className="text-blue-600">{doctor.specialty}</p>
              <p className="text-gray-500 text-sm">{doctor.location}</p>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {isPreselected ? (
            /* Confirmation View for Preselected Slots */
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Confirm Appointment Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium text-gray-900">{formatDateDisplay(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium text-gray-900">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium text-gray-900">30 minutes</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <button
                  type="button"
                  onClick={() => {
                    setIsPreselected(false);
                    setSelectedDate('');
                    setSelectedTime('');
                  }}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Change date/time
                </button>
              </div>
            </div>
          ) : (
            /* Full Selection View */
            <>
              {/* Date Selection */}
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-3">
                  Select Date
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableDates.map((date) => (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelectedDate(date)}
                      className={`p-3 text-left rounded-lg border transition-colors ${
                        selectedDate === date
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {formatDateDisplay(date)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-3">
                    Select Time
                  </span>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {timeSlots.map((time) => {
                        const available = isTimeSlotAvailable(time);
                        const isSelected = selectedTime === time;
                        const buttonClass = !available
                          ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                          : isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300';
                        
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setSelectedTime(time)}
                            disabled={!available}
                            className={`p-2 text-sm rounded border transition-colors ${buttonClass}`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {selectedDate && availableSlots.length === 0 && !loading && (
                    <p className="text-sm text-gray-500 mt-2">
                      No available slots for this date. Please select another date.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any symptoms, concerns, or special requests..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedDate || !selectedTime || submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Booking...' : 'Book Appointment'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Booking Confirmation Modal */}
      <BookingConfirmation
        appointment={confirmedAppointment}
        isVisible={showConfirmation}
        onClose={() => setShowConfirmation(false)}
      />
    </div>
  );
}