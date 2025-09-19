"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface DoctorOption {
  id: string;
  user: {
    id: string;
    fullName: string;
  };
}

export default function CreateSchedulePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorId, setDoctorId] = useState<string>('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load doctors if admin/superadmin; preselect own doctorId if logged in as doctor
  useEffect(() => {
    async function loadDoctors() {
      try {
        const docs = await api<DoctorOption[]>('/doctors');
        setDoctors(docs);
        if (user && user.role === 'doctor') {
          const myDoc = docs.find((d) => d.user.id === user.userId);
          if (myDoc) setDoctorId(myDoc.id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load doctors');
      }
    }
    if (user && (user.role === 'admin' || user.role === 'doctor' || user.role === 'superadmin')) {
      void loadDoctors();
    }
  }, [user]);

  // Restrict access: only doctors, admins, superadmins
  if (user && user.role !== 'admin' && user.role !== 'doctor' && user.role !== 'superadmin') {
    if (typeof window !== 'undefined') router.push('/');
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api('/schedules', {
        method: 'POST',
        body: JSON.stringify({ doctorId, date, startTime, endTime })
      });
      router.push('/schedules');
    } catch (err: any) {
      setError(err.message || 'Failed to create schedule');
    }
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Create Schedule</h1>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        {user && (user.role === 'admin' || user.role === 'superadmin') && (
          <div>
            <label className="block mb-1">Doctor</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full border rounded p-2"
              required
            >
              <option value="" disabled>Select doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user.fullName}
                </option>
              ))}
            </select>
          </div>
        )}
        {user && user.role === 'doctor' && (
          <div>
            <label className="block mb-1">Doctor ID</label>
            <input
              type="text"
              value={doctorId}
              readOnly
              className="w-full border rounded p-2 bg-gray-100"
            />
          </div>
        )}
        <div>
          <label className="block mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded p-2"
            required
          />
        </div>
        <div>
          <label className="block mb-1">Start time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full border rounded p-2"
            required
          />
        </div>
        <div>
          <label className="block mb-1">End time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full border rounded p-2"
            required
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Create
        </button>
      </form>
    </main>
  );
}
