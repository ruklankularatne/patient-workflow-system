"use client";
import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface Doctor {
  id: string; specialty: string; location: string; bio?: string | null; profilePicture?: string | null;
  user?: { id: string; fullName: string; email: string; role: string; };
}

export default function DoctorDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params as any).id;
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { api<Doctor>(`/doctors/${id}`).then(setDoctor).catch(e => setErr(e.message)); }, [id]);

  if (err) return <main className="container"><p>{err}</p></main>;
  if (!doctor) return <main className="container"><p>Loading…</p></main>;

  return (
    <main className="container">
      <h2>{doctor.user?.fullName}</h2>
      <p>{doctor.specialty} — {doctor.location}</p>
      {doctor.bio && <p>{doctor.bio}</p>}
      {doctor.profilePicture && <img src={doctor.profilePicture} alt="profile" style={{maxWidth: 240}}/>}
      {(user && (user.role === 'admin' || user.role === 'superadmin')) && (
        <p><Link className="btn" href={`/doctors/${doctor.id}/edit`}>Edit</Link></p>
      )}
    </main>
  );
}
