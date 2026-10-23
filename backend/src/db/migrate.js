const fs = require('fs');
const path = require('path');
const { getPool, closePool } = require('./index');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');
const MIGRATION_FILE_PATTERN = /^\d{12}_[a-z0-9]+_[a-z0-9_]+\.sql$/i;

/**
 * Ensures the schema_migrations tracking table exists.
 */
async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Returns a set of migration versions that have already been applied.
 */
async function getAppliedMigrations(client) {
  const result = await client.query('SELECT version FROM schema_migrations ORDER BY version ASC;');
  return new Set(result.rows.map((row) => row.version));
}

/**
 * Runs all pending migrations in deterministic, chronological order.
 * @param {import('pg').Pool} [poolInstance] Optional pool instance to use.
 * @returns {Promise<string[]>} Array of migration filenames applied in this run.
 */
async function runMigrations(poolInstance) {
  const pool = poolInstance || getPool();
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    const appliedSet = await getAppliedMigrations(client);

    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.log(`No migrations directory found at ${MIGRATIONS_DIR}`);
      return [];
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => MIGRATION_FILE_PATTERN.test(file))
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

    const appliedThisRun = [];

    for (const file of files) {
      if (appliedSet.has(file)) {
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`Applying migration: ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1);', [file]);
        await client.query('COMMIT');
        appliedThisRun.push(file);
        console.log(`✓ Applied migration: ${file}`);
      } catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackErr) {
          console.error(`Error during rollback for ${file}:`, rollbackErr.message);
        }
        console.error(`✗ Error applying migration ${file}:`, err.message);
        throw err;
      }
    }

    if (appliedThisRun.length === 0) {
      console.log('No pending migrations. Database is up to date.');
    } else {
      console.log(`Successfully applied ${appliedThisRun.length} migration(s).`);
    }

    return appliedThisRun;
  } finally {
    client.release();
  }
}

// Allow direct execution via `node src/db/migrate.js`
if (require.main === module) {
  runMigrations()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Migration failed:', err.message);
      await closePool();
      process.exit(1);
    });
}

module.exports = {
  runMigrations,
  ensureMigrationsTable,
  getAppliedMigrations,
  MIGRATIONS_DIR,
  MIGRATION_FILE_PATTERN,
};
