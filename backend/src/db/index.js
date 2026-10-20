const { Pool } = require('pg');
const config = require('../config');

let pool = null;

function getPoolConfig(customOverrides = {}) {
  const baseDb = config.db;
  if (baseDb.connectionString) {
    return {
      connectionString: baseDb.connectionString,
      ssl: baseDb.ssl,
      max: baseDb.max,
      idleTimeoutMillis: baseDb.idleTimeoutMillis,
      connectionTimeoutMillis: baseDb.connectionTimeoutMillis,
      ...customOverrides,
    };
  }

  return {
    host: baseDb.host,
    port: baseDb.port,
    database: baseDb.database,
    user: baseDb.user,
    password: baseDb.password,
    ssl: baseDb.ssl,
    max: baseDb.max,
    idleTimeoutMillis: baseDb.idleTimeoutMillis,
    connectionTimeoutMillis: baseDb.connectionTimeoutMillis,
    ...customOverrides,
  };
}

function getPool() {
  if (!pool) {
    pool = new Pool(getPoolConfig());
    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    });
  }
  return pool;
}

async function query(text, params) {
  const currentPool = getPool();
  return currentPool.query(text, params);
}

async function getClient() {
  const currentPool = getPool();
  return currentPool.connect();
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  getPoolConfig,
  query,
  getClient,
  closePool,
  get pool() {
    return getPool();
  },
};
