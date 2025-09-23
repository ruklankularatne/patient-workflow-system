'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { apiClient } from '@/lib/api';
import { Appointment, MedicalRecord } from '@/types';
import toast from 'react-hot-toast';
import { format, isToday, isFuture, isPast } from 'date-fns';
import MedicalRecordsManager from './MedicalRecordsManager';
import DoctorScheduleManager from './DoctorScheduleManager';

interface DoctorStats {
  todayAppointments: number;
  upcomingAppointments: number;
  completedToday: number;
  totalPatients: number;
}

export default function DoctorDashboard() {
  const searchParams = useSearchParams();
  const [selectedAppointmentForRecord, setSelectedAppointmentForRecord] = useState<Appointment | null>(null);

  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<DoctorStats>({
    todayAppointments: 0,
    upcomingAppointments: 0,
    completedToday: 0,
    totalPatients: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // Read initial tab from URL parameters
  const initialTab = searchParams.get('tab') as 'today' | 'upcoming' | 'completed' | 'records' | 'schedule' || 'today';
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'completed' | 'records' | 'schedule'>(initialTab);

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket({
    onAppointmentCreated: (data) => {
      toast.success(`New appointment booked: ${data.startTime}`, { 
        duration: 4000,
      });
      fetchAppointments();
    },
    onAppointmentCancelled: (data) => {
      toast(`Appointment cancelled: ${data.startTime}`, {
        duration: 4000,
        icon: 'INFO',
      });
      fetchAppointments();
    },
    userId: user?.id
  });

  useEffect(() => {
    if (user && user.role === 'doctor') {
      fetchAppointments();
    }
  }, [user]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      
      // Fetch doctor's appointments using doctorId
      const response = await apiClient.getAppointments({
        doctorId: user?.doctorId || user?.id
      });
      
      if (response.success && response.data) {
        setAppointments(response.data);
        calculateStats(response.data);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (appointmentList: Appointment[]) => {
    const today = new Date();
    
    const stats = appointmentList.reduce((acc, appointment) => {
      const appointmentDate = new Date(appointment.date);
      
      if (isToday(appointmentDate) && ['confirmed', 'completed'].includes(appointment.status)) {
        acc.todayAppointments++;
        if (appointment.status === 'completed') {
          acc.completedToday++;
        }
      }
      
      if (isFuture(appointmentDate) && appointment.status === 'confirmed') {
        acc.upcomingAppointments++;
      }
      
      return acc;
    }, {
      todayAppointments: 0,
      upcomingAppointments: 0,
      completedToday: 0,
      totalPatients: new Set(
        appointmentList
          .filter(apt => ['confirmed', 'completed'].includes(apt.status))
          .map(apt => apt.patientId)
      ).size,
    });

    setStats(stats);
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}/appointments/${appointmentId}/complete`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Appointment marked as completed');
        fetchAppointments();
      } else {
        throw new Error('Failed to complete appointment');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete appointment');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTodayAppointments = () => {
    return appointments.filter(apt => 
      isToday(new Date(apt.date)) && ['confirmed', 'completed'].includes(apt.status)
    ).sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const getUpcomingAppointments = () => {
    return appointments.filter(apt => 
      isFuture(new Date(apt.date)) && apt.status === 'confirmed'
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getCompletedAppointments = () => {
    return appointments.filter(apt => apt.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Doctor Dashboard</h1>
            <p className="text-green-100">Welcome back, Dr. {user?.fullName}!</p>
            <p className="text-green-100 text-sm">Manage your appointments, patient records, and schedule</p>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-300' : 'bg-gray-400'}`}></div>
              <span>{isConnected ? 'Live updates active' : 'Offline mode'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
              <p className="text-3xl font-bold text-blue-600">{stats.todayAppointments}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming</p>
              <p className="text-3xl font-bold text-orange-600">{stats.upcomingAppointments}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Today</p>
              <p className="text-3xl font-bold text-green-600">{stats.completedToday}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Patients</p>
              <p className="text-3xl font-bold text-purple-600">{stats.totalPatients}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('today')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'today'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Today's Schedule ({getTodayAppointments().length})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upcoming'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Upcoming ({getUpcomingAppointments().length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'completed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Completed ({getCompletedAppointments().length})
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'records'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Medical Records
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'schedule'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Schedule Management
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      <div className="space-y-4">
        {/* Today's Appointments */}
        {activeTab === 'today' && (
          <div>
            {getTodayAppointments().length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments today</h3>
                <p className="mt-1 text-sm text-gray-500">You have a clear schedule for today.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {getTodayAppointments().map((appointment) => (
                  <div 
                    key={appointment.id} 
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => appointment.status === 'confirmed' ? setSelectedAppointmentForRecord(appointment) : null}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {appointment.patient?.fullName || 'Unknown Patient'}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(appointment.status)}`}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {appointment.startTime} - {appointment.endTime}
                          </div>
                          
                          {appointment.notes && (
                            <div className="flex items-start">
                              <svg className="w-4 h-4 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="italic">{appointment.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        {appointment.status === 'confirmed' && (
                          <button
                            onClick={() => setSelectedAppointmentForRecord(appointment)}
                            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            Add Record & Complete
                          </button>
                        )}
                        
                        {appointment.status === 'completed' && (
                          <button 
                            onClick={() => setSelectedAppointmentForRecord(appointment)}
                            className="px-4 py-2 text-sm border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors"
                          >
                            View Record
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming Appointments */}
        {activeTab === 'upcoming' && (
          <div>
            {getUpcomingAppointments().length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming appointments</h3>
                <p className="mt-1 text-sm text-gray-500">Your schedule is clear for the coming days.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {getUpcomingAppointments().map((appointment) => (
                  <div 
                    key={appointment.id} 
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => appointment.status === 'confirmed' ? setSelectedAppointmentForRecord(appointment) : null}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {appointment.patient?.fullName || 'Unknown Patient'}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(appointment.status)}`}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {format(new Date(appointment.date), 'MMM d, yyyy')} at {appointment.startTime}
                          </div>
                          
                          {appointment.notes && (
                            <div className="flex items-start">
                              <svg className="w-4 h-4 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="italic">{appointment.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        {appointment.status === 'confirmed' && (
                          <button
                            onClick={() => setSelectedAppointmentForRecord(appointment)}
                            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            Add Record & Complete
                          </button>
                        )}
                        
                        {appointment.status === 'completed' && (
                          <button 
                            onClick={() => setSelectedAppointmentForRecord(appointment)}
                            className="px-4 py-2 text-sm border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors"
                          >
                            View Record
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed Appointments */}
        {activeTab === 'completed' && (
          <div>
            {getCompletedAppointments().length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No completed appointments</h3>
                <p className="mt-1 text-sm text-gray-500">Completed appointments will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {getCompletedAppointments().map((appointment) => (
                  <div 
                    key={appointment.id} 
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedAppointmentForRecord(appointment)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {appointment.patient?.fullName || 'Unknown Patient'}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(appointment.status)}`}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {format(new Date(appointment.date), 'MMM d, yyyy')} at {appointment.startTime}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button 
                          onClick={() => setSelectedAppointmentForRecord(appointment)}
                          className="px-4 py-2 text-sm border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors"
                        >
                          View Record
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Medical Records Management */}
        {activeTab === 'records' && (
          <MedicalRecordsManager 
            selectedAppointment={selectedAppointmentForRecord || undefined}
            onClose={() => setSelectedAppointmentForRecord(null)}
            onAppointmentCompleted={fetchAppointments}
            viewMode="manage"
          />
        )}

        {/* Schedule Management */}
        {activeTab === 'schedule' && (
          <DoctorScheduleManager />
        )}
      </div>

      {/* Medical Records Modal - Shows when an appointment is selected from any tab */}
      {selectedAppointmentForRecord && activeTab !== 'records' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedAppointmentForRecord.status === 'confirmed' 
                  ? `Add Medical Record & Complete Appointment` 
                  : `Medical Record`}
              </h2>
              <button
                onClick={() => setSelectedAppointmentForRecord(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <MedicalRecordsManager 
              selectedAppointment={selectedAppointmentForRecord}
              onClose={() => setSelectedAppointmentForRecord(null)}
              onAppointmentCompleted={fetchAppointments}
              viewMode={selectedAppointmentForRecord?.status === 'completed' ? 'view-specific' : 'manage'}
            />
          </div>
        </div>
      )}
    </div>
  );
}
