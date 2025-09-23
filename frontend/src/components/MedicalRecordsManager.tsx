'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { MedicalRecord, Appointment } from '@/types';
import toast from 'react-hot-toast';
import { format, isValid } from 'date-fns';

interface Patient {
  id: string;
  fullName: string;
  email: string;
}

// Helper function to safely format dates
const safeFormatDate = (dateValue: string | Date | null | undefined, formatString: string): string => {
  if (!dateValue) return 'N/A';
  
  try {
    const date = new Date(dateValue);
    if (!isValid(date)) return 'N/A';
    return format(date, formatString);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return 'N/A';
  }
};

interface MedicalRecordsManagerProps {
  readonly appointmentId?: string;
  readonly patientId?: string;
  readonly selectedAppointment?: Appointment;
  readonly onRecordCreated?: (record: MedicalRecord) => void;
  readonly onClose?: () => void;
  readonly onAppointmentCompleted?: () => void;
  readonly viewMode?: 'manage' | 'view-specific';
}

export default function MedicalRecordsManager({ 
  appointmentId, 
  patientId: propPatientId, 
  selectedAppointment,
  onRecordCreated,
  onClose,
  onAppointmentCompleted,
  viewMode = 'manage'
}: MedicalRecordsManagerProps) {
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string>('');
  const [formData, setFormData] = useState({
    appointmentId: appointmentId || '',
    patientId: propPatientId || '',
    notes: '',
    diagnosis: '',
    treatment: '',
    medications: '',
    followUpDate: ''
  });

  const fetchRecords = async () => {
    try {
      let response;
      if (appointmentId) {
        response = await apiClient.getMedicalRecordsByAppointment(appointmentId);
      } else if (propPatientId) {
        response = await apiClient.getMedicalRecordsByPatient(propPatientId);
      } else {
        response = await apiClient.getAllMedicalRecords();
      }
      
      if (response.success && response.data) {
        setRecords(Array.isArray(response.data) ? response.data : [response.data]);
      }
    } catch (error: any) {
      console.error('Error fetching records:', error);
      toast.error('Failed to load medical records');
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await apiClient.getAllAppointments();
      if (response.success && response.data) {
        setAppointments(response.data);
        
        // Extract unique patients from appointments (since doctors can see their appointments)
        const uniquePatients = response.data
          .filter((apt: any) => apt.patient) // Only appointments with patient data
          .map((apt: any) => apt.patient) // Extract patient objects
          .filter((patient: any, index: number, self: any[]) => 
            // Remove duplicates based on patient ID
            index === self.findIndex((p: any) => p.id === patient.id)
          );
        
        setPatients(uniquePatients);
      }
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchPatients = async () => {
    // No longer needed - patients are extracted from appointments
    // This avoids the 403 permission error when doctors try to fetch all users
    return Promise.resolve();
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      if (viewMode === 'view-specific' && selectedAppointment) {
        // For view-specific mode, only fetch the record for this appointment
        try {
          const response = await apiClient.getMedicalRecordsByAppointment(selectedAppointment.id);
          if (response.success && response.data) {
            // Since the API returns a single record, wrap it in an array
            setRecords([response.data]);
          } else {
            // No record found for this appointment
            setRecords([]);
          }
        } catch (error: any) {
          console.error('Error fetching specific record:', error);
          setRecords([]);
          // Don't show error toast for 404 - it's normal if no record exists
          if (error.response?.status !== 404) {
            toast.error('Failed to load medical record');
          }
        }
      } else {
        // For manage mode, fetch all data as before
        await Promise.all([
          fetchRecords(),
          !appointmentId && !propPatientId ? fetchAppointments() : Promise.resolve()
          // fetchPatients() is now handled within fetchAppointments() to avoid 403 errors
        ]);
      }
      
      setLoading(false);
    };

    loadData();
  }, [appointmentId, propPatientId, viewMode, selectedAppointment]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Filter records based on selected patient
  const filteredRecords = selectedPatientFilter 
    ? records.filter(record => record.patientId === selectedPatientFilter)
    : records;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientId) {
      toast.error('Please select a patient');
      return;
    }

    setIsCreating(true);

    try {
      const recordData = {
        appointmentId: formData.appointmentId || undefined,
        patientId: formData.patientId,
        doctorId: user?.doctorId || '',
        notes: formData.notes.trim() || undefined,
        diagnosis: formData.diagnosis.trim() || undefined,
        treatment: formData.treatment.trim() || undefined,
        medications: formData.medications.trim() || undefined,
        followUpDate: formData.followUpDate || undefined
      };

      const response = await apiClient.createMedicalRecord(recordData);
      
      if (response.success && response.data) {
        toast.success('Medical record created successfully');
        
        // Reset form
        setFormData({
          appointmentId: appointmentId || '',
          patientId: propPatientId || '',
          notes: '',
          diagnosis: '',
          treatment: '',
          medications: '',
          followUpDate: ''
        });
        
        setShowCreateForm(false);
        
        // Refresh records
        await fetchRecords();
        
        // Call callback if provided
        if (onRecordCreated) {
          onRecordCreated(response.data);
        }
      } else {
        throw new Error(response.message || 'Failed to create medical record');
      }
    } catch (error: any) {
      console.error('Error creating record:', error);
      toast.error(error.message || 'Failed to create medical record');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading medical records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {viewMode === 'view-specific' ? 'Medical Record' : 'Medical Records'}
        </h2>
        {user?.role === 'doctor' && viewMode !== 'view-specific' && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {showCreateForm ? 'Cancel' : 'Create Record'}
          </button>
        )}
      </div>

      {/* Patient Filter - Only show in manage mode for Medical Records tab */}
      {viewMode !== 'view-specific' && !appointmentId && !propPatientId && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center space-x-4">
            <label htmlFor="patientFilter" className="text-sm font-medium text-gray-700">
              Filter by Patient:
            </label>
            <select
              id="patientFilter"
              value={selectedPatientFilter}
              onChange={(e) => setSelectedPatientFilter(e.target.value)}
              className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Patients</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.fullName} ({patient.email})
                </option>
              ))}
            </select>
            {selectedPatientFilter && (
              <button
                onClick={() => setSelectedPatientFilter('')}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && user?.role === 'doctor' && viewMode !== 'view-specific' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Medical Record</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Patient Selection */}
            {!propPatientId && (
              <div>
                <label htmlFor="patientId" className="block text-sm font-medium text-gray-700 mb-1">
                  Patient *
                </label>
                <select
                  id="patientId"
                  name="patientId"
                  value={formData.patientId}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.fullName} ({patient.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Appointment Selection */}
            {!appointmentId && (
              <div>
                <label htmlFor="appointmentId" className="block text-sm font-medium text-gray-700 mb-1">
                  Related Appointment (Optional)
                </label>
                <select
                  id="appointmentId"
                  name="appointmentId"
                  value={formData.appointmentId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No specific appointment</option>
                  {appointments
                    .filter(apt => !formData.patientId || apt.patientId === formData.patientId)
                    .map(appointment => (
                    <option key={appointment.id} value={appointment.id}>
                      {safeFormatDate(appointment.date, 'MMM d, yyyy')} - {appointment.startTime}
                      {appointment.patient && ` (${appointment.patient.fullName})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Medical Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700 mb-1">
                  Diagnosis
                </label>
                <input
                  type="text"
                  id="diagnosis"
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter diagnosis..."
                />
              </div>

              <div>
                <label htmlFor="followUpDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  id="followUpDate"
                  name="followUpDate"
                  value={formData.followUpDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="treatment" className="block text-sm font-medium text-gray-700 mb-1">
                Treatment
              </label>
              <textarea
                id="treatment"
                name="treatment"
                value={formData.treatment}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the treatment provided..."
              />
            </div>

            <div>
              <label htmlFor="medications" className="block text-sm font-medium text-gray-700 mb-1">
                Medications
              </label>
              <textarea
                id="medications"
                name="medications"
                value={formData.medications}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="List prescribed medications..."
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional notes or observations..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Records List */}
      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {selectedPatientFilter ? 'No medical records found for the selected patient.' : 'No medical records found.'}
          </div>
        ) : (
          filteredRecords.map((record) => (
            <div key={record.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Medical Record
                  </h3>
                  <p className="text-sm text-gray-500">
                    Created: {safeFormatDate(record.createdAt, 'MMM d, yyyy \'at\' h:mm a')}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Patient Information</h4>
                  {record.patient && (
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Name:</strong> {record.patient.fullName}</p>
                      <p><strong>Email:</strong> {record.patient.email}</p>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Doctor Information</h4>
                  {record.doctor && (
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Doctor:</strong> Dr. {record.doctor.user.fullName}</p>
                      <p><strong>Specialty:</strong> {record.doctor.specialty}</p>
                    </div>
                  )}
                </div>
              </div>

              {record.appointment && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Related Appointment</h4>
                  <div className="text-sm text-gray-600">
                    <p><strong>Date:</strong> {safeFormatDate(record.appointment.date, 'MMM d, yyyy')}</p>
                    <p><strong>Time:</strong> {record.appointment.startTime} - {record.appointment.endTime}</p>
                    <p><strong>Status:</strong> {record.appointment.status}</p>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-4">
                {record.diagnosis && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Diagnosis</h4>
                    <p className="text-gray-700">{record.diagnosis}</p>
                  </div>
                )}

                {record.treatment && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Treatment</h4>
                    <p className="text-gray-700">{record.treatment}</p>
                  </div>
                )}

                {record.medications && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Medications</h4>
                    <p className="text-gray-700">{record.medications}</p>
                  </div>
                )}

                {record.notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Notes</h4>
                    <p className="text-gray-700">{record.notes}</p>
                  </div>
                )}

                {record.followUpDate && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Follow-up Date</h4>
                    <p className="text-gray-700">{safeFormatDate(record.followUpDate, 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}