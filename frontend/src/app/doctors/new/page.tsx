"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

// Page to create a new doctor. Only admins and superadmins may access this page.
export default function NewDoctorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    password: '',
    specialty: '',
    location: '',
    bio: '',
    profilePicture: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Only allow admins or superadmins to access this page
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return (
      <main className="p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Create Doctor</h1>
        <p>You are not authorised to view this page.</p>
      </main>
    );
  }

  // Handle input changes
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Submit the form to create the doctor
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body: any = {
        email: form.email,
        fullName: form.fullName,
        password: form.password,
        specialty: form.specialty,
        location: form.location
      };
      if (form.bio.trim()) body.bio = form.bio.trim();
      if (form.profilePicture.trim()) body.profilePicture = form.profilePicture.trim();
      await api('/doctors', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      router.push('/doctors');
    } catch (err: any) {
      setError(err.message || 'Failed to create doctor');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create Doctor</h1>
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
          <label htmlFor="password" className="block font-medium">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
          /**/ required
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
          <label htmlFor="bio" className="block font-medium">Bio (optional)</label>
          <textarea
            id="bio"
            name="bio"
            value={form.bio}
            onChange={handleChange}
            className="mt-1 w-full border rounded p-2 h-24"
          />
        </div>
        <div>
          <label htmlFor="profilePicture" className="block font-medium">Profile picture URL (optional)</label>
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
          {submitting ? 'Creating...' : 'Create Doctor'}
        </button>
      </form>
    </main>
  );
}
