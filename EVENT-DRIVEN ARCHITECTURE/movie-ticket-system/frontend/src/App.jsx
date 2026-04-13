import React from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import MoviesPage from './pages/MoviesPage';
import BookPage from './pages/BookPage';
import BookingsPage from './pages/BookingsPage';
import ManageMoviesPage from './pages/ManageMoviesPage';

function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    signOut();
    navigate('/auth');
  }

  if (!user) return null;

  return (
    <nav className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between shadow-md">
      <Link to="/movies" className="text-xl font-bold tracking-tight text-indigo-400">
        🎬 CineBook
      </Link>
      <div className="flex items-center gap-6 text-sm">
        <Link to="/movies" className="hover:text-indigo-300 transition-colors">Movies</Link>
        <Link to="/manage" className="hover:text-indigo-300 transition-colors">Manage Movies</Link>
        <Link to="/bookings" className="hover:text-indigo-300 transition-colors">My Bookings</Link>
        <span className="text-gray-400">Hi, {user.username}</span>
        <button
          onClick={handleSignOut}
          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white transition-colors"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <Navbar />
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/movies" element={<ProtectedRoute><MoviesPage /></ProtectedRoute>} />
          <Route path="/book/:movieId" element={<ProtectedRoute><BookPage /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute><BookingsPage /></ProtectedRoute>} />
          <Route path="/manage" element={<ProtectedRoute><ManageMoviesPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/movies" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
