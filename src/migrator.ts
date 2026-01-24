import { Sequelize, QueryInterface } from 'sequelize';
import { Umzug, SequelizeStorage, RunnableMigration } from 'umzug';
import { sequelize } from './config/database.js';
import logger from './utils/logger.js';

export const migrator = new Umzug({
  migrations: {
    glob: 'migrations/*.ts',
    resolve: ({ name, path, context }: { name: string; path?: string; context: QueryInterface }) => ({
      name,
      up: async () => {
        const migration = await import(path!);
        return migration.up(context, Sequelize);
      },
      down: async () => {
        const migration = await import(path!);
        return migration.down(context, Sequelize);
      },
    }),
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: {
    info: (msg: Record<string, unknown>) => logger.info(JSON.stringify(msg)),
    warn: (msg: Record<string, unknown>) => logger.warn(JSON.stringify(msg)),
    error: (msg: Record<string, unknown>) => logger.error(JSON.stringify(msg)),
    debug: (msg: Record<string, unknown>) => logger.debug(JSON.stringify(msg)),
  },
});

export type Migration = typeof migrator._types.migration;
