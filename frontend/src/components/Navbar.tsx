'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, logout, isLoading } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        <Link href="/" className="text-lg font-semibold text-blue-600">
          Patient Workflow System
        </Link>
        
        <nav className="flex items-center gap-4">
          {user && (
            <>
              <Link href="/doctors" className="hover:underline text-gray-700">
                Doctors
              </Link>
              <Link href="/schedules" className="hover:underline text-gray-700">
                Schedules
              </Link>
              {user.role === 'patient' && (
                <Link href="/appointments" className="hover:underline text-gray-700">
                  My Appointments
                </Link>
              )}
              {(user.role === 'doctor' || user.role === 'admin' || user.role === 'superadmin') && (
                <Link href="/dashboard" className="hover:underline text-gray-700">
                  Dashboard
                </Link>
              )}
            </>
          )}

          {!isLoading && !user && (
            <>
              <Link 
                href="/login" 
                className="px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
              >
                Login
              </Link>
              <Link 
                href="/register" 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
          
          {!isLoading && user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                Hi, {user.fullName} 
                <span className="text-xs ml-1 px-2 py-1 bg-gray-100 rounded-full">
                  {user.role}
                </span>
              </span>
              <button 
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors" 
                onClick={logout}
              >
                Logout
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
