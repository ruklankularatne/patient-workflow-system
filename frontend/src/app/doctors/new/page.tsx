"use client";
import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function NewDoctorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState({ email:'', fullName:'', password:'', specialty:'', location:'', bio:'', profilePicture:'' });
  const [err, setErr] = useState<string | null>(null);

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <main className="container"><p>Not authorised.</p></main>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    try {
      const body:any = { ...form };
      if (!body.bio) delete body.bio;
      if (!body.profilePicture) delete body.profilePicture;
      await api('/doctors', { method: 'POST', body: JSON.stringify(body) });
      router.push('/doctors');
    } catch (e:any) { setErr(e.message); }
  };

  return (
    <main className="container">
      <h2>New Doctor</h2>
      {err && <p className="err">{err}</p>}
      <form onSubmit={submit} className="space-y-2">
        <input className="input" placeholder="Full Name" value={form.fullName} onChange={e=>setForm({...form, fullName:e.target.value})} required />
        <input className="input" placeholder="Email" type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} required />
        <input className="input" placeholder="Password" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} required />
        <input className="input" placeholder="Specialty" value={form.specialty} onChange={e=>setForm({...form, specialty:e.target.value})} required />
        <input className="input" placeholder="Location" value={form.location} onChange={e=>setForm({...form, location:e.target.value})} required />
        <textarea className="textarea" placeholder="Bio (optional)" value={form.bio} onChange={e=>setForm({...form, bio:e.target.value})} />
        <input className="input" placeholder="Profile Picture URL (optional)" value={form.profilePicture} onChange={e=>setForm({...form, profilePicture:e.target.value})} />
        <button className="btn" type="submit">Create</button>
      </form>
    </main>
  );
}
