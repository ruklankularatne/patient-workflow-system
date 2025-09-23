'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { Appointment } from '@/types';
import toast from 'react-hot-toast';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';
import Link from 'next/link';

interface DashboardStats {
  upcomingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    upcomingAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAppointments(
        user?.role === 'patient' ? { patientId: user.id } : {}
      );
      
      if (response.success && response.data) {
        setAppointments(response.data);
        calculateStats(response.data);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (appointmentList: Appointment[]) => {
    const today = startOfDay(new Date());
    
    // Filter to only show confirmed and completed appointments for patients
    const visibleAppointments = appointmentList.filter(apt => 
      ['confirmed', 'completed', 'cancelled'].includes(apt.status)
    );
    
    const stats = visibleAppointments.reduce((acc, appointment) => {
      const appointmentDate = new Date(appointment.date);
      
      switch (appointment.status) {
        case 'confirmed':
          if (isAfter(appointmentDate, today)) {
            acc.upcomingAppointments++;
          }
          break;
        case 'completed':
          acc.completedAppointments++;
          break;
        case 'cancelled':
          acc.cancelledAppointments++;
          break;
      }
      
      return acc;
    }, {
      upcomingAppointments: 0,
      completedAppointments: 0,
      cancelledAppointments: 0,
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

  const getRecentAppointments = () => {
    const today = startOfDay(new Date());
    return appointments
      .filter(apt => isBefore(new Date(apt.date), today) || apt.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view your dashboard.</p>
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
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user.fullName}!</h1>
        <p className="text-blue-100">Here's your health dashboard overview</p>
      </div>

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
              <p className="text-3xl font-bold text-gray-900">{appointments.filter(apt => ['confirmed', 'completed'].includes(apt.status)).length}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <Link 
                href="/appointments"
                className="block text-center text-blue-600 hover:text-blue-700 text-sm font-medium mt-4"
              >
                View All Appointments
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
            <Link 
              href="/appointments" 
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          
          {getRecentAppointments().length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-500">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {getRecentAppointments().map((appointment) => (
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
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link 
            href="/schedules"
            className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="text-center">
              <svg className="w-8 h-8 text-blue-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p className="text-sm font-medium text-gray-900">Book Appointment</p>
            </div>
          </Link>
          
          <Link 
            href="/appointments"
            className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="text-center">
              <svg className="w-8 h-8 text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm font-medium text-gray-900">View Appointments</p>
            </div>
          </Link>
          
          <Link 
            href="/medical-records"
            className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="text-center">
              <svg className="w-8 h-8 text-purple-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium text-gray-900">Medical Records</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}