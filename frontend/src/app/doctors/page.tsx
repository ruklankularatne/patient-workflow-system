"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Doctor {
  id: string;
  specialty: string;
  location: string;
  bio?: string | null;
  profilePicture?: string | null;
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        const data = await api<Doctor[]>('/doctors');
        setDoctors(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load doctors');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return <main className="p-8"><p>Loading doctors...</p></main>;
  }
  if (error) {
    return <main className="p-8"><p>{error}</p></main>;
  }

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Doctors</h1>
      {/* Show create button if user is admin or superadmin */}
      {user && (user.role === 'admin' || user.role === 'superadmin') && (
        <div className="mb-4">
          <Link href="/doctors/new" className="bg-blue-600 text-white px-4 py-2 rounded">
            New Doctor
          </Link>
        </div>
      )}
      {doctors.length === 0 ? (
        <p>No doctors found.</p>
      ) : (
        <ul className="space-y-2">
          {doctors.map((doc) => (
            <li key={doc.id} className="border rounded p-4 hover:bg-gray-50">
              <Link href={`/doctors/${doc.id}`}>{doc.user?.fullName || 'Unnamed Doctor'}</Link>{' '}
              <span className="text-sm text-gray-600">({doc.specialty})</span>
              <div className="text-xs text-gray-500">{doc.location}</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
