'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [err,setErr] = useState<string|undefined>();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(undefined);
    try {
      await login(email,password);
      router.push('/');
    } catch (e:any) {
      setErr(e.message || 'Login failed');
    }
  };

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input className="input" value={email} onChange={(e)=>setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Password</label>
          <input type="password" className="input" value={password} onChange={(e)=>setPassword(e.target.value)} />
        </div>
        <button className="btn w-full">Login</button>
      </form>
    </div>
  );
}
