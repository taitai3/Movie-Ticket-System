const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { subscribe } = require('../broker');

const app = express();
app.use(cors());
app.use(express.json());

// ── DB connection ─────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'sapassword',
  database: process.env.DB_NAME || 'notifications_db',
  waitForConnections: true,
  connectionLimit: 10,
});

async function initDB() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id        INT AUTO_INCREMENT PRIMARY KEY,
      type      VARCHAR(50) NOT NULL,
      message   TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('[Notification Service] DB ready');
}

async function addNotification(type, message) {
  console.log(`[NOTIFICATION] ${message}`);
  try {
    await pool.execute(
      'INSERT INTO notifications (type, message) VALUES (?, ?)',
      [type, message]
    );
  } catch (err) {
    console.error('[Notification Service] DB error:', err.message);
  }
}

// ── Event Consumers ───────────────────────────────────────────────────────────

subscribe('USER_REGISTERED', ({ username }) => {
  addNotification('USER_REGISTERED', `Welcome ${username}! Account created.`);
});

subscribe('PAYMENT_COMPLETED', ({ bookingId, userId }) => {
  addNotification('PAYMENT_COMPLETED', `Booking #${bookingId} confirmed! User ${userId} — enjoy the movie!`);
});

subscribe('BOOKING_FAILED', ({ bookingId, userId, reason }) => {
  addNotification('BOOKING_FAILED', `Booking #${bookingId} FAILED for user ${userId}. Reason: ${reason}`);
});

// ── REST API ──────────────────────────────────────────────────────────────────

app.get('/notifications', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM notifications ORDER BY createdAt DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(8085, () => console.log('[Notification Service] running on port 8085'));
}).catch(err => {
  console.error('[Notification Service] Failed to connect to DB:', err.message);
  process.exit(1);
});
