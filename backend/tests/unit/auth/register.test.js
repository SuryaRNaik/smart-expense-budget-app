const bcrypt = require('bcryptjs');
const { normalizeEmail, validateRegistrationInput, hashPassword } = require('../../../src/auth');

describe('S1-01: registration validation and salted hashing', () => {
  it('normalizes email addresses for consistent lookup', () => {
    expect(normalizeEmail('  Jane.Doe@Example.com  ')).toBe('jane.doe@example.com');
  });

  it('rejects invalid registration payloads with a descriptive validation result', () => {
    const result = validateRegistrationInput({
      name: '',
      email: 'not-an-email',
      password: 'short',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Name is required.',
        'Please provide a valid email address.',
        'Password must be at least 8 characters long.',
      ])
    );
  });

  it('hashes plaintext passwords with bcrypt and preserves the original value securely', async () => {
    const plaintextPassword = 'Password123';
    const hashedPassword = await hashPassword(plaintextPassword);

    expect(hashedPassword).not.toBe(plaintextPassword);
    expect(hashedPassword).toMatch(/^\$2[aby]\$/);
    expect(await bcrypt.compare(plaintextPassword, hashedPassword)).toBe(true);
  });
});
