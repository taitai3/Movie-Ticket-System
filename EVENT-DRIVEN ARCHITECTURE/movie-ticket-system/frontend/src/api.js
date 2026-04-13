// All requests go through Booking Service (acts as Gateway)
const API = import.meta.env.VITE_API_URL || 'http://localhost:8083';

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function register(username, password) {
  const res = await fetch(`${API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  return data;
}

export async function login(username, password) {
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

// ── Movies ────────────────────────────────────────────────────────────────────

export async function getMovies() {
  const res = await fetch(`${API}/movies`);
  return res.json();
}

export async function createMovie(movie) {
  const res = await fetch(`${API}/movies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(movie),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create movie');
  return data;
}

export async function updateMovie(movieId, movie) {
  const res = await fetch(`${API}/movies/${movieId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(movie),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update movie');
  return data;
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export async function createBooking({ userId, movieId, movieTitle, seats, pricePerSeat }) {
  const res = await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, movieId, movieTitle, seats, pricePerSeat }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Booking failed');
  return data;
}

export async function getBooking(bookingId) {
  const res = await fetch(`${API}/bookings/${bookingId}`);
  return res.json();
}

export async function getBookings(userId) {
  const url = userId ? `${API}/bookings?userId=${userId}` : `${API}/bookings`;
  const res = await fetch(url);
  return res.json();
}
