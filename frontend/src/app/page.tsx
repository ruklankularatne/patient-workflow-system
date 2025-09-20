'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();

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
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Create Account
            </Link>
          </div>
        )}
      </div>

      {/* Features Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
          <h3 className="text-lg font-semibold mb-2">View Schedules</h3>
          <p className="text-gray-600 mb-4">Check available appointment slots and doctor availability in real-time.</p>
          <Link href="/schedules" className="text-blue-600 hover:text-blue-800 font-medium">
            View Schedules →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Book Appointments</h3>
          <p className="text-gray-600 mb-4">Schedule appointments with your preferred doctors and manage your healthcare.</p>
          {isAuthenticated ? (
            <Link href="/appointments" className="text-blue-600 hover:text-blue-800 font-medium">
              My Appointments →
            </Link>
          ) : (
            <span className="text-gray-400">Sign in to book appointments</span>
          )}
        </div>
      </div>

      {/* Quick Actions for Authenticated Users */}
      {isAuthenticated && (
        <div className="mt-12 bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {user?.role === 'patient' && (
              <>
                <Link 
                  href="/doctors" 
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Find a Doctor
                </Link>
                <Link 
                  href="/appointments" 
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  View My Appointments
                </Link>
              </>
            )}
            
            {(user?.role === 'doctor' || user?.role === 'admin' || user?.role === 'superadmin') && (
              <>
                <Link 
                  href="/dashboard" 
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/appointments" 
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                >
                  Manage Appointments
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* System Stats for Admins */}
      {isAuthenticated && (user?.role === 'admin' || user?.role === 'superadmin') && (
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-blue-600">-</div>
            <div className="text-sm text-gray-600">Total Patients</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-green-600">-</div>
            <div className="text-sm text-gray-600">Active Doctors</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-purple-600">-</div>
            <div className="text-sm text-gray-600">Today's Appointments</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-orange-600">-</div>
            <div className="text-sm text-gray-600">Pending Approvals</div>
          </div>
        </div>
      )}
    </div>
  );
}
