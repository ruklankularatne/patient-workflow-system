"use client";
import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface DoctorOption { id: string; user: { id: string; fullName: string; }; }

export default function CreateSchedulePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getDoctors().then((response: any) => {
      if (response.success && response.data) {
        const d = response.data;
        setDoctors(d);
        if (user?.role === 'doctor') {
          const mine = d.find((x: any) => x.user.id === user.id);
          if (mine) setDoctorId(mine.id);
        }
      }
    }).catch((e: any) => setErr(e.message));
  }, [user]);

  if (!user || (user.role!=='admin' && user.role!=='doctor' && user.role!=='superadmin')) {
    return <main className="container"><p>Not authorised.</p></main>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    try {
      const response = await apiClient.createSchedule({ doctorId, date, startTime, endTime, isAvailable: true });
      if (!response.success) {
        throw new Error(response.message || 'Failed to create schedule');
      }
      router.push('/schedules');
    } catch (e: any) { setErr(e.message); }
  };

  return (
    <main className="container">
      <h2>Create Schedule</h2>
      {err && <p className="err">{err}</p>}
      <form onSubmit={submit} className="space-y-2">
        {(user.role==='admin' || user.role==='superadmin') ? (
          <select className="select" value={doctorId} onChange={e=>setDoctorId(e.target.value)} required>
            <option value="" disabled>Select doctor</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.user.fullName}</option>)}
          </select>
        ) : (
          <input className="input" value={doctorId} readOnly />
        )}
        <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} required />
        <input className="input" type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} required />
        <input className="input" type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} required />
        <button className="btn" type="submit">Create</button>
      </form>
    </main>
  );
}
