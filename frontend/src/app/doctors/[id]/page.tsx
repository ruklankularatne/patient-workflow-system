"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { Doctor } from '@/types';
import AppointmentBookingModal from '@/components/AppointmentBookingModal';
import toast from 'react-hot-toast';

interface Schedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
}

export default function DoctorDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  useEffect(() => {
    const fetchDoctorData = async () => {
      try {
        setLoading(true);
        
        // Fetch doctor details
        const doctorResponse = await apiClient.getDoctor(id);
        if (doctorResponse.success && doctorResponse.data) {
          setDoctor(doctorResponse.data);
        } else {
          throw new Error('Doctor not found');
        }

        // Fetch doctor's schedules for the next 14 days (2 weeks)
        const today = new Date();
        const twoWeeksFromNow = new Date(today);
        twoWeeksFromNow.setDate(today.getDate() + 14);
        
        const scheduleResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}/schedules?doctorId=${id}&startDate=${today.toISOString()}&endDate=${twoWeeksFromNow.toISOString()}&onlyAvailable=true`,
          { credentials: 'include' }
        );
        
        if (scheduleResponse.ok) {
          const scheduleData = await scheduleResponse.json();
          setSchedules(scheduleData.success ? scheduleData.data : scheduleData);
        }
        
      } catch (err: any) {
        console.error('Error fetching doctor data:', err);
        setError(err.message || 'Failed to load doctor information');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDoctorData();
    }
  }, [id]);

  const handleBookAppointment = () => {
    if (!user) {
      toast.error('Please log in to book an appointment');
      return;
    }
    
    if (user.role !== 'patient') {
      toast.error('Only patients can book appointments');
      return;
    }

    setIsBookingModalOpen(true);
  };

  const handleBookingSuccess = () => {
    toast.success('Appointment booked successfully!');
    setIsBookingModalOpen(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Doctor not found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The doctor you're looking for doesn't exist or has been removed.
          </p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/doctors')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Doctors
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-4">
          <li>
            <Link href="/doctors" className="text-blue-600 hover:text-blue-800">
              All Doctors
            </Link>
          </li>
          <li className="flex items-center">
            <svg className="flex-shrink-0 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="ml-4 text-gray-500">Dr. {doctor.user.fullName}</span>
          </li>
        </ol>
      </nav>

      {/* Doctor Profile Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
        <div className="p-8">
          <div className="flex items-start space-x-6">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>

            {/* Doctor Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Dr. {doctor.user.fullName}
              </h1>
              <p className="text-xl text-blue-600 font-semibold mb-2">
                {doctor.specialty}
              </p>
              <div className="flex items-center text-gray-600 mb-4">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {doctor.location}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                {user && user.role === 'patient' && (
                  <button
                    onClick={handleBookAppointment}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                  >
                    Book Appointment
                  </button>
                )}
                {user && (user.role === 'admin' || user.role === 'superadmin') && (
                  <Link
                    href={`/doctors/${doctor.id}/edit`}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
                  >
                    Edit Profile
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Doctor Details */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* About Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">About Dr. {doctor.user.fullName}</h2>
            {doctor.bio ? (
              <p className="text-gray-600 leading-relaxed">{doctor.bio}</p>
            ) : (
              <p className="text-gray-500 italic">No biography available.</p>
            )}
          </div>
        </div>

        {/* Availability Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Availability</h2>
            {schedules.length > 0 ? (
              <div className="space-y-3">
                {schedules.slice(0, 5).map((schedule) => (
                  <div key={schedule.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <p className="font-medium text-gray-900">{formatDate(schedule.date)}</p>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                    </div>
                  </div>
                ))}
                {schedules.length > 5 && (
                  <p className="text-sm text-gray-500 text-center pt-2">
                    And {schedules.length - 5} more...
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No upcoming availability scheduled.</p>
            )}
            <div className="mt-4">
              <Link
                href="/schedules"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View all schedules →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mt-8">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Professional Information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Specialty</p>
              <p className="text-gray-900">{doctor.specialty}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Location</p>
              <p className="text-gray-900">{doctor.location}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Booking Modal */}
      {doctor && (
        <AppointmentBookingModal
          doctor={doctor}
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}
