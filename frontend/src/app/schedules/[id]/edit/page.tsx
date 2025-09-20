"use client";
import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface ScheduleDetail {
  id: string; doctorId: string; date: string; startTime: string; endTime: string;
  doctor: { id: string; user: { id: string; fullName: string; } };
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
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ScheduleDetail>(`/schedules/${id}`).then(s => {
      setSchedule(s);
      setDate(s.date.split('T')[0]);
      setStartTime(s.startTime);
      setEndTime(s.endTime);
    }).catch(e=>setErr(e.message)).finally(()=>setLoading(false));
  }, [id]);

  if (!user || (user.role!=='admin' && user.role!=='doctor' && user.role!=='superadmin')) {
    if (typeof window !== 'undefined') router.push('/');
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    try {
      await api(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify({ date, startTime, endTime }) });
      router.push('/schedules');
    } catch (e:any) { setErr(e.message); }
  };

  if (loading) return <main className="container"><p>Loading…</p></main>;
  if (err || !schedule) return <main className="container"><p>{err || 'Not found'}</p></main>;

  return (
    <main className="container">
      <h2>Edit Schedule</h2>
      {err && <p className="err">{err}</p>}
      <form onSubmit={submit} className="space-y-2">
        <input className="input" value={schedule.doctor.user.fullName} readOnly />
        <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} required />
        <input className="input" type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} required />
        <input className="input" type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} required />
        <button className="btn" type="submit">Update</button>
      </form>
    </main>
  );
}
