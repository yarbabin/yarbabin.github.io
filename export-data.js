import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { spawn } from 'child_process';

const API_BASE = 'http://localhost:3001/api/db';
const DATA_DIR = path.join(process.cwd(), 'public', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function fetchAndSave(endpoint, filename, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      const res = await fetch(`${API_BASE}${endpoint}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
      console.log(`✅ Saved ${filename}`);
      return data;
    } catch (error) {
      console.error(`⚠️ Attempt ${i + 1} failed for ${endpoint}:`, error.message);
      if (i === retries - 1) {
        console.error(`❌ Final failure for ${endpoint}`);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // wait before retry
    }
  }
}

async function exportAll() {
  console.log('Starting static data export...');

  const dashboard = await fetchAndSave('/dashboard', 'dashboard.json');
  const cups = await fetchAndSave('/cups', 'cups.json');
  await fetchAndSave('/analytics', 'analytics.json');

  if (cups) {
    for (const cup of cups) {
      await fetchAndSave(`/cup-data/${cup.id}`, `cup-data-${cup.id}.json`);
      await fetchAndSave(`/analytics?cup_id=${cup.id}`, `analytics-cup_id-${cup.id}.json`);
    }
  }

  const participants = await fetchAndSave('/participants', 'participants.json');
  
  if (participants && cups) {
    for (const p of participants) {
      await fetchAndSave(`/participants/${p.id}/stats`, `participants-${p.id}-stats.json`);
      for (const cup of cups) {
        await fetchAndSave(`/participants/${p.id}/stats?cupId=${cup.id}`, `participants-${p.id}-stats-cupId-${cup.id}.json`);
      }
    }
  }

  console.log('🎉 Export complete!');
}

console.log('Starting backend server...');
const server = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
});

setTimeout(async () => {
  try {
    await exportAll();
  } catch (err) {
    console.error(err);
  } finally {
    console.log('Stopping backend server...');
    server.kill();
    process.exit(0);
  }
}, 2000);
