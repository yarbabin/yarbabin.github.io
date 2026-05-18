import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

console.log('Migrating database...');

try {
  // Check if we need to migrate
  const tableInfo = db.prepare("PRAGMA table_info(cups)").all();
  const hasLeagueId = tableInfo.some(col => col.name === 'league_id');

  if (hasLeagueId) {
    db.transaction(() => {
      // 1. Create the new junction table
      db.exec(`
        CREATE TABLE IF NOT EXISTS cup_leagues (
          cup_id TEXT REFERENCES cups(id) ON DELETE CASCADE,
          league_id TEXT REFERENCES leagues(id) ON DELETE CASCADE,
          PRIMARY KEY (cup_id, league_id)
        );
      `);

      // 2. Move existing relationships to the junction table
      db.exec(`
        INSERT OR IGNORE INTO cup_leagues (cup_id, league_id)
        SELECT id, league_id FROM cups WHERE league_id IS NOT NULL;
      `);

      // 3. Create a new cups table without league_id
      db.exec(`
        CREATE TABLE cups_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          scoring_system TEXT NOT NULL,
          perfect_round_bonus INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 4. Copy data
      db.exec(`
        INSERT INTO cups_new (id, name, scoring_system, perfect_round_bonus, created_at)
        SELECT id, name, scoring_system, perfect_round_bonus, created_at FROM cups;
      `);

      // 5. Drop old table and rename new one
      db.exec('DROP TABLE cups;');
      db.exec('ALTER TABLE cups_new RENAME TO cups;');
      
      console.log('Migration completed successfully!');
    })();
  } else {
    console.log('Migration already applied.');
  }
} catch (error) {
  console.error('Migration failed:', error);
}

db.close();
