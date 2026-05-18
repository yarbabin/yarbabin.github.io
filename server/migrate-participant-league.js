import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

console.log('Migrating database (adding league_id to cup_participants)...');

try {
  // Check if we need to migrate
  const tableInfo = db.prepare("PRAGMA table_info(cup_participants)").all();
  const hasLeagueId = tableInfo.some(col => col.name === 'league_id');

  if (!hasLeagueId) {
    db.transaction(() => {
      // 1. Create a new cup_participants table with league_id
      db.exec(`
        CREATE TABLE cup_participants_new (
          cup_id TEXT REFERENCES cups(id) ON DELETE CASCADE,
          participant_id TEXT REFERENCES participants(id) ON DELETE CASCADE,
          league_id TEXT REFERENCES leagues(id) ON DELETE SET NULL,
          PRIMARY KEY (cup_id, participant_id)
        );
      `);

      // 2. Copy data
      db.exec(`
        INSERT INTO cup_participants_new (cup_id, participant_id)
        SELECT cup_id, participant_id FROM cup_participants;
      `);

      // 3. Drop old table and rename new one
      db.exec('DROP TABLE cup_participants;');
      db.exec('ALTER TABLE cup_participants_new RENAME TO cup_participants;');
      
      console.log('Migration completed successfully!');
    })();
  } else {
    console.log('Migration already applied.');
  }
} catch (error) {
  console.error('Migration failed:', error);
}

db.close();
