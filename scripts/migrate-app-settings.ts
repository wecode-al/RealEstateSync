import { db } from '../server/db';
import { appSettings } from '../shared/schema';
import { storage } from '../server/storage';

async function migrateAppSettings() {
  console.log('Migrating to app_settings table...');
  
  try {
    // Check if the app_settings table exists
    const tableCheck = await db.execute(`
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
      await db.execute(`
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
    
    // Check if there are MerrJep credentials in old settings
    try {
      const oldSettings = await db.execute(`
        SELECT * FROM settings WHERE site = 'MERRJEP_USERNAME' OR site = 'MERRJEP_PASSWORD';
      `);
      
      // Migrate data if found
      if (oldSettings.rows.length > 0) {
        console.log(`Found ${oldSettings.rows.length} MerrJep settings to migrate.`);
        
        const settingsToUpdate: Record<string, any> = {};
        
        for (const row of oldSettings.rows) {
          settingsToUpdate[row.site] = {
            key: row.site,
            value: row.value,
            description: row.site === 'MERRJEP_USERNAME' 
              ? 'MerrJep.al username for publishing properties'
              : 'MerrJep.al password for publishing properties'
          };
        }
        
        // Update app settings with migrated data
        if (Object.keys(settingsToUpdate).length > 0) {
          await storage.updateAppSettings(settingsToUpdate);
          console.log('Successfully migrated MerrJep credentials to app_settings.');
        }
      } else {
        console.log('No MerrJep settings found to migrate.');
      }
    } catch (error) {
      console.log('Could not query old settings table. This is normal if it does not exist.');
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrateAppSettings();