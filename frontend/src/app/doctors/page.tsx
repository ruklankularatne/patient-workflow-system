'use client';

import { useEffect, useState } from 'react';

type Doctor = {
  id: string;
  fullName: string;
  specialty: string;
  location: string;
  profilePicture?: string | null;
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export default function DoctorsPage() {
  const [items, setItems] = useState<Doctor[]>([]);
  const [loading,setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`${API}/doctors`, { credentials: 'include' });
      setItems(res.ok ? await res.json() : []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p>Loading…</p>;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map(d => (
        <div key={d.id} className="card">
          <div className="flex items-center gap-4">
            <img
              src={d.profilePicture || 'https://placehold.co/96x96'}
              alt={d.fullName}
              className="size-20 rounded-full object-cover"
            />
            <div>
              <h3 className="text-lg font-semibold">{d.fullName}</h3>
              <p className="text-sm text-gray-600">{d.specialty}</p>
              <p className="text-sm text-gray-600">{d.location}</p>
            </div>
          </div>
        </div>
      ))}
      {items.length === 0 && <p>No doctors yet.</p>}
    </div>
  );
}
