import pg from 'pg';
const { Pool } = pg;

async function createAppSettingsTable() {
  console.log('Creating app_settings table...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Check if the app_settings table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'app_settings'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    if (!tableExists) {
      console.log('app_settings table does not exist. Creating it...');
      
      // Create the app_settings table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS app_settings (
          id SERIAL PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          value TEXT,
          description TEXT
        );
      `);
      
      console.log('app_settings table created successfully.');
    } else {
      console.log('app_settings table already exists.');
    }
    
    console.log('Operation completed successfully!');
  } catch (error) {
    console.error('Operation failed:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

createAppSettingsTable();