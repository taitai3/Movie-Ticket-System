const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

// ── DB connection ─────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'sapassword',
  database: process.env.DB_NAME || 'movies_db',
  waitForConnections: true,
  connectionLimit: 10,
});

async function initDB() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS movies (
      movieId        VARCHAR(36) PRIMARY KEY,
      title          VARCHAR(200) NOT NULL,
      genre          VARCHAR(100) NOT NULL,
      duration       INT NOT NULL,
      pricePerSeat   DECIMAL(10,2) NOT NULL DEFAULT 10.00,
      availableSeats INT NOT NULL DEFAULT 0,
      createdAt      DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed only if table is empty
  const [rows] = await pool.execute('SELECT COUNT(*) AS cnt FROM movies');
  if (rows[0].cnt === 0) {
    const seed = [
      { title: 'Inception',       genre: 'Sci-Fi',  duration: 148, pricePerSeat: 12, availableSeats: 100 },
      { title: 'The Dark Knight', genre: 'Action',  duration: 152, pricePerSeat: 14, availableSeats: 80  },
      { title: 'Interstellar',    genre: 'Sci-Fi',  duration: 169, pricePerSeat: 13, availableSeats: 120 },
    ];
    for (const m of seed) {
      await pool.execute(
        'INSERT INTO movies (movieId, title, genre, duration, pricePerSeat, availableSeats) VALUES (?,?,?,?,?,?)',
        [uuidv4(), m.title, m.genre, m.duration, m.pricePerSeat, m.availableSeats]
      );
    }
    console.log('[Movie Service] Seeded 3 movies');
  }
  console.log('[Movie Service] DB ready');
}

// ── REST API ──────────────────────────────────────────────────────────────────

app.get('/movies', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM movies ORDER BY createdAt');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/movies/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM movies WHERE movieId = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Movie not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/movies/:id', async (req, res) => {
  const { title, genre, duration, availableSeats, pricePerSeat } = req.body;
  try {
    const [check] = await pool.execute('SELECT * FROM movies WHERE movieId = ?', [req.params.id]);
    if (check.length === 0) return res.status(404).json({ error: 'Movie not found' });

    const updated = {
      title:          title          ?? check[0].title,
      genre:          genre          ?? check[0].genre,
      duration:       duration       ?? check[0].duration,
      availableSeats: availableSeats ?? check[0].availableSeats,
      pricePerSeat:   pricePerSeat   ?? check[0].pricePerSeat,
    };

    await pool.execute(
      'UPDATE movies SET title=?, genre=?, duration=?, availableSeats=?, pricePerSeat=? WHERE movieId=?',
      [updated.title, updated.genre, updated.duration, updated.availableSeats, updated.pricePerSeat, req.params.id]
    );
    const [rows] = await pool.execute('SELECT * FROM movies WHERE movieId = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/movies', async (req, res) => {
  const { title, genre, duration, availableSeats, pricePerSeat = 10 } = req.body;
  if (!title || !genre || !duration || availableSeats == null)
    return res.status(400).json({ error: 'title, genre, duration, availableSeats required' });

  try {
    const movieId = uuidv4();
    await pool.execute(
      'INSERT INTO movies (movieId, title, genre, duration, pricePerSeat, availableSeats) VALUES (?,?,?,?,?,?)',
      [movieId, title, genre, duration, pricePerSeat, availableSeats]
    );
    const [rows] = await pool.execute('SELECT * FROM movies WHERE movieId = ?', [movieId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(8082, () => console.log('[Movie Service] running on port 8082'));
}).catch(err => {
  console.error('[Movie Service] Failed to connect to DB:', err.message);
  process.exit(1);
});
