'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { Appointment, MedicalRecord } from '@/types';
import toast from 'react-hot-toast';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  upcomingAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  cancelledAppointments: number;
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    upcomingAppointments: 0,
    completedAppointments: 0,
    pendingAppointments: 0,
    cancelledAppointments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'records'>('overview');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (user && user.role === 'patient') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch appointments
      const appointmentsResponse = await apiClient.getAppointments(
        user?.role === 'patient' ? { patientId: user.id } : {}
      );
      
      if (appointmentsResponse.success && appointmentsResponse.data) {
        // Filter appointments for patients to only show confirmed and completed
        const filteredAppointments = appointmentsResponse.data.filter(apt => 
          ['confirmed', 'completed'].includes(apt.status)
        );
        setAppointments(filteredAppointments);
        calculateStats(filteredAppointments);
      }

      // Fetch medical records
      const recordsResponse = await apiClient.getMedicalRecords(user!.id);
      if (recordsResponse.success && recordsResponse.data) {
        setMedicalRecords(recordsResponse.data);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (appointmentList: Appointment[]) => {
    const today = startOfDay(new Date());
    
    const stats = appointmentList.reduce((acc, appointment) => {
      const appointmentDate = new Date(appointment.date);
      
      // Only process confirmed and completed appointments for patients
      if (appointment.status === 'confirmed') {
        if (isAfter(appointmentDate, today)) {
          acc.upcomingAppointments++;
        }
      } else if (appointment.status === 'completed') {
        acc.completedAppointments++;
      }
      
      return acc;
    }, {
      upcomingAppointments: 0,
      completedAppointments: 0,
      pendingAppointments: 0, // Always 0 for patients since they don't see pending
      cancelledAppointments: 0, // Always 0 for patients since they don't see cancelled
    });

    setStats(stats);
  };

  const getUpcomingAppointments = () => {
    const today = startOfDay(new Date());
    return appointments
      .filter(apt => isAfter(new Date(apt.date), today) && apt.status === 'confirmed')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (date: string, time: string) => {
    return `${format(new Date(date), 'EEEE, MMMM d, yyyy')} at ${time}`;
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const response = await apiClient.cancelAppointment(appointmentId);
      if (response.success) {
        toast.success('Appointment cancelled successfully');
        fetchData(); // Refresh data
      } else {
        toast.error(response.message || 'Failed to cancel appointment');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel appointment');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (user.role !== 'patient') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">This page is only available for patients.</p>
      </div>
    );
  }

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
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-blue-100">Welcome back, {user.fullName}!</p>
        <p className="text-blue-100 text-sm">Manage your appointments, and access medical records</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Dashboard Overview
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'appointments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Appointments ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'records'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Medical Records ({medicalRecords.length})
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Upcoming</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.upcomingAppointments}</p>
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
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completedAppointments}</p>
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
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-3xl font-bold text-gray-900">{appointments.length}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Upcoming Appointments</h2>
              <Link 
                href="/schedules" 
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Book New
              </Link>
            </div>
            
            {getUpcomingAppointments().length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 mb-4">No upcoming appointments</p>
                <Link 
                  href="/schedules"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Book Appointment
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {getUpcomingAppointments().map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900">
                          Dr. {appointment.doctor?.user?.fullName || 'Unknown Doctor'}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {format(new Date(appointment.date), 'MMM d, yyyy')} at {appointment.startTime}
                      </p>
                      <p className="text-xs text-gray-500">{appointment.doctor?.specialty}</p>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => setActiveTab('appointments')}
                  className="block text-center text-blue-600 hover:text-blue-700 text-sm font-medium mt-4 w-full"
                >
                  View All Appointments
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appointments Tab */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          {appointments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
              <p className="mt-1 text-sm text-gray-500">You don't have any appointments scheduled.</p>
              <Link 
                href="/schedules"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-4"
              >
                Book Your First Appointment
              </Link>
            </div>
          ) : (
            <div className="grid gap-6">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Dr. {appointment.doctor?.user.fullName || 'Unknown Doctor'}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(appointment.status)}`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDateTime(appointment.date, appointment.startTime)}
                        </div>
                        
                        {appointment.doctor && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {appointment.doctor.specialty} • {appointment.doctor.location}
                          </div>
                        )}
                        
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
                      {appointment.status === 'completed' && appointment.medicalRecord && (
                        <button 
                          onClick={() => setActiveTab('records')}
                          className="px-3 py-1 text-sm border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors"
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

      {/* Medical Records Tab */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          {medicalRecords.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No medical records</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your medical records will appear here after completed appointments.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {medicalRecords.map((record) => (
                <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Dr. {record.doctor?.user.fullName || 'Unknown Doctor'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {record.createdAt && format(new Date(record.createdAt), 'MMMM d, yyyy')}
                      </p>
                      {record.doctor && (
                        <p className="text-sm text-gray-500">
                          {record.doctor.specialty} • {record.doctor.location}
                        </p>
                      )}
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Medical Record
                    </span>
                  </div>
                  
                  {record.notes && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Medical Record:</h4>
                      <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                        {record.notes}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center text-xs text-gray-500">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Record created on {record.createdAt && format(new Date(record.createdAt), 'MMMM d, yyyy \'at\' h:mm a')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}