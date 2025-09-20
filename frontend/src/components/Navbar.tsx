'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, logout, loading } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container flex items-center justify-between py-3">
        <Link href="/" className="text-lg font-semibold">Patient Workflow</Link>
        <nav className="flex items-center gap-4">
          <Link href="/doctors" className="hover:underline">Doctors</Link>
          <Link href="/schedules" className="hover:underline">Schedules</Link>

          {!loading && !user && (
            <>
              <Link href="/login" className="btn">Login</Link>
              <Link href="/register" className="btn bg-gray-700 hover:bg-gray-800">Sign up</Link>
            </>
          )}
          {!loading && user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Hi, {user.name} <span className="text-xs">({user.role})</span></span>
              <button className="btn" onClick={logout}>Logout</button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
