const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');
const fetch = require('node-fetch');
const { publish, subscribe } = require('../broker');

const app = express();
app.use(cors());
app.use(express.json());

const USER_SERVICE  = process.env.USER_SERVICE_URL  || 'http://localhost:8081';
const MOVIE_SERVICE = process.env.MOVIE_SERVICE_URL || 'http://localhost:8082';

// ── DB connection ─────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'sapassword',
  database: process.env.DB_NAME || 'bookings_db',
  waitForConnections: true,
  connectionLimit: 10,
});

async function initDB() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      bookingId  VARCHAR(36) PRIMARY KEY,
      userId     VARCHAR(36) NOT NULL,
      movieId    VARCHAR(36) NOT NULL,
      movieTitle VARCHAR(200) NOT NULL DEFAULT 'Unknown',
      seats      INT NOT NULL,
      totalPrice DECIMAL(10,2) NOT NULL,
      status     ENUM('PENDING','CONFIRMED','FAILED') NOT NULL DEFAULT 'PENDING',
      failReason VARCHAR(255) DEFAULT NULL,
      createdAt  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('[Booking Service] DB ready');
}

const PRICE_PER_SEAT_FALLBACK = 10;

// ── Gateway Proxy: User Service ───────────────────────────────────────────────

app.post('/register', async (req, res) => {
  try {
    const r = await fetch(`${USER_SERVICE}/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    res.status(r.status).json(await r.json());
  } catch { res.status(502).json({ error: 'User service unavailable' }); }
});

app.post('/login', async (req, res) => {
  try {
    const r = await fetch(`${USER_SERVICE}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    res.status(r.status).json(await r.json());
  } catch { res.status(502).json({ error: 'User service unavailable' }); }
});

// ── Gateway Proxy: Movie Service ──────────────────────────────────────────────

app.get('/movies', async (req, res) => {
  try {
    const r = await fetch(`${MOVIE_SERVICE}/movies`);
    res.status(r.status).json(await r.json());
  } catch { res.status(502).json({ error: 'Movie service unavailable' }); }
});

app.get('/movies/:id', async (req, res) => {
  try {
    const r = await fetch(`${MOVIE_SERVICE}/movies/${req.params.id}`);
    res.status(r.status).json(await r.json());
  } catch { res.status(502).json({ error: 'Movie service unavailable' }); }
});

app.post('/movies', async (req, res) => {
  try {
    const r = await fetch(`${MOVIE_SERVICE}/movies`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    res.status(r.status).json(await r.json());
  } catch { res.status(502).json({ error: 'Movie service unavailable' }); }
});

app.put('/movies/:id', async (req, res) => {
  try {
    const r = await fetch(`${MOVIE_SERVICE}/movies/${req.params.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    res.status(r.status).json(await r.json());
  } catch { res.status(502).json({ error: 'Movie service unavailable' }); }
});

// ── Bookings ──────────────────────────────────────────────────────────────────

app.post('/bookings', async (req, res) => {
  const { userId, movieId, movieTitle, seats, pricePerSeat } = req.body;
  if (!userId || !movieId || !seats || seats < 1)
    return res.status(400).json({ error: 'userId, movieId, seats required' });

  try {
    const bookingId  = uuidv4();
    const unitPrice  = pricePerSeat || PRICE_PER_SEAT_FALLBACK;
    const totalPrice = unitPrice * seats;

    await pool.execute(
      `INSERT INTO bookings (bookingId, userId, movieId, movieTitle, seats, totalPrice, status)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
      [bookingId, userId, movieId, movieTitle || 'Unknown', seats, totalPrice]
    );

    publish('BOOKING_CREATED', {
      bookingId,
      userId,
      movieId,
      seats,
      totalPrice,
      timestamp: new Date().toISOString(),
    });

    const [rows] = await pool.execute('SELECT * FROM bookings WHERE bookingId = ?', [bookingId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/bookings', async (req, res) => {
  try {
    const { userId } = req.query;
    let rows;
    if (userId) {
      [rows] = await pool.execute(
        'SELECT * FROM bookings WHERE userId = ? ORDER BY createdAt DESC',
        [userId]
      );
    } else {
      [rows] = await pool.execute('SELECT * FROM bookings ORDER BY createdAt DESC');
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/bookings/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM bookings WHERE bookingId = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Event Consumers ───────────────────────────────────────────────────────────

subscribe('PAYMENT_COMPLETED', async ({ bookingId }) => {
  try {
    await pool.execute(
      "UPDATE bookings SET status = 'CONFIRMED' WHERE bookingId = ?",
      [bookingId]
    );
    console.log(`[Booking Service] Booking ${bookingId} → CONFIRMED`);
  } catch (err) {
    console.error('[Booking Service] PAYMENT_COMPLETED handler error:', err.message);
  }
});

subscribe('BOOKING_FAILED', async ({ bookingId, reason }) => {
  try {
    await pool.execute(
      "UPDATE bookings SET status = 'FAILED', failReason = ? WHERE bookingId = ?",
      [reason, bookingId]
    );
    console.log(`[Booking Service] Booking ${bookingId} → FAILED: ${reason}`);
  } catch (err) {
    console.error('[Booking Service] BOOKING_FAILED handler error:', err.message);
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(8083, () => console.log('[Booking Service] running on port 8083'));
}).catch(err => {
  console.error('[Booking Service] Failed to connect to DB:', err.message);
  process.exit(1);
});
