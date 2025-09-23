'use client';

import { useState, useRef } from 'react';
import { Appointment, MedicalRecord } from '@/types';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';

interface MedicalRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  existingRecord?: MedicalRecord;
  onSuccess: () => void;
  mode: 'create' | 'view' | 'edit';
}

export default function MedicalRecordModal({
  isOpen,
  onClose,
  appointment,
  existingRecord,
  onSuccess,
  mode
}: MedicalRecordModalProps) {
  const [notes, setNotes] = useState(existingRecord?.notes || '');
  const [files, setFiles] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      // Validate file types
      const invalidFiles = Array.from(selectedFiles).filter(file => file.type !== 'application/pdf');
      if (invalidFiles.length > 0) {
        toast.error('Only PDF files are allowed');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validate file sizes (10MB max per file)
      const oversizedFiles = Array.from(selectedFiles).filter(file => file.size > 10 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        toast.error('Each file must be smaller than 10MB');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validate number of files (5 max)
      if (selectedFiles.length > 5) {
        toast.error('Maximum 5 files can be uploaded');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setFiles(selectedFiles);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view') return;

    setIsSubmitting(true);

    try {
      const medicalRecordData = {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        notes: notes
      };

      const response = await apiClient.createMedicalRecord(medicalRecordData);

      if (response.success) {
        toast.success('Medical record saved successfully');
        onSuccess();
        onClose();
      } else {
        toast.error(response.message || 'Failed to save medical record');
      }
    } catch (error: any) {
      console.error('Error saving medical record:', error);
      toast.error(error.message || 'Failed to save medical record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {mode === 'create' && 'Create Medical Record'}
              {mode === 'view' && 'View Medical Record'}
              {mode === 'edit' && 'Edit Medical Record'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Appointment Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Appointment Details</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Patient:</strong> {appointment.patient?.fullName}</p>
              <p><strong>Doctor:</strong> Dr. {appointment.doctor?.user.fullName}</p>
              <p><strong>Date:</strong> {new Date(appointment.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {appointment.startTime} - {appointment.endTime}</p>
              {appointment.notes && <p><strong>Appointment Notes:</strong> {appointment.notes}</p>}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Medical Notes */}
            <div className="mb-6">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Medical Notes *
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                required
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter detailed medical notes, diagnosis, treatment plan, medications, etc."
              />
            </div>

            {/* File Upload */}
            {mode !== 'view' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attach PDF Documents
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload up to 5 PDF files, max 10MB each
                </p>
                {files && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-700">Selected files:</p>
                    <ul className="mt-1 space-y-1">
                      {Array.from(files).map((file, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          📄 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {mode === 'view' ? 'Close' : 'Cancel'}
              </button>
              {mode !== 'view' && (
                <button
                  type="submit"
                  disabled={isSubmitting || !notes.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Save Medical Record'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}