'use client';

import { useAuth } from '@/context/AuthContext';
import PatientDashboard from '@/components/PatientDashboard';
import DoctorDashboard from '@/components/DoctorDashboard';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    // Redirect patients to the new unified profile page
    if (user && user.role === 'patient') {
      router.push('/profile');
    }
  }, [user, router]);

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

  // Patients are redirected to profile page above
  if (user.role === 'patient') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Doctors get their own dashboard
  if (user.role === 'doctor') {
    return <DoctorDashboard />;
  }

  // Admins get redirected to admin dashboard
  if (user.role === 'admin') {
    router.push('/admin-dashboard');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Super admins get redirected to home page (their landing page)
  if (user.role === 'superadmin') {
    router.push('/');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Fallback redirect
  router.push('/appointments');
  return null;
}