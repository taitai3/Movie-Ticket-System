// RabbitMQ broker — drop-in replacement for the in-process EventEmitter broker
// Same interface: publish(event, payload) / subscribe(event, handler)
// Requires RabbitMQ running at RABBITMQ_URL (default: amqp://localhost)

const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE     = 'movie_events';  // fanout-per-topic via direct exchange

let channel = null;
const pendingSubscriptions = []; // buffer subscriptions made before connection is ready

async function connect() {
  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    channel = await conn.createChannel();
    await channel.assertExchange(EXCHANGE, 'direct', { durable: true });
    console.log(`[BROKER] Connected to RabbitMQ at ${RABBITMQ_URL}`);

    // Flush buffered subscriptions
    for (const { event, handler } of pendingSubscriptions) {
      await bindQueue(event, handler);
    }
    pendingSubscriptions.length = 0;

    conn.on('error', (err) => {
      console.error('[BROKER] Connection error:', err.message);
      channel = null;
      setTimeout(connect, 5000); // auto-reconnect
    });

    conn.on('close', () => {
      console.warn('[BROKER] Connection closed, reconnecting...');
      channel = null;
      setTimeout(connect, 5000);
    });
  } catch (err) {
    console.error('[BROKER] Failed to connect to RabbitMQ:', err.message);
    setTimeout(connect, 5000); // retry
  }
}

async function bindQueue(event, handler) {
  const q = await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(q.queue, EXCHANGE, event);
  channel.consume(q.queue, (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      console.log(`[BROKER] Received event: ${event}`, JSON.stringify(payload));
      handler(payload);
    } catch (err) {
      console.error(`[BROKER] Failed to parse message for event ${event}:`, err.message);
    }
    channel.ack(msg);
  });
}

function publish(event, payload) {
  if (!channel) {
    console.warn(`[BROKER] Not connected — dropping event: ${event}`);
    return;
  }
  const content = Buffer.from(JSON.stringify(payload));
  channel.publish(EXCHANGE, event, content, { persistent: true });
  console.log(`[BROKER] Published event: ${event}`, JSON.stringify(payload));
}

function subscribe(event, handler) {
  if (!channel) {
    // Buffer until connected
    pendingSubscriptions.push({ event, handler });
    return;
  }
  bindQueue(event, handler).catch(err =>
    console.error(`[BROKER] Failed to subscribe to ${event}:`, err.message)
  );
}

// Initiate connection immediately when broker is required
connect();

module.exports = { publish, subscribe };
