'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { Doctor, DoctorSearchFilters } from '@/types';
import AppointmentBookingModal from '@/components/AppointmentBookingModal';
import AddDoctorModal from '@/components/AddDoctorModal';
import toast from 'react-hot-toast';

export default function DoctorsPage() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAddDoctorModalOpen, setIsAddDoctorModalOpen] = useState(false);

  const specialties = [
    'All Specialties',
    'Cardiology',
    'Dermatology',
    'Endocrinology',
    'Gastroenterology',
    'Neurology',
    'Oncology',
    'Orthopedics',
    'Pediatrics',
    'Psychiatry',
    'Radiology'
  ];

  const locations = [
    'All Locations',
    'New York',
    'Los Angeles',
    'Chicago',
    'Houston',
    'Phoenix',
    'Philadelphia',
    'San Antonio',
    'San Diego',
    'Dallas',
    'San Jose'
  ];

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const filters: DoctorSearchFilters = {};
      
      if (searchQuery) filters.search = searchQuery;
      if (selectedSpecialty && selectedSpecialty !== 'All Specialties') {
        filters.specialty = selectedSpecialty;
      }
      if (selectedLocation && selectedLocation !== 'All Locations') {
        filters.location = selectedLocation;
      }

      const response = await apiClient.getDoctors(filters);
      if (response.success && response.data) {
        setDoctors(response.data);
      } else {
        setDoctors([]);
      }
    } catch (error: any) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to load doctors');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search effect - waits 500ms after user stops typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchDoctors();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedSpecialty, selectedLocation]);

  const handleBookAppointment = (doctor: Doctor) => {
    if (!user) {
      toast.error('Please log in to book an appointment');
      return;
    }
    
    if (user.role !== 'patient') {
      toast.error('Only patients can book appointments');
      return;
    }

    setSelectedDoctor(doctor);
    setIsBookingModalOpen(true);
  };

  const handleBookingSuccess = () => {
    // Refresh doctors list or handle success
    toast.success('Appointment booked successfully!');
  };

  const handleAddDoctorSuccess = () => {
    // Refresh doctors list after adding new doctor
    fetchDoctors();
    setIsAddDoctorModalOpen(false);
    toast.success('Doctor added successfully!');
  };

  const getResultsText = () => {
    if (doctors.length === 0) return 'No doctors found';
    const doctorText = doctors.length === 1 ? 'doctor' : 'doctors';
    return `${doctors.length} ${doctorText} found`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find a Doctor</h1>
          <p className="text-gray-600">
            Browse our network of qualified healthcare professionals
          </p>
        </div>
        {user && (user.role === 'admin' || user.role === 'superadmin') && (
          <button
            onClick={() => setIsAddDoctorModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Add New Doctor
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-8">
        <div className="grid gap-4 md:grid-cols-3">
          {/* Search Input */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Doctors
            </label>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or specialty..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Specialty Filter */}
          <div>
            <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-2">
              Specialty
            </label>
            <select
              id="specialty"
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {specialties.map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <select
              id="location"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-6">
        <p className="text-gray-600">{getResultsText()}</p>
      </div>

      {/* Doctors Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {doctors.map((doctor) => (
          <div key={doctor.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Doctor Header */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Dr. {doctor.user.fullName}
                  </h3>
                  <p className="text-blue-600 font-medium">{doctor.specialty}</p>
                  <p className="text-gray-500 text-sm">{doctor.location}</p>
                </div>
              </div>

              {/* Doctor Bio */}
              {doctor.bio && (
                <div className="mb-4">
                  <p className="text-gray-600 text-sm line-clamp-3">
                    {doctor.bio}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Link 
                  href={`/doctors/${doctor.id}`}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium text-center"
                >
                  View Profile
                </Link>
                {user && user.role === 'patient' && (
                  <button
                    onClick={() => handleBookAppointment(doctor)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Book Appointment
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {doctors.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No doctors found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search criteria or browse all doctors.
          </p>
          <div className="mt-6">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSpecialty('');
                setSelectedLocation('');
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Appointment Booking Modal */}
      {selectedDoctor && (
        <AppointmentBookingModal
          doctor={selectedDoctor}
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedDoctor(null);
          }}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* Add Doctor Modal */}
      <AddDoctorModal
        isOpen={isAddDoctorModalOpen}
        onClose={() => setIsAddDoctorModalOpen(false)}
        onSuccess={handleAddDoctorSuccess}
      />
    </div>
  );
}
