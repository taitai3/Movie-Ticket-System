import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMovies } from '../api';

export default function MoviesPage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getMovies()
      .then(setMovies)
      .catch(() => setError('Failed to load movies. Is Movie Service running?'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold mb-8 text-white">Now Showing</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {movies.map(movie => (
          <div
            key={movie.movieId}
            className="bg-gray-900 rounded-2xl p-6 flex flex-col justify-between shadow-lg border border-gray-800 hover:border-indigo-600 transition-colors"
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-1">
                {movie.genre}
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{movie.title}</h3>
              <p className="text-gray-400 text-sm mb-3">{movie.duration} min</p>
              <div className="flex items-center justify-between text-sm text-gray-300">
                <span>💺 {movie.availableSeats} seats</span>
                <span className="font-semibold text-green-400">${movie.pricePerSeat}/seat</span>
              </div>
            </div>
            <button
              onClick={() => navigate(`/book/${movie.movieId}`, { state: { movie } })}
              className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-xl transition-colors"
            >
              Book Tickets
            </button>
          </div>
        ))}
      </div>
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

function ErrorMsg({ msg }) {
  return (
    <div className="max-w-lg mx-auto mt-20 bg-red-900/40 border border-red-600 text-red-300 rounded-xl p-6 text-center">
      {msg}
    </div>
  );
}
