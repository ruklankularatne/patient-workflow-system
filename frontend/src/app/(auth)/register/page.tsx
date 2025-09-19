'use client';
import React, { useState } from 'react';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const [email, setEmail] = useState(''); const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState(''); const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    try {
      await api('/auth/register', { method: 'POST', body: JSON.stringify({ email, fullName, password }) });
      window.location.href = '/login';
    } catch (e: any) { setErr(e.message || 'Register failed'); }
  }
  return (
    <main className="p-8 max-w-md mx-auto">
      <h1>Register</h1>
      <form onSubmit={submit}>
        <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Full name" />
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" />
        <button type="submit">Create account</button>
      </form>
      {err && <p style={{color:'red'}}>{err}</p>}
    </main>
  );
}
