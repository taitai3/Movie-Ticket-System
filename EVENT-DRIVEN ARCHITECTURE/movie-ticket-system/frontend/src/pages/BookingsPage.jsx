import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getBookings } from '../api';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLES = {
  PENDING:   'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  CONFIRMED: 'bg-green-500/20 text-green-300 border border-green-500/40',
  FAILED:    'bg-red-500/20 text-red-300 border border-red-500/40',
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[status] || ''}`}>
      {status === 'PENDING' && (
        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
      )}
      {status}
    </span>
  );
}

export default function BookingsPage() {
  const { user } = useAuth();
  const { state } = useLocation();
  const highlightId = state?.highlightId;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef(null);

  function hasPending(list) {
    return list.some(b => b.status === 'PENDING');
  }

  async function fetchBookings() {
    try {
      const data = await getBookings(user.userId);
      // Sort newest first
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setBookings(data);
      return data;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookings().then(data => {
      if (hasPending(data)) startPolling();
    });
    return () => stopPolling();
  }, []);

  function startPolling() {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      const data = await fetchBookings();
      if (!hasPending(data)) stopPolling();
    }, 2000);
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold mb-8 text-white">My Bookings</h2>

      {bookings.length === 0 ? (
        <div className="text-center text-gray-500 mt-20">
          No bookings yet. Go grab some tickets!
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(b => (
            <div
              key={b.bookingId}
              className={`bg-gray-900 rounded-2xl p-5 border transition-all ${
                b.bookingId === highlightId ? 'border-indigo-500 shadow-indigo-900/40 shadow-lg' : 'border-gray-800'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{b.movieTitle}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {b.seats} seat{b.seats > 1 ? 's' : ''} · ${Number(b.totalPrice).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(b.createdAt).toLocaleString()}
                  </p>
                  {b.failReason && (
                    <p className="text-xs text-red-400 mt-1">Reason: {b.failReason}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={b.status} />
                  {b.status === 'PENDING' && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="w-3 h-3 border-2 border-gray-500 border-t-indigo-400 rounded-full animate-spin inline-block" />
                      Processing…
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-700 mt-3 font-mono truncate">ID: {b.bookingId}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
