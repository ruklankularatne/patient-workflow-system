'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { Appointment, Schedule } from '@/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'appointments' | 'schedule'>('appointments');

  useEffect(() => {
    if (user && user.role === 'doctor') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch doctor's appointments
      const appointmentsResponse = await apiClient.getAppointments({ doctorId: user?.id });
      if (appointmentsResponse.success && appointmentsResponse.data) {
        setAppointments(appointmentsResponse.data);
      }

      // Fetch doctor's schedules
      const schedulesResponse = await apiClient.getSchedules();
      if (schedulesResponse.success && schedulesResponse.data) {
        // Filter schedules for current doctor
        const doctorSchedules = schedulesResponse.data.filter(schedule => schedule.doctorId === user?.id);
        setSchedules(doctorSchedules);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentAction = async (appointmentId: string, action: 'confirm' | 'complete' | 'cancel') => {
    try {
      let response;
      switch (action) {
        case 'confirm':
          response = await apiClient.confirmAppointment(appointmentId);
          break;
        case 'complete':
          response = await apiClient.completeAppointment(appointmentId);
          break;
        case 'cancel':
          response = await apiClient.cancelAppointment(appointmentId);
          break;
      }

      if (response?.success) {
        toast.success(`Appointment ${action}ed successfully`);
        fetchData(); // Refresh data
      } else {
        toast.error(response?.message || `Failed to ${action} appointment`);
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} appointment`);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (date: string, time: string) => {
    return `${format(new Date(date), 'EEEE, MMMM d, yyyy')} at ${time}`;
  };

  const getUpcomingAppointments = () => {
    const today = new Date().toISOString().split('T')[0];
    return appointments.filter(apt => 
      apt.date >= today && 
      (apt.status === 'confirmed' || apt.status === 'pending')
    ).sort((a, b) => {
      const aDateTime = new Date(`${a.date} ${a.startTime}`);
      const bDateTime = new Date(`${b.date} ${b.startTime}`);
      return aDateTime.getTime() - bDateTime.getTime();
    });
  };

  const getTodayAppointments = () => {
    const today = new Date().toISOString().split('T')[0];
    return appointments.filter(apt => apt.date === today);
  };

  if (!user || user.role !== 'doctor') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Access denied. Doctor access required.</p>
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

  const upcomingAppointments = getUpcomingAppointments();
  const todayAppointments = getTodayAppointments();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Doctor Dashboard
        </h1>
        <p className="text-gray-600">
          Welcome back, Dr. {user.fullName}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Today's Appointments</dt>
                <dd className="text-lg font-medium text-gray-900">{todayAppointments.length}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Upcoming</dt>
                <dd className="text-lg font-medium text-gray-900">{upcomingAppointments.length}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                <dd className="text-lg font-medium text-gray-900">
                  {appointments.filter(apt => apt.status === 'pending').length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Appointments</dt>
                <dd className="text-lg font-medium text-gray-900">{appointments.length}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'appointments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Appointments
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

      {/* Appointments Tab */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          {/* Today's Appointments */}
          {todayAppointments.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Appointments</h2>
              <div className="grid gap-4">
                {todayAppointments.map((appointment) => (
                  <div key={appointment.id} className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
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
                        {appointment.status === 'pending' && (
                          <button
                            onClick={() => handleAppointmentAction(appointment.id, 'confirm')}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            Confirm
                          </button>
                        )}
                        
                        {appointment.status === 'confirmed' && (
                          <button
                            onClick={() => handleAppointmentAction(appointment.id, 'complete')}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Complete
                          </button>
                        )}
                        
                        {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                          <button
                            onClick={() => handleAppointmentAction(appointment.id, 'cancel')}
                            className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Appointments */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">All Appointments</h2>
            {appointments.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No appointments have been scheduled yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
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
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                            </svg>
                            {formatDateTime(appointment.date, appointment.startTime)}
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
                        {appointment.status === 'pending' && (
                          <button
                            onClick={() => handleAppointmentAction(appointment.id, 'confirm')}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            Confirm
                          </button>
                        )}
                        
                        {appointment.status === 'confirmed' && (
                          <button
                            onClick={() => handleAppointmentAction(appointment.id, 'complete')}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Complete
                          </button>
                        )}
                        
                        {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                          <button
                            onClick={() => handleAppointmentAction(appointment.id, 'cancel')}
                            className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Schedule Management</h2>
            
            {schedules.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No schedule set</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Set your availability to allow patients to book appointments.
                </p>
                <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                  Set Schedule
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="border border-gray-200 rounded p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {format(new Date(schedule.date), 'EEEE, MMMM d, yyyy')}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {schedule.startTime} - {schedule.endTime}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                          Edit
                        </button>
                        <button className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                <button className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded hover:border-gray-400 hover:text-gray-700 transition-colors">
                  + Add Schedule
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}