import React, { useEffect, useState } from 'react';
import { getMovies, createMovie, updateMovie } from '../api';

const EMPTY_FORM = { title: '', genre: '', duration: '', availableSeats: '', pricePerSeat: '' };

export default function ManageMoviesPage() {
  const [movies, setMovies]     = useState([]);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [editId, setEditId]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => { fetchMovies(); }, []);

  async function fetchMovies() {
    try { setMovies(await getMovies()); } catch {}
  }

  function startEdit(movie) {
    setEditId(movie.movieId);
    setForm({
      title:          movie.title,
      genre:          movie.genre,
      duration:       movie.duration,
      availableSeats: movie.availableSeats,
      pricePerSeat:   movie.pricePerSeat,
    });
    setError(''); setSuccess('');
  }

  function cancelEdit() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError(''); setSuccess('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const payload = {
        title:          form.title,
        genre:          form.genre,
        duration:       Number(form.duration),
        availableSeats: Number(form.availableSeats),
        pricePerSeat:   Number(form.pricePerSeat),
      };
      if (editId) {
        await updateMovie(editId, payload);
        setSuccess('Movie updated!');
      } else {
        await createMovie(payload);
        setSuccess('Movie added!');
      }
      setEditId(null);
      setForm(EMPTY_FORM);
      await fetchMovies();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold mb-8 text-white">Manage Movies</h2>

      {/* Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-10">
        <h3 className="text-lg font-semibold text-white mb-4">
          {editId ? 'Edit Movie' : 'Add New Movie'}
        </h3>

        {error   && <div className="bg-red-900/40 border border-red-600 text-red-300 rounded-lg px-4 py-2 mb-4 text-sm">{error}</div>}
        {success && <div className="bg-green-900/40 border border-green-600 text-green-300 rounded-lg px-4 py-2 mb-4 text-sm">{success}</div>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Genre</label>
            <input required value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Duration (min)</label>
            <input required type="number" min="1" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Available Seats</label>
            <input required type="number" min="0" value={form.availableSeats} onChange={e => setForm(f => ({ ...f, availableSeats: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Price / Seat ($)</label>
            <input required type="number" min="0" step="0.01" value={form.pricePerSeat} onChange={e => setForm(f => ({ ...f, pricePerSeat: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="flex items-end gap-3">
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors">
              {loading ? 'Saving…' : editId ? 'Update' : 'Add Movie'}
            </button>
            {editId && (
              <button type="button" onClick={cancelEdit}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg transition-colors">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Movie list */}
      <div className="space-y-3">
        {movies.map(m => (
          <div key={m.movieId} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-white font-semibold">{m.title}</span>
              <span className="text-gray-500 text-sm ml-3">{m.genre} · {m.duration} min · ${Number(m.pricePerSeat).toFixed(2)}/seat · {m.availableSeats} seats</span>
            </div>
            <button onClick={() => startEdit(m)}
              className="text-sm bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded-lg transition-colors">
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
