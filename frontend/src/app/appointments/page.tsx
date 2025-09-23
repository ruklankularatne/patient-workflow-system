'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { Appointment, MedicalRecord } from '@/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import MedicalRecordModal from '@/components/MedicalRecordModal';

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [medicalRecordModal, setMedicalRecordModal] = useState<{
    isOpen: boolean;
    appointment?: Appointment;
    existingRecord?: MedicalRecord;
    mode: 'create' | 'view' | 'edit';
  }>({
    isOpen: false,
    mode: 'create'
  });

  useEffect(() => {
    if (user) {
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
        setAppointments(appointmentsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
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

  const handleCreateMedicalRecord = (appointment: Appointment) => {
    setMedicalRecordModal({
      isOpen: true,
      appointment,
      mode: 'create'
    });
  };

  const handleViewMedicalRecord = async (appointment: Appointment) => {
    try {
      const record = await apiClient.getMedicalRecordByAppointment(appointment.id);
      setMedicalRecordModal({
        isOpen: true,
        appointment,
        existingRecord: record || undefined,
        mode: record ? 'view' : 'create'
      });
    } catch (error: any) {
      console.error('Error fetching medical record:', error);
      toast.error('Failed to load medical record');
    }
  };

  const handleMedicalRecordSuccess = () => {
    fetchData(); // Refresh appointments to update medical record status
  };

  const closeMedicalRecordModal = () => {
    setMedicalRecordModal({
      isOpen: false,
      mode: 'create'
    });
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

  const formatDateTime = (date: string, time: string) => {
    return `${format(new Date(date), 'EEEE, MMMM d, yyyy')} at ${time}`;
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view your appointments.</p>
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
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          My Appointments
        </h1>
        <p className="text-gray-600">
          View and manage your scheduled appointments
        </p>
      </div>

      {/* Appointments */}
      <div className="space-y-6">
          {appointments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
              <p className="mt-1 text-sm text-gray-500">
                {user.role === 'patient' 
                  ? "You don't have any appointments scheduled."
                  : "No appointments found."
                }
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {user.role === 'patient' 
                            ? `Dr. ${appointment.doctor?.user.fullName || 'Unknown Doctor'}`
                            : appointment.patient?.fullName || 'Unknown Patient'
                          }
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
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-2 ml-4">
                      {appointment.status === 'confirmed' && user.role === 'patient' && (
                        <button
                          onClick={() => handleCancelAppointment(appointment.id)}
                          className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      
                      {/* Medical Record Actions for Doctors */}
                      {user.role === 'doctor' && appointment.status === 'completed' && (
                        <button
                          onClick={() => handleViewMedicalRecord(appointment)}
                          className="px-3 py-1 text-sm border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors"
                        >
                          {appointment.medicalRecord ? 'View Record' : 'Add Record'}
                        </button>
                      )}
                      
                      {/* View Record for Patients */}
                      {user.role === 'patient' && appointment.status === 'completed' && appointment.medicalRecord && (
                        <button 
                          onClick={() => handleViewMedicalRecord(appointment)}
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

      {/* Medical Record Modal */}
      {medicalRecordModal.isOpen && medicalRecordModal.appointment && (
        <MedicalRecordModal
          isOpen={medicalRecordModal.isOpen}
          onClose={closeMedicalRecordModal}
          appointment={medicalRecordModal.appointment}
          existingRecord={medicalRecordModal.existingRecord}
          onSuccess={handleMedicalRecordSuccess}
          mode={medicalRecordModal.mode}
        />
      )}
    </div>
  );
}