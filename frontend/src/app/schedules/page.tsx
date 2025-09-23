'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { processScheduleIntoSlots, formatDate, formatTime, ScheduleWithSlots } from '@/utils/timeSlots';
import AppointmentBookingModal from '@/components/AppointmentBookingModal';
import DoctorScheduleManager from '@/components/DoctorScheduleManager';
import toast from 'react-hot-toast';

interface Schedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  doctorId: string;
  doctor: {
    id: string;
    user: { fullName: string };
    specialty: string;
  };
}

export default function SchedulesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [schedules, setSchedules] = useState<ScheduleWithSlots[]>([]);
  const [loading, setLoading] = useState(false); // Changed to false initially
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // Added search query
  const [hasSearched, setHasSearched] = useState(false); // Track if user has searched
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [preselectedDate, setPreselectedDate] = useState<string>('');
  const [preselectedTime, setPreselectedTime] = useState<string>('');
  const [selectedDoctorForManagement, setSelectedDoctorForManagement] = useState<any>(null);
  
  // Check if user is admin for conditional UI
  const isAdminMode = user && (user.role === 'admin' || user.role === 'superadmin');

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket({
    onAppointmentCreated: (data) => {
      toast(`New appointment booked for ${data.startTime}`, { 
        icon: 'CONFIRMED',
        duration: 4000,
        style: {
          background: '#10B981',
          color: 'white',
        }
      });
      // Refresh schedules to show updated availability
      if (hasSearched) {
        fetchData();
      }
    },
    onAppointmentCancelled: (data) => {
      toast(`Appointment cancelled - ${data.startTime} slot now available!`, {
        icon: '🆓',
        duration: 4000,
        style: {
          background: '#F59E0B',
          color: 'white',
        }
      });
      // Refresh schedules to show updated availability
      if (hasSearched) {
        fetchData();
      }
    },
    userId: user?.id
  });

  const specialties = [
    'All Specialties',
    'Family Medicine',
    'Internal Medicine', 
    'Pediatrics',
    'Cardiology',
    'Dermatology',
    'Orthopedics'
  ];

  const fetchData = async () => {
    // Only fetch if user has provided search criteria
    if (!selectedDate && !selectedSpecialty && !searchQuery.trim()) {
      setSchedules([]);
      setHasSearched(false);
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      
      // Set date range limits for patient safety (2 weeks ahead)
      const today = new Date();
      const twoWeeksFromNow = new Date(today);
      twoWeeksFromNow.setDate(today.getDate() + 14);
      
      // Fetch schedules with date range and availability filtering
      const scheduleResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}/schedules?` +
        `startDate=${today.toISOString()}&endDate=${twoWeeksFromNow.toISOString()}&onlyAvailable=true`, 
        {
          credentials: 'include'
        }
      );
      
      if (!scheduleResponse.ok) {
        throw new Error('Failed to fetch schedules');
      }
      
      const scheduleData = await scheduleResponse.json();
      let scheduleList: Schedule[] = scheduleData.success ? scheduleData.data : scheduleData;
      
      // Fetch appointments to check availability (still needed for display)
      const appointmentResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}/appointments`, {
        credentials: 'include'
      });
      
      let appointments: any[] = [];
      if (appointmentResponse.ok) {
        const appointmentData = await appointmentResponse.json();
        appointments = appointmentData.success ? appointmentData.data : appointmentData;
      }
      
      // Filter schedules based on selected filters
      if (selectedDate) {
        const filterDate = new Date(selectedDate).toISOString().split('T')[0];
        scheduleList = scheduleList.filter(schedule => 
          new Date(schedule.date).toISOString().split('T')[0] === filterDate
        );
      }
      
      if (selectedSpecialty && selectedSpecialty !== 'All Specialties') {
        scheduleList = scheduleList.filter(schedule => 
          schedule.doctor.specialty === selectedSpecialty
        );
      }

      // Filter by doctor name search
      if (searchQuery.trim()) {
        scheduleList = scheduleList.filter(schedule =>
          schedule.doctor.user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Process into time slots
      const processedSchedules = processScheduleIntoSlots(scheduleList, appointments);
      
      // Sort by date and doctor name
      processedSchedules.sort((a, b) => {
        const dateCompare = a.date.getTime() - b.date.getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.doctor.user.fullName.localeCompare(b.doctor.user.fullName);
      });
      
      setSchedules(processedSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load schedules');
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search effect with better handling for date input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Only fetch if we have valid search criteria or a complete date
      if (selectedDate || selectedSpecialty || searchQuery.trim()) {
        fetchData();
      }
    }, 600); // Longer delay to prevent interruption while typing

    return () => clearTimeout(timeoutId);
  }, [selectedDate, selectedSpecialty, searchQuery]);

  // Handle pending booking after login
  useEffect(() => {
    if (user && user.role === 'patient') {
      const pendingBooking = sessionStorage.getItem('pendingBooking');
      if (pendingBooking) {
        try {
          const booking = JSON.parse(pendingBooking);
          // Clear the pending booking
          sessionStorage.removeItem('pendingBooking');
          
          // Show notification about the pending booking
          toast.success(`Welcome back! You can now book an appointment with Dr. ${booking.doctorName} at ${booking.timeSlot}`, {
            duration: 4000
          });
          
          // Optionally auto-trigger the booking modal
          // You could find the doctor and auto-open the booking modal here
        } catch (error) {
          console.error('Error processing pending booking:', error);
          sessionStorage.removeItem('pendingBooking');
        }
      }
    }
  }, [user]);

  const handleBookSlot = (doctor: any, timeSlot: string, date: Date) => {
    // Check if user is logged in
    if (!user) {
      // Show confirmation dialog and redirect to login
      const shouldLogin = window.confirm(
        'You need to be logged in to book an appointment. Would you like to go to the login page?'
      );
      
      if (shouldLogin) {
        // Store the intended booking details in sessionStorage for after login
        sessionStorage.setItem('pendingBooking', JSON.stringify({
          doctorId: doctor.id,
          doctorName: doctor.user.fullName,
          timeSlot,
          date: date.toISOString()
        }));
        
        // Redirect to login with return URL
        router.push(`/login?returnTo=${encodeURIComponent('/schedules')}`);
      }
      return;
    }
    
    // Check if user is a patient
    if (user.role !== 'patient') {
      toast.error('Only patients can book appointments');
      return;
    }

    // Proceed with booking
    const formattedDate = date.toISOString().split('T')[0]; // Convert Date to YYYY-MM-DD format
    setSelectedDoctor(doctor);
    setPreselectedDate(formattedDate);
    setPreselectedTime(timeSlot);
    setIsBookingModalOpen(true);
  };

  const handleBookingSuccess = () => {
    toast.success('Appointment booked successfully!');
    fetchData(); // Refresh the data
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isAdminMode ? 'Doctor Schedule Management' : 'Doctor Schedules'}
            </h1>
            <p className="text-gray-600">
              {isAdminMode 
                ? 'Manage doctor availability and schedule administration'
                : 'Browse available appointment slots and book your preferred time'
              }
            </p>
          </div>
          {/* Real-time connection status */}
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-gray-600">
              {isConnected ? 'Live updates active' : 'Offline mode'}
            </span>
          </div>
        </div>

        {!user && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-blue-800 font-medium">
                  Please <button 
                    onClick={() => router.push('/login')}
                    className="text-blue-600 underline hover:text-blue-800 font-semibold"
                  >
                    log in
                  </button> to book appointments
                </p>
                <p className="text-blue-600 text-sm">
                  You can browse available slots below, but booking requires a patient account.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-2">
              Specialty
            </label>
            <select
              id="specialty"
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Specialties</option>
              {specialties.slice(1).map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Doctor
            </label>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter doctor's name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Use the filters above to search for available appointment slots
          </p>
          {(selectedDate || selectedSpecialty || searchQuery.trim()) && (
            <button
              onClick={() => {
                setSelectedDate('');
                setSelectedSpecialty('');
                setSearchQuery('');
                setHasSearched(false);
                setSchedules([]);
              }}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Schedules */}
      <div className="space-y-6">
        {schedules.map((schedule) => (
          <div key={schedule.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Dr. {schedule.doctor.user.fullName}
                  </h3>
                  <p className="text-blue-600 font-medium">{schedule.doctor.specialty}</p>
                  <p className="text-gray-500">{formatDate(schedule.date)}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Available Slots</div>
                    <div className="text-2xl font-bold text-green-600">
                      {schedule.timeSlots.filter(slot => slot.isAvailable).length}
                    </div>
                  </div>
                  {/* Admin Controls */}
                  {isAdminMode && (
                    <div className="ml-4">
                      <button
                        onClick={() => setSelectedDoctorForManagement(schedule.doctor)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        Manage
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {schedule.timeSlots.map((slot) => {
                  const getSlotStatus = () => {
                    if (!slot.isAvailable) return isAdminMode ? 'Unavailable' : 'Booked';
                    if (isAdminMode) return 'Available';
                    if (!user) return 'Login to Book';
                    if (user.role !== 'patient') return 'Patients Only';
                    return 'Available';
                  };

                  const getSlotStyles = () => {
                    if (!slot.isAvailable) {
                      return 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed';
                    }
                    if (isAdminMode) {
                      return 'bg-blue-50 text-blue-700 border border-blue-200';
                    }
                    if (!user) {
                      return 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer';
                    }
                    if (user.role !== 'patient') {
                      return 'bg-orange-50 text-orange-600 border border-orange-200 cursor-not-allowed';
                    }
                    return 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 cursor-pointer';
                  };

                  const handleSlotClick = () => {
                    if (!isAdminMode && slot.isAvailable) {
                      handleBookSlot(schedule.doctor, slot.startTime, schedule.date);
                    }
                  };

                  return (
                    <button
                      key={`${schedule.id}-${slot.startTime}`}
                      onClick={handleSlotClick}
                      disabled={!slot.isAvailable || isAdminMode}
                      className={`p-3 rounded-md text-sm font-medium transition-colors ${getSlotStyles()}`}
                    >
                      <div>{formatTime(slot.startTime)}</div>
                      <div className="text-xs">
                        {getSlotStatus()}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!hasSearched && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Find Available Appointments</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a date, specialty, or search for a specific doctor to view available appointment slots.
          </p>
        </div>
      )}

      {hasSearched && schedules.length === 0 && !loading && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No schedules found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No appointment slots match your search criteria. Try adjusting your filters.
          </p>
          <div className="mt-6">
            <button
              onClick={() => {
                setSelectedDate('');
                setSelectedSpecialty('');
                setSearchQuery('');
                setHasSearched(false);
                setSchedules([]);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {selectedDoctor && (
        <AppointmentBookingModal
          doctor={selectedDoctor}
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedDoctor(null);
            setPreselectedDate('');
            setPreselectedTime('');
          }}
          onSuccess={handleBookingSuccess}
          preselectedDate={preselectedDate}
          preselectedTime={preselectedTime}
        />
      )}

      {/* Doctor Schedule Management Modal */}
      {selectedDoctorForManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Manage Schedule - Dr. {selectedDoctorForManagement.user.fullName}
              </h2>
              <button
                onClick={() => setSelectedDoctorForManagement(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <DoctorScheduleManager doctorId={selectedDoctorForManagement.id} />
          </div>
        </div>
      )}







      {/* Doctor Schedule Management Modal */}
      {selectedDoctorForManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Manage Schedule - Dr. {selectedDoctorForManagement.user.fullName}
              </h2>
              <button
                onClick={() => setSelectedDoctorForManagement(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <DoctorScheduleManager doctorId={selectedDoctorForManagement.id} />
          </div>
        </div>
      )}
    </div>
  );
}
