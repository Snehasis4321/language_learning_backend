import { Pool, QueryResult } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('🔍 Query executed', { text: text.substring(0, 50), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Database query error:', { text, error });
    throw error;
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  // Set a timeout of 5 seconds
  const timeout = setTimeout(() => {
    console.error('⚠️ Client has been checked out for more than 5 seconds!');
  }, 5000);

  // Override release to clear timeout
  client.release = () => {
    clearTimeout(timeout);
    release();
  };

  return { query, release: client.release };
};

// Test database connection
export const testConnection = async (): Promise<void> => {
  try {
    console.log('🔍 Testing database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully!');
    console.log(`📊 Database: ${process.env.DB_NAME} | User: ${process.env.DB_USER} | Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`⏰ Server time: ${result.rows[0].now}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('📋 Connection details:', {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
    });
    throw error;
  }
};

export default pool;
