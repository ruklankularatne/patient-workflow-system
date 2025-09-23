'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import CreateAdminModal from '@/components/CreateAdminModal';

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Patient Workflow Management System
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          {isAuthenticated 
            ? `Welcome back, ${user?.fullName}!` 
            : 'Streamline healthcare workflows with our comprehensive patient management system'}
        </p>
        
        {!isAuthenticated && (
          <div className="flex justify-center gap-4">
            <Link 
              href="/login" 
              className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              Login
            </Link>
            <Link 
              href="/register" 
              className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              Create Account
            </Link>
          </div>
        )}
      </div>

      {/* Features Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {/* Show different content based on user role */}
        {isAuthenticated && user?.role === 'doctor' ? (
          <>
            {/* Doctor Features */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Today's Appointments</h3>
              <p className="text-gray-600 mb-4">View and manage your appointments for today. Complete consultations and update patient records.</p>
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
                View Schedule →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Patient Records</h3>
              <p className="text-gray-600 mb-4">Access and manage patient medical records. Add diagnoses, treatments, and follow-up notes.</p>
              <Link href="/dashboard?tab=records" className="text-blue-600 hover:text-blue-800 font-medium">
                Manage Records →
              </Link>
            </div>
          </>
        ) : isAuthenticated && user?.role === 'admin' ? (
          <>
            {/* Admin Features */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Manage Doctors</h3>
              <p className="text-gray-600 mb-4">Add, edit, and manage doctor accounts, profiles, and specialties. Control doctor permissions and access.</p>
              <Link href="/doctors" className="text-blue-600 hover:text-blue-800 font-medium">
                Manage Doctors →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Manage Schedules</h3>
              <p className="text-gray-600 mb-4">Oversee doctor availability, appointment schedules, and time slot management across the platform.</p>
              <Link href="/schedules" className="text-blue-600 hover:text-blue-800 font-medium">
                Manage Schedules →
              </Link>
            </div>
          </>
        ) : isAuthenticated && user?.role === 'superadmin' ? (
          <>
            {/* Super Admin Features */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm col-span-2">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Create Admin Users</h3>
              <p className="text-gray-600 mb-4">Create new administrator accounts for system management. Only super administrators can perform this action.</p>
              <button 
                className="text-purple-600 hover:text-purple-800 font-medium"
                onClick={() => setIsCreateAdminModalOpen(true)}
              >
                Create Admin →
              </button>
            </div>
          </>
        ) : isAuthenticated && (user?.role === 'admin' || user?.role === 'superadmin') ? (
          <>
            {/* Admin Features */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Manage Doctors</h3>
              <p className="text-gray-600 mb-4">Add, edit, and manage doctor accounts, profiles, and specialties. Control doctor permissions and access.</p>
              <Link href="/doctors" className="text-blue-600 hover:text-blue-800 font-medium">
                Manage Doctors →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Manage Schedules</h3>
              <p className="text-gray-600 mb-4">Oversee doctor availability, appointment schedules, and time slot management across the platform.</p>
              <Link href="/schedules" className="text-blue-600 hover:text-blue-800 font-medium">
                Manage Schedules →
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Patient/General Features */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Find Doctors</h3>
              <p className="text-gray-600 mb-4">Browse doctor profiles, specialties, and locations to find the right healthcare provider.</p>
              <Link href="/doctors" className="text-blue-600 hover:text-blue-800 font-medium">
                Browse Doctors →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Book Appointments</h3>
              <p className="text-gray-600 mb-4">Schedule appointments with your preferred doctors and view available time slots in real-time.</p>
              {isAuthenticated ? (
                <Link href="/schedules" className="text-blue-600 hover:text-blue-800 font-medium">
                  Book Now →
                </Link>
              ) : (
                <span className="text-gray-400">Sign in to book appointments</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Admin Modal */}
      <CreateAdminModal
        isOpen={isCreateAdminModalOpen}
        onClose={() => setIsCreateAdminModalOpen(false)}
        onSuccess={() => {
          // Modal will handle success message
        }}
      />

    </div>
  );
}
