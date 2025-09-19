"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface ScheduleDetail {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  doctor: {
    id: string;
    user: {
      id: string;
      fullName: string;
    };
  };
}

export default function EditSchedulePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params as any).id;
  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load schedule details
  useEffect(() => {
    async function load() {
      try {
        const data = await api<ScheduleDetail>(`/schedules/${id}`);
        setSchedule(data);
        setDate(data.date.split('T')[0]);
        setStartTime(data.startTime);
        setEndTime(data.endTime);
      } catch (err: any) {
        setError(err.message || 'Failed to load schedule');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  // Restrict access: only admins, superadmins or doctor editing their own schedule
  if (user && user.role !== 'admin' && user.role !== 'doctor' && user.role !== 'superadmin') {
    if (typeof window !== 'undefined') router.push('/');
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api(`/schedules/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ date, startTime, endTime })
      });
      router.push('/schedules');
    } catch (err: any) {
      setError(err.message || 'Failed to update schedule');
    }
  }

  if (loading) {
    return <main className="p-8"><p>Loading schedule...</p></main>;
  }
  if (error || !schedule) {
    return <main className="p-8"><p>{error || 'Schedule not found'}</p></main>;
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Edit Schedule</h1>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block mb-1">Doctor</label>
          <input
            type="text"
            value={`${schedule.doctor.user.fullName}`}
            readOnly
            className="w-full border rounded p-2 bg-gray-100"
          />
        </div>
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
          Update
        </button>
      </form>
    </main>
  );
}
