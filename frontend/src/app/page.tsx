import Link from 'next/link';

export default function Home() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card">
        <h2 className="text-xl font-semibold mb-2">Doctors</h2>
        <p className="text-sm text-gray-600 mb-4">Browse and manage doctor profiles.</p>
        <Link href="/doctors" className="btn">Open</Link>
      </div>
      <div className="card">
        <h2 className="text-xl font-semibold mb-2">Schedules</h2>
        <p className="text-sm text-gray-600 mb-4">Check available slots and availability.</p>
        <Link href="/schedules" className="btn">Open</Link>
      </div>
    </div>
  );
}
