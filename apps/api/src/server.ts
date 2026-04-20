import { app } from './app.js';
import { env } from './config.js';
import { logger } from './utils/logger.js';

app.listen(env.API_PORT, () => {
  logger.info(`API listening on port ${env.API_PORT}`);
});
