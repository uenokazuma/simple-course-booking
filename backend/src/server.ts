import app from './app.js';
import logger from './config/winston.js';
import prisma from './config/prisma.js';

const PORT = Number(process.env.PORT ?? 5000);

async function startServer(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Connected to the database via Prisma');

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

void startServer();
