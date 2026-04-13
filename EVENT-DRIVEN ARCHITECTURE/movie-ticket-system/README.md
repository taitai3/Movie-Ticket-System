# Movie Ticket Booking System

Event-Driven Architecture with Node.js microservices + React frontend + MariaDB.

## Architecture

```
Frontend (3000)
    │
    ├── GET  /movies      → Movie Service   (8082)
    ├── POST /register    → User Service    (8081)
    ├── POST /login       → User Service    (8081)
    └── POST /bookings    → Booking Service (8083)
         GET  /bookings

Inter-service communication via shared in-process broker (no direct HTTP calls):

  User Service     ──publishes──▶ USER_REGISTERED   ──▶ Notification Service
  Booking Service  ──publishes──▶ BOOKING_CREATED   ──▶ Payment Service
  Payment Service  ──publishes──▶ PAYMENT_COMPLETED ──▶ Booking Service + Notification Service
  Payment Service  ──publishes──▶ BOOKING_FAILED    ──▶ Booking Service + Notification Service
```

## Databases (MariaDB — one per service)

| Service              | Database          |
|----------------------|-------------------|
| User Service         | users_db          |
| Movie Service        | movies_db         |
| Booking Service      | bookings_db       |
| Payment Service      | payments_db       |
| Notification Service | notifications_db  |

## Quick Start

### 1. Create databases

Make sure MariaDB is running, then:

```bash
mysql -u root -p < init-db.sql
```

### 2. Configure DB credentials (optional)

Each service reads these environment variables (defaults shown):

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=<service-specific>
```

Override per service if needed:

```bash
DB_PASS=secret node index.js
```

### 3. Install dependencies

```bash
cd user-service         && npm install
cd ../movie-service     && npm install
cd ../booking-service   && npm install
cd ../payment-service   && npm install
cd ../notification-service && npm install
cd ../frontend          && npm install
```

### 4. Start all services

Open 6 terminals from the project root:

```bash
# Terminal 1
cd user-service && node index.js

# Terminal 2
cd movie-service && node index.js

# Terminal 3
cd booking-service && node index.js

# Terminal 4
cd payment-service && node index.js

# Terminal 5
cd notification-service && node index.js

# Terminal 6
cd frontend && npm run dev
```

Open http://localhost:3000

## Service Ports

| Service              | Port |
|----------------------|------|
| User Service         | 8081 |
| Movie Service        | 8082 |
| Booking Service      | 8083 |
| Payment Service      | 8084 (no HTTP) |
| Notification Service | 8085 |
| Frontend             | 3000 |

## Demo Flow

1. Register a user → watch `[NOTIFICATION] Welcome <username>! Account created.`
2. Log in
3. Browse movies and click "Book Tickets"
4. Select seats and confirm
5. Booking shows **PENDING** (yellow)
6. After ~2 seconds → **CONFIRMED** (green, 80%) or **FAILED** (red, 20%)
7. Check Notification Service terminal for logs

## Notes

- Tables are created automatically on first run (`CREATE TABLE IF NOT EXISTS`)
- Movie seed data is inserted only when the movies table is empty
- Broker uses in-process EventEmitter — all services must run on the same machine
- To swap to RabbitMQ: replace `broker/index.js` with amqplib — same interface
