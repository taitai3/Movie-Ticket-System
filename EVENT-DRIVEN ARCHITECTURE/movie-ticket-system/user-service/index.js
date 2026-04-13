const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');
const { publish } = require('../broker');

const app = express();
app.use(cors());
app.use(express.json());

// ── DB connection ─────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || 'sapassword',
  database: process.env.DB_NAME     || 'users_db',
  waitForConnections: true,
  connectionLimit: 10,
});

async function initDB() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      userId   VARCHAR(36) PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('[User Service] DB ready');
}

// ── REST API ──────────────────────────────────────────────────────────────────

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'username and password required' });

  try {
    const userId = uuidv4();
    await pool.execute(
      'INSERT INTO users (userId, username, password) VALUES (?, ?, ?)',
      [userId, username, password]
    );
    publish('USER_REGISTERED', { userId, username, timestamp: new Date().toISOString() });
    res.status(201).json({ userId, username });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Username already taken' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.execute(
      'SELECT userId, username FROM users WHERE username = ? AND password = ?',
      [username, password]
    );
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ userId: rows[0].userId, username: rows[0].username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(8081, () => console.log('[User Service] running on port 8081'));
}).catch(err => {
  console.error('[User Service] Failed to connect to DB:', err.message);
  process.exit(1);
});
