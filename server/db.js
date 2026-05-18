import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Создаем или открываем базу данных в корне проекта
const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

// Включаем поддержку внешних ключей
db.pragma('foreign_keys = ON');

// Инициализация схемы
db.exec(`
  CREATE TABLE IF NOT EXISTS leagues (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    scoring_system TEXT NOT NULL,
    perfect_round_bonus INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cup_leagues (
    cup_id TEXT REFERENCES cups(id) ON DELETE CASCADE,
    league_id TEXT REFERENCES leagues(id) ON DELETE CASCADE,
    PRIMARY KEY (cup_id, league_id)
  );

  CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cup_participants (
    cup_id TEXT REFERENCES cups(id) ON DELETE CASCADE,
    participant_id TEXT REFERENCES participants(id) ON DELETE CASCADE,
    league_id TEXT REFERENCES leagues(id) ON DELETE SET NULL,
    PRIMARY KEY (cup_id, participant_id)
  );

  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    cup_id TEXT REFERENCES cups(id) ON DELETE CASCADE,
    game_number INTEGER NOT NULL,
    is_final BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cup_id, game_number)
  );

  CREATE TABLE IF NOT EXISTS game_results (
    id TEXT PRIMARY KEY,
    game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
    participant_id TEXT REFERENCES participants(id) ON DELETE CASCADE,
    total_score INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, participant_id)
  );

  CREATE TABLE IF NOT EXISTS round_details (
    id TEXT PRIMARY KEY,
    game_result_id TEXT REFERENCES game_results(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    score INTEGER NOT NULL,
    years_off INTEGER NOT NULL,
    distance_meters INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_result_id, round_number)
  );
`);

export default db;
