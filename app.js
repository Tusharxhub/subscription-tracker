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

// Server bootstrap with automatic port fallback if the desired one is busy.
const BASE_PORT = Number(PORT) || 5500;
const MAX_PORT_ATTEMPTS = 5; // try up to 5 incremental ports

async function startServer(port = BASE_PORT, attempt = 1) {
  try {
    const server = app.listen(port, async () => {
      console.log(`Subscription Tracker API listening on http://localhost:${port}`);
      if (attempt > 1) {
        console.log(`(Original requested port ${BASE_PORT} was busy; using fallback attempt #${attempt})`);
      }
      try {
        await connectToDatabase();
      } catch (dbErr) {
        console.error('Database connection failed:', dbErr.message);
      }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        if (attempt < MAX_PORT_ATTEMPTS) {
          const nextPort = port + 1;
            console.warn(`Port ${port} in use. Retrying with port ${nextPort} (attempt ${attempt + 1}/${MAX_PORT_ATTEMPTS})...`);
          setTimeout(() => startServer(nextPort, attempt + 1), 400);
        } else {
          console.error(`All attempted ports (${BASE_PORT} - ${port}) are in use. Aborting.`);
          process.exit(1);
        }
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
  } catch (err) {
    console.error('Unexpected startup error:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;