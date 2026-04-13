const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');
const { publish, subscribe } = require('../broker');

// ── DB connection ─────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'sapassword',
  database: process.env.DB_NAME || 'payments_db',
  waitForConnections: true,
  connectionLimit: 10,
});

async function initDB() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      paymentId  VARCHAR(36) PRIMARY KEY,
      bookingId  VARCHAR(36) NOT NULL,
      userId     VARCHAR(36) NOT NULL,
      amount     DECIMAL(10,2) NOT NULL,
      status     ENUM('SUCCESS','FAILED') NOT NULL,
      reason     VARCHAR(255) DEFAULT NULL,
      createdAt  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('[Payment Service] DB ready');
}

// ── Event Consumers ───────────────────────────────────────────────────────────

subscribe('BOOKING_CREATED', async ({ bookingId, userId, totalPrice }) => {
  console.log(`[Payment Service] Processing payment for booking ${bookingId} — $${totalPrice}`);

  setTimeout(async () => {
    const success = Math.random() < 0.5; // DEMO: 100% fail — đổi lại 0.8 để về bình thường
    const paymentId = uuidv4();

    try {
      if (success) {
        await pool.execute(
          "INSERT INTO payments (paymentId, bookingId, userId, amount, status) VALUES (?,?,?,?,'SUCCESS')",
          [paymentId, bookingId, userId, totalPrice]
        );
        publish('PAYMENT_COMPLETED', {
          bookingId,
          userId,
          amount: totalPrice,
          timestamp: new Date().toISOString(),
        });
        console.log(`[Payment Service] Payment SUCCESS for booking ${bookingId}`);
      } else {
        const reason = 'Payment declined by bank';
        await pool.execute(
          "INSERT INTO payments (paymentId, bookingId, userId, amount, status, reason) VALUES (?,?,?,?,'FAILED',?)",
          [paymentId, bookingId, userId, totalPrice, reason]
        );
        publish('BOOKING_FAILED', {
          bookingId,
          userId,
          reason,
          timestamp: new Date().toISOString(),
        });
        console.log(`[Payment Service] Payment FAILED for booking ${bookingId}`);
      }
    } catch (err) {
      console.error('[Payment Service] DB error:', err.message);
    }
  }, 500);
});

// ── Start ─────────────────────────────────────────────────────────────────────
initDB().then(() => {
  console.log('[Payment Service] started — listening for BOOKING_CREATED events');
}).catch(err => {
  console.error('[Payment Service] Failed to connect to DB:', err.message);
  process.exit(1);
});
