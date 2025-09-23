'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { MedicalRecord } from '@/types';
import { uploadMedicalRecordAttachment } from '@/utils/profilePictures';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function MedicalRecordsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (user && user.role === 'patient') {
      fetchMedicalRecords();
    }
  }, [user]);

  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getMedicalRecords(user!.id);
      if (response.success && response.data) {
        setMedicalRecords(response.data);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch medical records');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (recordId: string, file: File) => {
    // Validate file type (PDF only)
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed for medical record attachments');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadingFiles(prev => new Set(prev).add(recordId));
    try {
      const result = await uploadMedicalRecordAttachment(recordId, file);
      if (result.success) {
        toast.success(result.message || 'Attachment uploaded successfully');
        // Refresh the medical records to show the new attachment
        await fetchMedicalRecords();
      } else {
        toast.error(result.message || 'Failed to upload attachment');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload attachment');
    } finally {
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(recordId);
        return newSet;
      });
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
        <p className="text-gray-500">Medical records are only available for patients.</p>
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
          Medical Records
        </h1>
        <p className="text-gray-600">
          View your medical history and records from completed appointments
        </p>
      </div>

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

                {/* Additional medical information */}
                {(record.diagnosis || record.treatment || record.medications || record.followUpDate) && (
                  <div className="mb-4 space-y-3">
                    {record.diagnosis && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Diagnosis:</h4>
                        <p className="text-sm text-gray-700">{record.diagnosis}</p>
                      </div>
                    )}
                    {record.treatment && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Treatment:</h4>
                        <p className="text-sm text-gray-700">{record.treatment}</p>
                      </div>
                    )}
                    {record.medications && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Medications:</h4>
                        <p className="text-sm text-gray-700">{record.medications}</p>
                      </div>
                    )}
                    {record.followUpDate && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Follow-up Date:</h4>
                        <p className="text-sm text-gray-700">{format(new Date(record.followUpDate), 'MMMM d, yyyy')}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* File Upload */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Upload Attachment:</h4>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(record.id, file);
                        e.target.value = ''; // Reset input
                      }
                    }}
                    disabled={uploadingFiles.has(record.id)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Upload PDF documents related to this medical record (max 10MB)
                  </p>
                  {uploadingFiles.has(record.id) && (
                    <p className="text-xs text-blue-600 mt-1">Uploading...</p>
                  )}
                </div>
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
    </div>
  );
}