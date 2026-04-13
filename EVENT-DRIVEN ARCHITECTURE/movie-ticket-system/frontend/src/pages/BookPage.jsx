import React, { useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { createBooking } from '../api';
import { useAuth } from '../context/AuthContext';

export default function BookPage() {
  const { movieId } = useParams();
  const { state } = useLocation();
  const movie = state?.movie;
  const { user } = useAuth();
  const navigate = useNavigate();

  const [seats, setSeats] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!movie) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center text-gray-400">
        Movie not found.{' '}
        <button onClick={() => navigate('/movies')} className="text-indigo-400 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const total = seats * movie.pricePerSeat;

  async function handleBook(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const booking = await createBooking({
        userId: user.userId,
        movieId: movie.movieId,
        movieTitle: movie.title,
        seats: Number(seats),
        pricePerSeat: movie.pricePerSeat,
      });
      navigate('/bookings', { state: { highlightId: booking.bookingId } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex justify-center items-start min-h-screen pt-16 px-4">
      <div className="bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-800">
        <button
          onClick={() => navigate('/movies')}
          className="text-sm text-indigo-400 hover:underline mb-4 block"
        >
          ← Back to movies
        </button>

        <h2 className="text-2xl font-bold text-white mb-1">{movie.title}</h2>
        <p className="text-gray-400 text-sm mb-6">
          {movie.genre} · {movie.duration} min · ${movie.pricePerSeat}/seat
        </p>

        {error && (
          <div className="bg-red-900/40 border border-red-600 text-red-300 rounded-lg px-4 py-2 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleBook} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Number of Seats</label>
            <input
              type="number"
              min={1}
              max={movie.availableSeats}
              value={seats}
              onChange={e => setSeats(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">{movie.availableSeats} seats available</p>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 flex justify-between items-center">
            <span className="text-gray-300 text-sm">Total</span>
            <span className="text-xl font-bold text-green-400">${total.toFixed(2)}</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Booking…' : 'Confirm Booking'}
          </button>
        </form>
      </div>
    </div>
  );
}
