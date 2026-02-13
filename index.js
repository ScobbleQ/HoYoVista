import { ShardingManager } from 'discord.js';
import { config } from './config.js';
import logger from './src/utils/logger.js';

const manager = new ShardingManager('./src/bot.js', { token: config.token });

manager.on('shardCreate', (shard) => {
  logger.info(`[Discord] Launched shard ${shard.id}`);
});

manager.spawn().catch((error) => {
  logger.error('[Discord] Error spawning shards', { stack: error.stack });
});
