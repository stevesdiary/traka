import { Sequelize, QueryInterface } from 'sequelize';
import { Umzug, SequelizeStorage, RunnableMigration } from 'umzug';
import { sequelize } from './config/database.js';
import logger from './utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isCompiled = __dirname.includes(`${path.sep}dist${path.sep}`);
const migrationsGlob = isCompiled
  ? path.join(process.cwd(), 'dist', 'migrations', '*.js')
  : path.join(process.cwd(), 'migrations', '*.ts');

export const migrator = new Umzug({
  migrations: {
    glob: migrationsGlob,
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
    info: (msg: Record<string, unknown>) => {
      const safeMsg = typeof msg === 'object' ? msg.event || msg.name || 'Migration event' : msg;
      logger.info(String(safeMsg));
    },
    warn: (msg: Record<string, unknown>) => {
      const safeMsg = typeof msg === 'object' ? msg.event || msg.name || 'Migration warning' : msg;
      logger.warn(String(safeMsg));
    },
    error: (msg: Record<string, unknown>) => {
      const safeMsg = typeof msg === 'object' ? msg.event || msg.name || 'Migration error' : msg;
      logger.error(String(safeMsg));
    },
    debug: (msg: Record<string, unknown>) => {
      const safeMsg = typeof msg === 'object' ? msg.event || msg.name || 'Migration debug' : msg;
      logger.debug(String(safeMsg));
    },
  },
});

export type Migration = typeof migrator._types.migration;
