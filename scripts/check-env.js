#!/usr/bin/env node

/**
 * Prevents running destructive tasks in production accidentally.
 * Exits non-zero when NODE_ENV is "production" unless FORCE_PROD_MIGRATIONS is set.
 */
if (process.env.NODE_ENV === 'production' && !process.env.FORCE_PROD_MIGRATIONS) {
  console.error('Refusing to proceed: NODE_ENV=production and FORCE_PROD_MIGRATIONS is not set.');
  process.exit(1);
}

process.exit(0);
