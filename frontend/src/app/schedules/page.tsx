'use client';

import { useEffect, useState } from 'react';

type Schedule = {
  id: string;
  date: string;   // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  doctor: { fullName: string };
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export default function SchedulesPage() {
  const [items, setItems] = useState<Schedule[]>([]);
  const [loading,setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`${API}/schedules`, { credentials: 'include' });
      setItems(res.ok ? await res.json() : []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p>Loading…</p>;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-gray-600">
          <tr>
            <th className="py-2">Doctor</th>
            <th className="py-2">Date</th>
            <th className="py-2">Start</th>
            <th className="py-2">End</th>
          </tr>
        </thead>
        <tbody>
          {items.map(s => (
            <tr key={s.id} className="border-t">
              <td className="py-2">{s.doctor?.fullName ?? '-'}</td>
              <td className="py-2">{s.date}</td>
              <td className="py-2">{s.startTime}</td>
              <td className="py-2">{s.endTime}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={4} className="py-6 text-center text-gray-500">No schedules yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
