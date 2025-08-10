import express from 'express';
import cookieParser from 'cookie-parser';

import { PORT } from './config/env.js';

import userRouter from './routes/user.routes.js';
import authRouter from './routes/auth.routes.js';
import subscriptionRouter from './routes/subscription.routes.js';
import connectToDatabase from './database/mongodb.js'
import errorMiddleware from './middlewares/error.middleware.js'
import arcjetMiddleware from './middlewares/arcjet.middleware.js'
import workflowRouter from './routes/workflow.routes.js'

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(arcjetMiddleware);

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/subscriptions', subscriptionRouter);
app.use('/api/v1/workflows', workflowRouter);

app.use(errorMiddleware);

app.get('/', (req, res) => {
  res.send('Welcome to the Subscription Tracker API!');
});

// Server bootstrap: find a free port first to avoid EADDRINUSE crash loops under nodemon.
import net from 'net';
const BASE_PORT = Number(PORT) || 5500;
const MAX_PORT_ATTEMPTS = 10;

function findAvailablePort(startPort = BASE_PORT, attempts = MAX_PORT_ATTEMPTS) {
  return new Promise((resolve, reject) => {
    let current = startPort;
    const tryPort = () => {
      if (current > startPort + attempts - 1) {
        return reject(new Error(`No free port found in range ${startPort}-${startPort + attempts - 1}`));
      }
      const tester = net.createServer()
        .once('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            current += 1;
            tester.close(() => tryPort());
          } else {
            reject(err);
          }
        })
        .once('listening', () => {
          tester.close(() => resolve(current));
        })
        .listen(current, '0.0.0.0');
    };
    tryPort();
  });
}

async function startServer() {
  try {
    const freePort = await findAvailablePort();
    const server = app.listen(freePort, async () => {
      if (freePort !== BASE_PORT) {
        console.log(`Requested port ${BASE_PORT} busy; using available port ${freePort}`);
      }
      console.log(`Subscription Tracker API listening on http://localhost:${freePort}`);
      try {
        await connectToDatabase();
        console.log('Database connected.');
      } catch (dbErr) {
        console.error('Database connection failed:', dbErr.message);
      }
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`Received ${signal}. Closing server...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
      setTimeout(() => {
        console.warn('Force exit after timeout.');
        process.exit(1);
      }, 8000).unref();
    };
    ['SIGINT', 'SIGTERM'].forEach(sig => {
      process.on(sig, () => shutdown(sig));
    });
  } catch (err) {
    console.error('Startup failure:', err.message);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  startServer();
}

export default app;