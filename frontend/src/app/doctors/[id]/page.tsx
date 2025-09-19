"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';

interface DoctorDetail {
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

export default function DoctorDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params as any).id;
  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await api<DoctorDetail>(`/doctors/${id}`);
        setDoctor(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load doctor');
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      void load();
    }
  }, [id]);

  if (loading) {
    return <main className="p-8"><p>Loading doctor...</p></main>;
  }
  if (error || !doctor) {
    return <main className="p-8"><p>Doctor not found.</p></main>;
  }

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{doctor.user?.fullName || 'Doctor'}</h1>
      <div className="text-gray-600 mb-2">{doctor.specialty}</div>
      <div className="text-gray-600 mb-4">{doctor.location}</div>
      {doctor.bio && <p className="mb-4">{doctor.bio}</p>}
      {doctor.profilePicture && (
        <img
          src={doctor.profilePicture}
          alt={`${doctor.user?.fullName} profile`}
          className="max-w-sm rounded"
        />
      )}
    </main>
  );
}
