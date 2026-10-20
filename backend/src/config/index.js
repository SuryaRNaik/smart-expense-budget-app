const path = require('path');
const dotenv = require('dotenv');

// Load .env from current working directory
dotenv.config();

// Also attempt loading .env from backend directory if run from repository root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Also attempt loading .env from root directory if run from backend/
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
    port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
    database: process.env.DB_NAME || process.env.POSTGRES_DB || process.env.PGDATABASE || 'sebm',
    user: process.env.DB_USER || process.env.POSTGRES_USER || process.env.PGUSER || 'sebm',
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || 'sebm_dev_password',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT || '2000', 10),
  },
};

module.exports = config;
