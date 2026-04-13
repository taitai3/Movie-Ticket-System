// Spawn each service as a separate process
// Each service connects independently to RabbitMQ

const { spawn } = require('child_process');
const path = require('path');

const services = [
  { name: 'user-service',         dir: 'user-service' },
  { name: 'movie-service',        dir: 'movie-service' },
  { name: 'booking-service',      dir: 'booking-service' },
  { name: 'payment-service',      dir: 'payment-service' },
  { name: 'notification-service', dir: 'notification-service' },
];

const colors = {
  'user-service':         '\x1b[36m',  // cyan
  'movie-service':        '\x1b[35m',  // magenta
  'booking-service':      '\x1b[33m',  // yellow
  'payment-service':      '\x1b[32m',  // green
  'notification-service': '\x1b[34m',  // blue
};
const RESET = '\x1b[0m';

services.forEach(({ name, dir }) => {
  const color = colors[name] || '';
  const cwd   = path.join(__dirname, dir);
  const proc  = spawn('node', ['index.js'], { cwd, env: process.env });

  proc.stdout.on('data', (data) => {
    data.toString().split('\n').filter(Boolean).forEach(line => {
      console.log(`${color}[${name}]${RESET} ${line}`);
    });
  });

  proc.stderr.on('data', (data) => {
    data.toString().split('\n').filter(Boolean).forEach(line => {
      console.error(`${color}[${name}]${RESET} \x1b[31m${line}\x1b[0m`);
    });
  });

  proc.on('exit', (code) => {
    console.log(`${color}[${name}]${RESET} exited with code ${code}`);
  });
});

console.log('[start-all] All services spawned. Press Ctrl+C to stop all.\n');
