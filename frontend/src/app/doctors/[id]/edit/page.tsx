"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

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

/**
 * Page to edit an existing doctor. Admins and superadmins can edit any doctor;
 * doctors may edit their own profiles if the feature is enabled.
 */
export default function EditDoctorPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const id = Array.isArray(params.id) ? params.id[0] : (params as any).id;
  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    specialty: '',
    location: '',
    bio: '',
    profilePicture: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch doctor data 
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api<DoctorDetail>(`/doctors/${id}`);
        setDoctor(data);
        setForm({
          fullName: data.user?.fullName || '',
          email: data.user?.email || '',
          specialty: data.specialty || '',
          location: data.location || '',
          bio: data.bio ?? '',
          profilePicture: data.profilePicture ?? ''
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load doctor');
      } finally {
        setLoading(false);
      }
    }
    if (id) void load();
  }, [id]);

  // Authorisation: only allow if user exists and is admin/superadmin, or doctor editing own profile
  const authorised = user &&
    (user.role === 'superadmin' ||
      user.role === 'admin' ||
      (user.role === 'doctor' && doctor && doctor.user?.id === user.userId));

  // If not authorised, show message
  if (!loading && !authorised) {
    return (
      <main className="p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Edit Doctor</h1>
        <p>You are not authorised to edit this doctor.</p>
      </main>
    );
  }

  // Handle input changes
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Submit the update
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSubmitting(true);
    try {
      const body: any = {};
      if (form.fullName.trim()) body.fullName = form.fullName.trim();
      if (form.email.trim()) body.email = form.email.trim();
      if (form.specialty.trim()) body.specialty = form.specialty.trim();
      if (form.location.trim()) body.location = form.location.trim();
      body.bio = form.bio.trim() || null;
      body.profilePicture = form.profilePicture.trim() || null;
      await api(`/doctors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      router.push(`/doctors/${id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update doctor');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !doctor) {
    return <main className="p-8"><p>Loading…</p></main>;
  }

  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Edit Doctor</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block font-medium">Full name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={form.fullName}
            onChange={handleChange}
            required
            className="mt-1 w-full border rounded p-2"
          />
        </div>
        <div>
          <label htmlFor="email" className="block font-medium">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            className="mt-1 w-full border rounded p-2"
          />
        </div>
        <div>
          <label htmlFor="specialty" className="block font-medium">Specialty</label>
          <input
            id="specialty"
            name="specialty"
            type="text"
            value={form.specialty}
            onChange={handleChange}
            required
            className="mt-1 w-full border rounded p-2"
          />
        </div>
        <div>
          <label htmlFor="location" className="block font-medium">Location</label>
          <input
            id="location"
            name="location"
            type="text"
            value={form.location}
            onChange={handleChange}
            required
            className="mt-1 w-full border rounded p-2"
          />
        </div>
        <div>
          <label htmlFor="bio" className="block font-medium">Bio</label>
          <textarea
            id="bio"
            name="bio"
            value={form.bio}
            onChange={handleChange}
            className="mt-1 w-full border rounded p-2 h-24"
          />
        </div>
        <div>
          <label htmlFor="profilePicture" className="block font-medium">Profile picture URL</label>
          <input
            id="profilePicture"
            name="profilePicture"
            type="text"
            value={form.profilePicture}
            onChange={handleChange}
            className="mt-1 w-full border rounded p-2"
          />
        </div>
        {error && <p className="text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </form>
    </main>
  );
}
