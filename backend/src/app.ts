import express from 'express';
import cors from 'cors';
import logger from './config/winston.js';
import v1Routes from './routes/v1.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`);
  next();
});

app.use('/api/v1', v1Routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
