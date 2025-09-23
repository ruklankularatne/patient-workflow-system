'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import { format, addDays, startOfWeek } from 'date-fns';

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  dayOfWeek: number;
  isAvailable: boolean;
  timeSlots: TimeSlot[];
}

const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { start: '09:00', end: '12:00' }, // Session 1
  { start: '14:00', end: '17:00' }  // Session 2
];

const SESSION_LABELS = ['Session 1', 'Session 2'];

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

interface DoctorScheduleManagerProps {
  doctorId?: string; // Optional prop for admin use
}

export default function DoctorScheduleManager({ doctorId }: DoctorScheduleManagerProps = {}) {
  const { user } = useAuth();
  // Use provided doctorId for admin mode, fallback to user's doctorId
  const targetDoctorId = doctorId || user?.doctorId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(
    Array.from({ length: 7 }, (_, index) => ({
      dayOfWeek: index,
      isAvailable: index >= 1 && index <= 5, // Monday to Friday by default
      timeSlots: [...DEFAULT_TIME_SLOTS]
    }))
  );
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [pendingUnavailableDates, setPendingUnavailableDates] = useState<string[]>([]);
  const [pendingRemovedDates, setPendingRemovedDates] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchDoctorSchedule();
  }, [targetDoctorId]);

  const fetchDoctorSchedule = async () => {
    if (!targetDoctorId) return;

    try {
      setLoading(true);
      // The backend returns Schedule[] not DoctorSchedule[], so we need to handle this correctly
      const response = await apiClient.getSchedules(targetDoctorId);
      if (response.success && response.data) {
        // Process the schedule data to populate weeklySchedule and unavailableDates
        const schedules = response.data;
        
        // Convert specific date schedules to weekly pattern and unavailable dates
        const unavailableDatesSet = new Set<string>();
        
        schedules.forEach((schedule: any) => {
          if (schedule.date) {
            // Convert the date to a readable format and add to unavailable dates
            const dateStr = format(new Date(schedule.date), 'yyyy-MM-dd');
            unavailableDatesSet.add(dateStr);
          }
        });

        setUnavailableDates(Array.from(unavailableDatesSet));
        
        // For now, keep the default weekly schedule since the backend doesn't store weekly patterns
        // In a real implementation, you might want to add a separate table for weekly patterns
      } else {
        console.log('No schedules found or response not successful');
      }
    } catch (error: any) {
      console.error('Failed to fetch schedule:', error);
      toast.error('Failed to fetch schedule');
    } finally {
      setLoading(false);
    }
  };

  const updateDayAvailability = async (dayOfWeek: number, isAvailable: boolean) => {
    // For now, just update the local state since the backend doesn't support weekly patterns
    // In a real implementation, you'd want to create/update specific date schedules
    try {
      const updatedSchedule = [...weeklySchedule];
      updatedSchedule[dayOfWeek] = {
        ...updatedSchedule[dayOfWeek],
        isAvailable
      };
      setWeeklySchedule(updatedSchedule);
      setHasUnsavedChanges(true);
      toast.success(`${DAYS_OF_WEEK[dayOfWeek]} availability updated`);
    } catch (error: any) {
      toast.error('Failed to update availability');
    }
  };

  const addTimeSlot = (dayOfWeek: number) => {
    const updatedSchedule = [...weeklySchedule];
    const newSlot: TimeSlot = { start: '18:00', end: '21:00' }; // Default session
    updatedSchedule[dayOfWeek] = {
      ...updatedSchedule[dayOfWeek],
      timeSlots: [...updatedSchedule[dayOfWeek].timeSlots, newSlot]
    };
    setWeeklySchedule(updatedSchedule);
    setHasUnsavedChanges(true);
    toast.success('New session added');
  };

  const removeTimeSlot = (dayOfWeek: number, slotIndex: number) => {
    if (weeklySchedule[dayOfWeek].timeSlots.length <= 1) {
      toast.error('At least one session is required');
      return;
    }

    const updatedSchedule = [...weeklySchedule];
    const updatedSlots = updatedSchedule[dayOfWeek].timeSlots.filter((_, index) => index !== slotIndex);
    updatedSchedule[dayOfWeek] = {
      ...updatedSchedule[dayOfWeek],
      timeSlots: updatedSlots
    };
    setWeeklySchedule(updatedSchedule);
    setHasUnsavedChanges(true);
    toast.success('Session removed');
  };

  const updateTimeSlot = async (dayOfWeek: number, slotIndex: number, field: 'start' | 'end', value: string) => {
    const updatedSchedule = [...weeklySchedule];
    const updatedSlots = [...updatedSchedule[dayOfWeek].timeSlots];
    updatedSlots[slotIndex] = {
      ...updatedSlots[slotIndex],
      [field]: value
    };
    updatedSchedule[dayOfWeek] = {
      ...updatedSchedule[dayOfWeek],
      timeSlots: updatedSlots
    };
    setWeeklySchedule(updatedSchedule);
    setHasUnsavedChanges(true);

    // For now, just update local state since weekly patterns aren't supported in backend
    toast.success('Time slot updated');
  };

  const addUnavailableDate = async (date: string) => {
    if (!targetDoctorId) {
      toast.error('Doctor ID not found');
      return;
    }

    // Add to pending changes instead of immediately saving
    if (!unavailableDates.includes(date) && !pendingUnavailableDates.includes(date)) {
      setPendingUnavailableDates(prev => [...prev, date]);
      // Remove from pending removed dates if it was there
      setPendingRemovedDates(prev => prev.filter(d => d !== date));
      setHasUnsavedChanges(true);
      toast.success('Date marked as unavailable (pending save)');
    }
  };

  const removeUnavailableDate = async (date: string) => {
    if (!targetDoctorId) {
      toast.error('Doctor ID not found');
      return;
    }

    // Add to pending removals instead of immediately deleting
    if (unavailableDates.includes(date)) {
      setPendingRemovedDates(prev => [...prev, date]);
      // Remove from pending additions if it was there
      setPendingUnavailableDates(prev => prev.filter(d => d !== date));
      setHasUnsavedChanges(true);
      toast.success('Date marked as available (pending save)');
    } else if (pendingUnavailableDates.includes(date)) {
      // If it's only in pending additions, just remove it from there
      setPendingUnavailableDates(prev => prev.filter(d => d !== date));
      setHasUnsavedChanges(pendingUnavailableDates.length > 1 || pendingRemovedDates.length > 0);
    }
  };

  const saveAllChanges = async () => {
    if (!targetDoctorId) {
      toast.error('Doctor ID not found');
      return;
    }

    try {
      setLoading(true);
      let hasErrors = false;

      // First, save weekly schedule patterns by creating schedule records for the current month
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), Math.max(today.getDate(), 1)); // Start from today or beginning of month
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      // Clear existing weekly schedules for this month (but not specific unavailable dates)
      try {
        const existingSchedules = await apiClient.getSchedules(targetDoctorId);
        if (existingSchedules.success && existingSchedules.data) {
          for (const schedule of existingSchedules.data) {
            const scheduleDate = new Date(schedule.date);
            // Only delete schedules that are weekly patterns (not unavailable blocks) and within the date range
            if (scheduleDate >= startOfMonth && 
                scheduleDate <= endOfMonth && 
                schedule.isAvailable === true) {
              try {
                await apiClient.deleteSchedule(schedule.id);
                console.log('Deleted existing schedule:', schedule.id, format(scheduleDate, 'yyyy-MM-dd'));
              } catch (deleteError) {
                console.error('Error deleting schedule:', schedule.id, deleteError);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error clearing existing weekly schedules:', error);
        toast.error('Warning: Could not clear some existing schedules');
      }

      // Create new weekly schedule records for each day of the month
      const schedulesToCreate: Array<{
        doctorId: string;
        date: string;
        startTime: string;
        endTime: string;
        isAvailable: boolean;
      }> = [];

      for (let date = new Date(startOfMonth); date <= endOfMonth; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daySchedule = weeklySchedule[dayOfWeek];
        
        if (daySchedule.isAvailable && daySchedule.timeSlots.length > 0) {
          // Add schedule records for each time slot to the batch
          for (const timeSlot of daySchedule.timeSlots) {
            const dateString = format(date, 'yyyy-MM-dd');
            
            // Check if we already have this combination to prevent duplicates
            const duplicate = schedulesToCreate.find(s => 
              s.date === dateString && 
              s.startTime === timeSlot.start &&    // Fix: use .start instead of .startTime
              s.endTime === timeSlot.end           // Fix: use .end instead of .endTime
            );
            
            if (!duplicate) {
              schedulesToCreate.push({
                doctorId: targetDoctorId,
                date: dateString,
                startTime: timeSlot.start,  // Fix: use .start instead of .startTime
                endTime: timeSlot.end,      // Fix: use .end instead of .endTime
                isAvailable: true
              });
            }
          }
        }
      }

      console.log(`Creating ${schedulesToCreate.length} schedule records from ${format(startOfMonth, 'yyyy-MM-dd')} to ${format(endOfMonth, 'yyyy-MM-dd')}`);

        // Create schedules in smaller batches to avoid overwhelming the server
        const batchSize = 3; // Reduced batch size
        for (let i = 0; i < schedulesToCreate.length; i += batchSize) {
          const batch = schedulesToCreate.slice(i, i + batchSize);
          
          try {
            // Create schedules in this batch with a small delay
            for (const scheduleData of batch) {
              try {
                console.log('=== SENDING SCHEDULE DATA ===');
                console.log('Schedule data being sent:', JSON.stringify(scheduleData, null, 2));
                console.log('startTime type:', typeof scheduleData.startTime, 'value:', scheduleData.startTime);
                console.log('endTime type:', typeof scheduleData.endTime, 'value:', scheduleData.endTime);
                
                const response = await apiClient.createSchedule(scheduleData);
                if (!response.success) {
                  console.error('Failed to create weekly schedule for', scheduleData.date, scheduleData);
                  toast.error(`Failed to create schedule for ${scheduleData.date}`);
                  hasErrors = true;
                }
              } catch (error: any) {
                console.error(`Error creating schedule for ${scheduleData.date}:`, error);
                toast.error(`Error creating schedule for ${scheduleData.date}: ${error.message}`);
                hasErrors = true;
              }
            }          // Small delay between batches to prevent overwhelming the server
          if (i + batchSize < schedulesToCreate.length) {
            await new Promise(resolve => setTimeout(resolve, 200)); // Increased delay
          }
        } catch (error: any) {
          console.error(`Error creating batch of weekly schedules:`, error);
          hasErrors = true;
        }
      }

      // Process pending additions (specific unavailable dates)
      for (const date of pendingUnavailableDates) {
        try {
          const scheduleData = {
            doctorId: targetDoctorId,
            date: date,
            startTime: '00:00',
            endTime: '23:59',
            isAvailable: false
          };

          const response = await apiClient.createSchedule(scheduleData);
          
          if (!response.success) {
            throw new Error('Failed to create schedule');
          }
        } catch (error: any) {
          console.error(`Error adding unavailable date ${date}:`, error);
          toast.error(`Failed to add unavailable date ${date}`);
          hasErrors = true;
        }
      }

      // Process pending removals
      for (const date of pendingRemovedDates) {
        try {
          // Find the schedule ID for this date
          const response = await apiClient.getSchedules(targetDoctorId);
          
          if (response.success && response.data) {
            const schedule = response.data.find((s: any) => {
              const scheduleDate = format(new Date(s.date), 'yyyy-MM-dd');
              return scheduleDate === date;
            });
            
            if (schedule) {
              const deleteResponse = await apiClient.deleteSchedule(schedule.id);
              
              if (deleteResponse.success === false) {
                throw new Error('Failed to delete schedule');
              }
            }
          }
        } catch (error: any) {
          console.error(`Error removing unavailable date ${date}:`, error);
          toast.error(`Failed to remove unavailable date ${date}`);
          hasErrors = true;
        }
      }

      if (!hasErrors) {
        // Update the actual unavailable dates
        setUnavailableDates(prev => {
          const updated = [...prev];
          // Add pending additions
          pendingUnavailableDates.forEach(date => {
            if (!updated.includes(date)) {
              updated.push(date);
            }
          });
          // Remove pending removals
          return updated.filter(date => !pendingRemovedDates.includes(date));
        });

        // Clear pending changes
        setPendingUnavailableDates([]);
        setPendingRemovedDates([]);
        setHasUnsavedChanges(false);
        
        toast.success('Weekly schedule and unavailable dates saved successfully');
      } else {
        toast.error('Some changes could not be saved. Please try again.');
      }
    } catch (error: any) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const cancelChanges = () => {
    setPendingUnavailableDates([]);
    setPendingRemovedDates([]);
    setHasUnsavedChanges(false);
    toast.success('All pending changes cancelled');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Schedule Management</h2>
        {hasUnsavedChanges && (
          <div className="flex items-center gap-4">
            <span className="text-amber-600 text-sm font-medium">
              You have unsaved changes
            </span>
            <div className="flex gap-2">
              <button
                onClick={cancelChanges}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
              >
                Cancel Changes
              </button>
              <button
                onClick={saveAllChanges}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Availability</h3>
        
        <div className="space-y-4">
          {weeklySchedule.map((daySchedule, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-start space-x-4">
                <div className="w-28">
                  <span className="font-medium text-gray-900">{DAYS_OF_WEEK[index]}</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={daySchedule.isAvailable}
                      onChange={(e) => updateDayAvailability(index, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Available</span>
                  </label>
                </div>
              </div>

              {daySchedule.isAvailable && (
                <div className="mt-4 space-y-3">
                  {daySchedule.timeSlots.map((slot, slotIndex) => (
                    <div key={slotIndex} className="flex items-center space-x-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <span className="text-sm font-medium text-blue-700 min-w-[140px]">
                        {SESSION_LABELS[slotIndex] || `Session ${slotIndex + 1}`}:
                      </span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) => updateTimeSlot(index, slotIndex, 'start', e.target.value)}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-gray-500 font-medium">to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => updateTimeSlot(index, slotIndex, 'end', e.target.value)}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {daySchedule.timeSlots.length > 1 && (
                        <button
                          onClick={() => removeTimeSlot(index, slotIndex)}
                          className="text-red-600 hover:text-red-800 transition-colors text-sm font-medium"
                          title="Remove this session"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <div className="flex justify-start">
                    <button
                      onClick={() => addTimeSlot(index)}
                      className="text-blue-600 hover:text-blue-800 transition-colors text-sm font-medium flex items-center space-x-1"
                    >
                      <span>+</span>
                      <span>Add Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Specific Unavailable Dates */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Specific Unavailable Dates</h3>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="date"
              min={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => {
                if (e.target.value && !unavailableDates.includes(e.target.value)) {
                  addUnavailableDate(e.target.value);
                  e.target.value = '';
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Select date to mark unavailable"
            />
          </div>

          {(unavailableDates.length > 0 || pendingUnavailableDates.length > 0) ? (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Unavailable Dates:</h4>
              <div className="flex flex-wrap gap-2">
                {/* Existing unavailable dates */}
                {unavailableDates.filter(date => !pendingRemovedDates.includes(date)).map((date) => (
                  <div key={`existing-${date}`} className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-red-800">{format(new Date(date), 'MMM d, yyyy')}</span>
                    <button
                      onClick={() => removeUnavailableDate(date)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                
                {/* Pending additions */}
                {pendingUnavailableDates.map((date) => (
                  <div key={`pending-${date}`} className="flex items-center space-x-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-amber-800">{format(new Date(date), 'MMM d, yyyy')} (pending)</span>
                    <button
                      onClick={() => removeUnavailableDate(date)}
                      className="text-amber-600 hover:text-amber-800 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                
                {/* Dates marked for removal */}
                {pendingRemovedDates.map((date) => (
                  <div key={`removing-${date}`} className="flex items-center space-x-2 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 opacity-50">
                    <span className="text-sm text-gray-600 line-through">{format(new Date(date), 'MMM d, yyyy')} (removing)</span>
                    <button
                      onClick={() => {
                        // Remove from pending removals to restore
                        setPendingRemovedDates(prev => prev.filter(d => d !== date));
                        setHasUnsavedChanges(pendingUnavailableDates.length > 0 || pendingRemovedDates.length > 1);
                      }}
                      className="text-green-600 hover:text-green-800 transition-colors"
                      title="Restore this date"
                    >
                      ↶
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No specific unavailable dates set.</p>
          )}
        </div>
      </div>
    </div>
  );
}