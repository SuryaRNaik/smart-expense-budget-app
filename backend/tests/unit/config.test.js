const config = require('../../src/config');
const { getPoolConfig } = require('../../src/db');

describe('Configuration & DB Config (Unit)', () => {
  it('loads default server configuration', () => {
    expect(config.port).toBeDefined();
    expect(typeof config.port).toBe('number');
    expect(config.nodeEnv).toBeDefined();
  });

  it('provides default PostgreSQL connection settings', () => {
    expect(config.db).toBeDefined();
    expect(config.db.host).toBeDefined();
    expect(config.db.port).toBe(5432);
    expect(config.db.database).toBe('sebm');
    expect(config.db.user).toBe('sebm');
    expect(config.db.password).toBe('sebm_dev_password');
    expect(config.db.max).toBe(10);
  });

  it('constructs database pool config correctly with overrides', () => {
    const customConfig = getPoolConfig({ max: 5 });
    expect(customConfig.max).toBe(5);
    expect(customConfig.database).toBe(config.db.database);
    expect(customConfig.user).toBe(config.db.user);
  });
});
