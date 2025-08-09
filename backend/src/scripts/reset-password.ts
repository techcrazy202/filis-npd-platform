// backend/src/scripts/reset-password.ts
import { initDatabase } from '@/database/connection';
import { dbConfig } from '@/config/environment';
import { logger } from '@/utils/logger';
import { UserRepository } from '@/database/repositories/UserRepository';
import * as bcrypt from 'bcrypt';

function parseArg(name: string, fallback?: string): string | undefined {
  const prefixEq = `--${name}=`;
  const idx = process.argv.findIndex(a => a === `--${name}` || a.startsWith(prefixEq));
  if (idx === -1) return fallback;
  const token = process.argv[idx];
  if (token.startsWith(prefixEq)) return token.slice(prefixEq.length);
  // support space separated: --name value
  const next = process.argv[idx + 1];
  return next && !next.startsWith('--') ? next : fallback;
}

async function resetPassword() {
  const email = parseArg('email', 'demo@filis.com')!;
  const newPassword = parseArg('password', 'Password@123')!;

  logger.info(`🔑 Resetting password for user: ${email}`);

  try {
    initDatabase(dbConfig);
    const userRepo = new UserRepository();

    const user = await userRepo.findByEmail(email);

    if (!user) {
      logger.warn(`User with email ${email} not found. Creating new user...`);
      await userRepo.createUser({
        email,
        phone: '+919876543210', // Dummy phone number
        password: newPassword,
        full_name: 'Demo User'
      });
      logger.info(`✅ User ${email} created with the specified password.`);
      return;
    }

    const saltRounds = 12;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    await userRepo.update(user.id, { password_hash } as any);

    logger.info(`✅ Password for ${email} has been reset successfully.`);
    logger.info(`New password: ${newPassword}`);

  } catch (error) {
    logger.error('❌ Password reset failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  resetPassword()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error(error);
      process.exit(1);
    });
}

export { resetPassword };
