import pg from 'pg';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, '..', '..', '.env') });

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
