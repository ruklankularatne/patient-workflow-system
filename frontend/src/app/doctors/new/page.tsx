"use client";
import React, { useState } from 'react';
import { apiClient } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getProfilePictureUrl, isValidImageFilename } from '@/utils/profilePictures';

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
      const response = await apiClient.createDoctor(body);
      if (!response.success) {
        throw new Error(response.message || 'Failed to create doctor');
      }
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
        <div>
          <input 
            className="input" 
            placeholder="Profile Picture Filename (e.g., doctor1.jpg)" 
            value={form.profilePicture} 
            onChange={e=>setForm({...form, profilePicture:e.target.value})} 
          />
          <p className="text-sm text-gray-600 mt-1">
            Enter just the filename. Image must be placed in backend uploads/profile-pictures/ directory.
          </p>
          {form.profilePicture && !isValidImageFilename(form.profilePicture) && (
            <p className="text-sm text-red-600 mt-1">
              Please use a valid image filename (.jpg, .jpeg, .png, .webp, .svg)
            </p>
          )}
          {form.profilePicture && isValidImageFilename(form.profilePicture) && (
            <div className="mt-2">
              <p className="text-sm text-gray-600">Preview:</p>
              <img 
                src={getProfilePictureUrl(form.profilePicture) || ''} 
                alt="Profile preview" 
                className="w-16 h-16 rounded-full object-cover border mt-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
        <button className="btn" type="submit">Create</button>
      </form>
    </main>
  );
}
