"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Schedule {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  doctor: {
    id: string;
    specialty: string;
    location: string;
    user: {
      id: string;
      fullName: string;
      email: string;
      role: string;
    };
  };
}

export default function SchedulesPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await api<Schedule[]>('/schedules');
        if (user && user.role === 'doctor') {
          // Doctors only see their own schedules
          setSchedules(data.filter((s) => s.doctor.user.id === user.userId));
        } else {
          setSchedules(data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load schedules');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [user]);

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Schedules</h1>
      {loading ? (
        <p>Loading schedules...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <>
          {user && (user.role === 'admin' || user.role === 'doctor' || user.role === 'superadmin') && (
            <div className="mb-4">
              <Link href="/schedules/create" className="bg-blue-600 text-white px-3 py-2 rounded">
                Create Schedule
              </Link>
            </div>
          )}
          {schedules.length === 0 ? (
            <p>No schedules found.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Doctor</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Start</th>
                  <th className="text-left p-2">End</th>
                  {user && (user.role === 'admin' || user.role === 'doctor' || user.role === 'superadmin') && (
                    <th className="p-2">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      {s.doctor.user.fullName} ({s.doctor.specialty})
                    </td>
                    <td className="p-2">{new Date(s.date).toLocaleDateString()}</td>
                    <td className="p-2">{s.startTime}</td>
                    <td className="p-2">{s.endTime}</td>
                    {user && (user.role === 'admin' || user.role === 'doctor' || user.role === 'superadmin') && (
                      <td className="p-2 space-x-2">
                        <Link href={`/schedules/${s.id}/edit`} className="text-blue-600 underline">
                          Edit
                        </Link>
                        {/* Delete functionality to be added */}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </main>
  );
}
