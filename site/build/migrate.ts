import { pool } from './db.js';
import { ensureAdoptersSchema } from './adopters.js';

ensureAdoptersSchema(pool)
  .then(() => console.log('Adopters schema is up to date.'))
  .catch((err) => { console.error('Migration failed:', err instanceof Error ? err.message : 'unknown error'); process.exit(1); })
  .finally(() => pool.end());
