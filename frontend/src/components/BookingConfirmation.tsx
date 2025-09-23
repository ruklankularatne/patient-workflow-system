'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface BookingConfirmationProps {
  appointment?: {
    id: string;
    date: string;
    time: string;
    doctorName: string;
    specialty: string;
    notes?: string;
  };
  isVisible: boolean;
  onClose: () => void;
}

export default function BookingConfirmation({ 
  appointment, 
  isVisible, 
  onClose 
}: BookingConfirmationProps) {
  const [showDetails, setShowDetails] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isVisible && appointment) {
      // Show animation after a short delay
      const timer = setTimeout(() => setShowDetails(true), 200);
      return () => clearTimeout(timer);
    } else {
      setShowDetails(false);
    }
  }, [isVisible, appointment]);

  if (!isVisible || !appointment) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl max-w-md w-full shadow-2xl transform transition-all duration-300 ${
        showDetails ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        {/* Success Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-t-xl text-white text-center">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Appointment Confirmed!</h2>
          <p className="text-green-100">Your appointment has been successfully booked</p>
        </div>

        {/* Appointment Details */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{formatDate(appointment.date)}</p>
                <p className="text-sm text-gray-600">Date</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{appointment.time}</p>
                <p className="text-sm text-gray-600">Time</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Dr. {appointment.doctorName}</p>
                <p className="text-sm text-gray-600">{appointment.specialty}</p>
              </div>
            </div>
          </div>

          {appointment.notes && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-900 mb-1">Notes:</p>
              <p className="text-sm text-blue-800">{appointment.notes}</p>
            </div>
          )}

          {/* Appointment ID */}
          <div className="text-center pt-2">
            <p className="text-xs text-gray-500">
              Appointment ID: <span className="font-mono">{appointment.id}</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                // Navigate to dashboard instead of appointments
                router.push('/dashboard');
                onClose();
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              View Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}