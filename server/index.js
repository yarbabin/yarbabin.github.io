import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const app = express();
// Увеличиваем лимит размера тела запроса, так как картинки в Base64 могут быть большими
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ==========================================
// GEMINI PROXY (VIA OPENROUTER)
// ==========================================
app.post('/api/db/gemini', async (req, res) => {
  const { apiKey, requestBody } = req.body;
  
  const prompt = requestBody.contents[0].parts[0].text;
  const base64Image = requestBody.contents[0].parts[1].inlineData.data;
  const mimeType = requestBody.contents[0].parts[1].inlineData.mimeType || 'image/jpeg';

  try {
    const agent = new HttpsProxyAgent('http://proxy.ptsecurity.com:8080');
    
    // Используем OpenRouter (бесплатная модель Google Gemini Flash)
    const openRouterBody = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
          ]
        }
      ],
      temperature: 0,
      max_tokens: 1000 // Ограничиваем количество токенов в ответе, чтобы влезть в бесплатный лимит
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'PrGuessrCup'
      },
      body: JSON.stringify(openRouterBody),
      agent: agent
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    // Форматируем ответ обратно в формат Gemini
    let jsonString = data.choices[0].message.content;
    // Очищаем от маркдауна, если он есть
    jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    res.json({
      candidates: [
        {
          content: {
            parts: [{ text: jsonString }]
          }
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// LEAGUES
// ==========================================
app.get('/api/db/leagues', (req, res) => {
  const leagues = db.prepare('SELECT * FROM leagues ORDER BY created_at DESC').all();
  res.json(leagues);
});

app.post('/api/db/leagues', (req, res) => {
  const { name } = req.body;
  const id = crypto.randomUUID();
  try {
    db.prepare('INSERT INTO leagues (id, name) VALUES (?, ?)').run(id, name);
    res.json({ id, name });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/db/leagues/:id', (req, res) => {
  const { name } = req.body;
  try {
    db.prepare('UPDATE leagues SET name = ? WHERE id = ?').run(name, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/db/leagues/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM leagues WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// CUPS
// ==========================================
app.get('/api/db/cups', (req, res) => {
  const cups = db.prepare(`
    SELECT * FROM cups ORDER BY created_at DESC
  `).all();
  
  // Fetch leagues for each cup
  cups.forEach(cup => {
    cup.leagues = db.prepare(`
      SELECT l.* FROM leagues l
      JOIN cup_leagues cl ON l.id = cl.league_id
      WHERE cl.cup_id = ?
    `).all(cup.id);
  });
  
  res.json(cups);
});

app.post('/api/db/cups', (req, res) => {
  const { name, league_ids, scoring_system, perfect_round_bonus } = req.body;
  const id = crypto.randomUUID();
  
  // Default scoring system if not provided
  const final_scoring_system = scoring_system 
    ? JSON.stringify(scoring_system) 
    : JSON.stringify({ "1": 25, "2": 18, "3": 15, "4": 12, "5": 10, "6": 8, "7": 6, "8": 4, "9": 2, "10": 1 });
    
  const final_bonus = perfect_round_bonus !== undefined ? perfect_round_bonus : 1;
  
  try {
    db.transaction(() => {
      db.prepare('INSERT INTO cups (id, name, scoring_system, perfect_round_bonus) VALUES (?, ?, ?, ?)').run(id, name, final_scoring_system, final_bonus);
      
      if (league_ids && Array.isArray(league_ids)) {
        const insertLeague = db.prepare('INSERT INTO cup_leagues (cup_id, league_id) VALUES (?, ?)');
        league_ids.forEach(leagueId => {
          insertLeague.run(id, leagueId);
        });
      }
    })();
    res.json({ id, name, league_ids });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/db/cups/:id', (req, res) => {
  const { name, league_ids, scoring_system, perfect_round_bonus } = req.body;
  try {
    db.transaction(() => {
      if (name) {
        db.prepare('UPDATE cups SET name = ? WHERE id = ?').run(name, req.params.id);
      }
      if (scoring_system) {
        db.prepare('UPDATE cups SET scoring_system = ? WHERE id = ?').run(JSON.stringify(scoring_system), req.params.id);
      }
      if (perfect_round_bonus !== undefined) {
        db.prepare('UPDATE cups SET perfect_round_bonus = ? WHERE id = ?').run(perfect_round_bonus, req.params.id);
      }
      
      if (league_ids && Array.isArray(league_ids)) {
        // Replace all leagues for this cup
        db.prepare('DELETE FROM cup_leagues WHERE cup_id = ?').run(req.params.id);
        const insertLeague = db.prepare('INSERT INTO cup_leagues (cup_id, league_id) VALUES (?, ?)');
        league_ids.forEach(leagueId => {
          insertLeague.run(req.params.id, leagueId);
        });
      }
    })();
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/db/cups/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM cups WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// PARTICIPANTS
// ==========================================
app.get('/api/db/participants', (req, res) => {
  const participants = db.prepare('SELECT * FROM participants ORDER BY name ASC').all();
  res.json(participants);
});

app.post('/api/db/participants', (req, res) => {
  const { name } = req.body;
  const id = crypto.randomUUID();
  try {
    db.prepare('INSERT INTO participants (id, name) VALUES (?, ?)').run(id, name);
    res.json({ id, name });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/db/participants/:id', (req, res) => {
  const { name } = req.body;
  try {
    db.prepare('UPDATE participants SET name = ? WHERE id = ?').run(name, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/db/participants/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM participants WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// CUP PARTICIPANTS
// ==========================================
app.get('/api/db/cup-participants/:cupId', (req, res) => {
  const participants = db.prepare(`
    SELECT p.*, cp.league_id, l.name as league_name
    FROM participants p
    JOIN cup_participants cp ON p.id = cp.participant_id
    LEFT JOIN leagues l ON cp.league_id = l.id
    WHERE cp.cup_id = ?
  `).all(req.params.cupId);
  res.json(participants);
});

app.post('/api/db/cup-participants', (req, res) => {
  const { cup_id, participant_id, league_id } = req.body;
  try {
    db.prepare('INSERT INTO cup_participants (cup_id, participant_id, league_id) VALUES (?, ?, ?)').run(cup_id, participant_id, league_id || null);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/db/cup-participants/:cupId/:participantId', (req, res) => {
  try {
    db.prepare('DELETE FROM cup_participants WHERE cup_id = ? AND participant_id = ?').run(req.params.cupId, req.params.participantId);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// RESULTS & GAMES
// ==========================================
app.get('/api/db/results/check', (req, res) => {
  const { cup_id, game_number, participant_id } = req.query;
  
  try {
    const game = db.prepare('SELECT id FROM games WHERE cup_id = ? AND game_number = ?').get(cup_id, game_number);
    if (!game) return res.json(null);

    const result = db.prepare('SELECT * FROM game_results WHERE game_id = ? AND participant_id = ?').get(game.id, participant_id);
    if (!result) return res.json(null);

    const rounds = db.prepare('SELECT * FROM round_details WHERE game_result_id = ? ORDER BY round_number ASC').all(result.id);
    
    res.json({
      total_score: result.total_score,
      rounds: rounds.map(r => ({
        round_number: r.round_number,
        score: r.score,
        yearsOff: r.years_off,
        distanceMeters: r.distance_meters
      }))
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/db/results', (req, res) => {
  const { cup_id, game_number, participant_id, total_score, rounds } = req.body;
  
  try {
    db.transaction(() => {
      // 1. Find or create game
      let game = db.prepare('SELECT id FROM games WHERE cup_id = ? AND game_number = ?').get(cup_id, game_number);
      if (!game) {
        const gameId = crypto.randomUUID();
        const isFinal = game_number === 10 ? 1 : 0;
        db.prepare('INSERT INTO games (id, cup_id, game_number, is_final) VALUES (?, ?, ?, ?)').run(gameId, cup_id, game_number, isFinal);
        game = { id: gameId };
      }

      // 2. Check if result already exists and delete it if so (to overwrite)
      const existingResult = db.prepare('SELECT id FROM game_results WHERE game_id = ? AND participant_id = ?').get(game.id, participant_id);
      if (existingResult) {
        db.prepare('DELETE FROM game_results WHERE id = ?').run(existingResult.id);
      }

      // 3. Create game_result
      const resultId = crypto.randomUUID();
      db.prepare('INSERT INTO game_results (id, game_id, participant_id, total_score) VALUES (?, ?, ?, ?)').run(resultId, game.id, participant_id, total_score);

      // 4. Create round_details
      if (rounds && rounds.length > 0) {
        const insertRound = db.prepare('INSERT INTO round_details (id, game_result_id, round_number, score, years_off, distance_meters) VALUES (?, ?, ?, ?, ?, ?)');
        
        rounds.forEach((r) => {
          if (r.score !== undefined && r.yearsOff !== undefined && r.distanceMeters !== undefined) {
            insertRound.run(crypto.randomUUID(), resultId, r.roundNumber, r.score, r.yearsOff, r.distanceMeters);
          }
        });
      }
    })();

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/db/results/:cupId', (req, res) => {
  // Get all results for a cup to allow deletion
  const results = db.prepare(`
    SELECT gr.id as result_id, g.game_number, p.name as participant_name, gr.total_score, gr.created_at
    FROM game_results gr
    JOIN games g ON gr.game_id = g.id
    JOIN participants p ON gr.participant_id = p.id
    WHERE g.cup_id = ?
    ORDER BY g.game_number DESC, gr.created_at DESC
  `).all(req.params.cupId);
  res.json(results);
});

app.delete('/api/db/results/:resultId', (req, res) => {
  try {
    db.prepare('DELETE FROM game_results WHERE id = ?').run(req.params.resultId);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// AGGREGATED DATA (DASHBOARD & CUP PAGE)
// ==========================================
app.get('/api/db/dashboard', (req, res) => {
  const leagues = db.prepare('SELECT * FROM leagues ORDER BY created_at DESC').all();
  const cups = db.prepare(`
    SELECT * FROM cups ORDER BY created_at DESC
  `).all();

  // Calculate top 3 and fetch leagues for each cup
  cups.forEach(cup => {
    const cupData = getCupDataLogic(cup.id);
    if (cupData) {
      cup.leagues = cupData.leagues.map(l => ({ 
        id: l.id, 
        name: l.name,
        top3: l.leaderboard.slice(0, 3).map(p => ({ name: p.name, totalGp: p.totalGp }))
      }));
    } else {
      cup.leagues = [];
    }
  });

  res.json({ leagues, cups });
});

function getCupDataLogic(cupId) {
  const cup = db.prepare('SELECT * FROM cups WHERE id = ?').get(cupId);
  if (!cup) return null;

  const cupLeagues = db.prepare(`
    SELECT l.* FROM leagues l
    JOIN cup_leagues cl ON l.id = cl.league_id
    WHERE cl.cup_id = ?
    ORDER BY l.created_at ASC
  `).all(cup.id);

  const scoringSystem = JSON.parse(cup.scoring_system);
  const perfectBonus = cup.perfect_round_bonus;
  
  const games = db.prepare('SELECT id, game_number FROM games WHERE cup_id = ? ORDER BY game_number ASC').all(cup.id);
  
  const participants = db.prepare(`
    SELECT p.id, p.name, cp.league_id 
    FROM participants p
    JOIN cup_participants cp ON p.id = cp.participant_id
    WHERE cp.cup_id = ?
  `).all(cup.id);

  const allResults = db.prepare(`
    SELECT gr.id as result_id, gr.game_id, gr.participant_id, gr.total_score, g.game_number
    FROM game_results gr
    JOIN games g ON gr.game_id = g.id
    WHERE g.cup_id = ?
  `).all(cup.id);

  const allRounds = db.prepare(`
    SELECT rd.*, gr.participant_id, g.game_number
    FROM round_details rd
    JOIN game_results gr ON rd.game_result_id = gr.id
    JOIN games g ON gr.game_id = g.id
    WHERE g.cup_id = ?
  `).all(cup.id);

  const roundsByResult = {};
  allRounds.forEach(r => {
    if (!roundsByResult[r.game_result_id]) roundsByResult[r.game_result_id] = [];
    roundsByResult[r.game_result_id].push(r);
  });

  const leagueData = cupLeagues.map((league, index) => {
    const leagueParticipants = participants.filter(p => p.league_id === league.id);
    const playerStats = {};
    leagueParticipants.forEach(p => {
      playerStats[p.id] = { id: p.id, name: p.name, totalGp: 0, games: {}, cumulativeGp: {} };
    });

    let maxGamePlayed = 0;

    games.forEach(game => {
      const gameResults = allResults.filter(r => r.game_id === game.id && playerStats[r.participant_id]);
      if (gameResults.length > 0) {
        maxGamePlayed = Math.max(maxGamePlayed, game.game_number);
      }

      gameResults.sort((a, b) => b.total_score - a.total_score);

      let currentRank = 1;
      for (let i = 0; i < gameResults.length; i++) {
        if (i > 0 && gameResults[i].total_score < gameResults[i-1].total_score) {
          currentRank = i + 1;
        }
        
        const pId = gameResults[i].participant_id;
        let gpPoints = scoringSystem[currentRank.toString()] || 0;
        
        const rounds = roundsByResult[gameResults[i].result_id] || [];
        const perfectRounds = rounds.filter(r => r.score === 10000).length;
        const bonusPoints = perfectRounds * perfectBonus;
        
        let totalPointsForGame = gpPoints + bonusPoints;
        if (cup.name === 'Кубок Нормандии') {
          totalPointsForGame = gameResults[i].total_score;
        }

        playerStats[pId].totalGp += totalPointsForGame;
        playerStats[pId].games[game.game_number] = {
          score: gameResults[i].total_score,
          gp: gpPoints,
          bonus: bonusPoints,
          total: totalPointsForGame,
          rank: currentRank,
          rounds: rounds.sort((a, b) => a.round_number - b.round_number)
        };
      }

      Object.values(playerStats).forEach(p => {
        p.cumulativeGp[game.game_number] = p.totalGp;
      });
    });

    const getRankAtGame = (gameNum) => {
      const sorted = Object.values(playerStats).sort((a, b) => (b.cumulativeGp[gameNum] || 0) - (a.cumulativeGp[gameNum] || 0));
      const ranks = {};
      let rank = 1;
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && (sorted[i].cumulativeGp[gameNum] || 0) < (sorted[i-1].cumulativeGp[gameNum] || 0)) {
          rank = i + 1;
        }
        ranks[sorted[i].id] = rank;
      }
      return ranks;
    };

    const ranksCurrent = getRankAtGame(maxGamePlayed);
    const ranksPrevious = getRankAtGame(maxGamePlayed - 1);

    const leaderboard = Object.values(playerStats).map(p => {
      let trend = 'same';
      if (maxGamePlayed > 1 && p.games[maxGamePlayed]) {
        const prevRank = ranksPrevious[p.id] || 999;
        const currRank = ranksCurrent[p.id] || 999;
        if (currRank < prevRank) trend = 'up';
        else if (currRank > prevRank) trend = 'down';
      }
      return {
        ...p,
        trend
      };
    }).sort((a, b) => b.totalGp - a.totalGp);

    // --- ANALYTICS CALCULATION ---
    const analytics = { cup: {}, games: {} };
    let totalDistanceMeters = 0;
    let totalYearsOff = 0;
    const maxGameNum = games.length > 0 ? Math.max(...games.map(g => g.game_number)) : 0;
    const minGameNum = games.length > 0 ? Math.min(...games.map(g => g.game_number)) : 0;

    const playerMetrics = Object.values(playerStats).map(p => {
      let totalDist = 0, totalYears = 0, roundsCount = 0;
      let scores = [];
      Object.values(p.games).forEach(g => {
        scores.push(g.score);
        g.rounds.forEach(r => {
          totalDist += r.distance_meters;
          totalYears += r.years_off;
          roundsCount++;
          totalDistanceMeters += r.distance_meters;
          totalYearsOff += r.years_off;
        });
      });
      const avgDist = roundsCount > 0 ? totalDist / roundsCount : Infinity;
      const avgYears = roundsCount > 0 ? totalYears / roundsCount : Infinity;
      const meanScore = scores.length > 0 ? scores.reduce((a,b)=>a+b,0)/scores.length : 0;
      const variance = scores.length > 1 ? scores.reduce((a,b)=>a + Math.pow(b - meanScore, 2), 0) / scores.length : Infinity;
      return { id: p.id, name: p.name, avgDist, avgYears, variance, scoresCount: scores.length };
    });

    const validPlayers = playerMetrics.filter(p => p.scoresCount > 0);
    const validVariancePlayers = playerMetrics.filter(p => p.scoresCount > 1);

    const chiefGeographer = validPlayers.reduce((min, p) => p.avgDist < min.avgDist ? p : min, {avgDist: Infinity});
    const keeperOfEpochs = validPlayers.reduce((min, p) => p.avgYears < min.avgYears ? p : min, {avgYears: Infinity});
    const ironclad = validVariancePlayers.reduce((min, p) => p.variance < min.variance ? p : min, {variance: Infinity});
    const rollercoaster = validVariancePlayers.reduce((max, p) => (p.variance !== Infinity && p.variance > max.variance) ? p : max, {variance: -1});

    let comebacker = null;
    let maxRankJump = 0;
    if (maxGamePlayed >= 2) {
      const finalRanks = getRankAtGame(maxGamePlayed);
      const earlyGameNum = Math.min(maxGamePlayed, 2); // Check rank at game 2 (or 1 if only 1 game, but we checked >= 2)
      const earlyRanks = getRankAtGame(earlyGameNum);
      const totalPlayers = Object.keys(playerStats).length;
      
      Object.values(playerStats).forEach(p => {
        const finalRank = finalRanks[p.id];
        const earlyRank = earlyRanks[p.id];
        // Outsider = bottom half. Top 5 = <= 5.
        if (finalRank <= 5 && earlyRank > (totalPlayers / 2)) {
          const jump = earlyRank - finalRank;
          if (jump > maxRankJump) {
            maxRankJump = jump;
            comebacker = { id: p.id, name: p.name, from: earlyRank, to: finalRank };
          }
        }
      });
    }

    const disasterScaleKm = totalDistanceMeters / 1000;
    const timeTravelYears = totalYearsOff;
    
    let needsWork = null;
    if (totalDistanceMeters > 0 || totalYearsOff > 0) {
      // Heuristic: 1 year off is roughly equivalent to 100km off in terms of losing points
      needsWork = (totalYearsOff * 100) > (totalDistanceMeters / 1000) ? 'years' : 'locations';
    }

    let gotSmarter = null;
    if (minGameNum !== maxGameNum && maxGamePlayed > 1) {
      let firstSum = 0, firstCount = 0;
      let lastSum = 0, lastCount = 0;
      Object.values(playerStats).forEach(p => {
        if (p.games[minGameNum]) { firstSum += p.games[minGameNum].score; firstCount++; }
        if (p.games[maxGameNum]) { lastSum += p.games[maxGameNum].score; lastCount++; }
      });
      const firstAvg = firstCount > 0 ? firstSum / firstCount : 0;
      const lastAvg = lastCount > 0 ? lastSum / lastCount : 0;
      gotSmarter = lastAvg > firstAvg;
    }

    analytics.cup = {
      chiefGeographer: chiefGeographer.avgDist !== Infinity ? chiefGeographer : null,
      keeperOfEpochs: keeperOfEpochs.avgYears !== Infinity ? keeperOfEpochs : null,
      ironclad: ironclad.variance !== Infinity ? ironclad : null,
      rollercoaster: rollercoaster.variance !== -1 ? rollercoaster : null,
      comebacker,
      disasterScaleKm,
      timeTravelYears,
      needsWork,
      gotSmarter
    };

    games.forEach(game => {
      const gNum = game.game_number;
      let minAvgDist = Infinity, iWasHere = null;
      let minAvgYears = Infinity, iLivedHere = null;
      const roundScores = {1:[], 2:[], 3:[], 4:[], 5:[]};

      Object.values(playerStats).forEach(p => {
        const gData = p.games[gNum];
        if (gData) {
          let pTotalYears = 0, pTotalDist = 0, pRounds = 0;
          gData.rounds.forEach(r => {
            pTotalDist += r.distance_meters;
            pTotalYears += r.years_off;
            pRounds++;
            if (roundScores[r.round_number]) {
              roundScores[r.round_number].push(r.score);
            }
          });
          if (pRounds > 0) {
            const pAvgDist = pTotalDist / pRounds;
            if (pAvgDist < minAvgDist) {
              minAvgDist = pAvgDist;
              iWasHere = { id: p.id, name: p.name, distance: pAvgDist };
            }
            
            const pAvgYears = pTotalYears / pRounds;
            if (pAvgYears < minAvgYears) {
              minAvgYears = pAvgYears;
              iLivedHere = { id: p.id, name: p.name, avgYears: pAvgYears };
            }
          }
        }
      });

      let hardestRound = null, minAvgScore = Infinity;
      Object.keys(roundScores).forEach(rNum => {
        const scores = roundScores[rNum];
        if (scores.length > 0) {
          const avg = scores.reduce((a,b)=>a+b,0)/scores.length;
          if (avg < minAvgScore) {
            minAvgScore = avg;
            hardestRound = { round: rNum, avgScore: avg };
          }
        }
      });

      if (iWasHere || iLivedHere || hardestRound) {
        analytics.games[gNum] = { iWasHere, iLivedHere, stuckInTextures: hardestRound };
      }
    });
    // --- END ANALYTICS CALCULATION ---

    return {
      ...league,
      tier: index + 1,
      isTopLeague: index === 0,
      isBottomLeague: index === cupLeagues.length - 1,
      leaderboard,
      analytics
    };
  });

  return { cup, leagues: leagueData };
}

app.get('/api/db/cup-data/:id', (req, res) => {
  const data = getCupDataLogic(req.params.id);
  if (!data) return res.status(404).json({ error: 'Cup not found' });
  res.json(data);
});

app.get('/api/db/participants/:id/stats', (req, res) => {
  const participantId = req.params.id;
  const currentCupId = req.query.cupId;

  const participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(participantId);
  if (!participant) return res.status(404).json({ error: 'Participant not found' });

  // All results for this participant across all cups
  const allResults = db.prepare(`
    SELECT gr.total_score, g.game_number, c.name as cup_name, c.id as cup_id
    FROM game_results gr
    JOIN games g ON gr.game_id = g.id
    JOIN cups c ON g.cup_id = c.id
    WHERE gr.participant_id = ?
  `).all(participantId);

  let bestResultAllTime = null;
  let averageResultAllTime = 0;
  let bestResultInCup = null;
  let averageResultInCup = 0;

  if (allResults.length > 0) {
    let sumAll = 0;
    let maxAll = -1;
    let maxAllGame = null;

    let sumCup = 0;
    let countCup = 0;
    let maxCup = -1;
    let maxCupGame = null;

    allResults.forEach(r => {
      sumAll += r.total_score;
      if (r.total_score > maxAll) {
        maxAll = r.total_score;
        maxAllGame = r;
      }

      if (r.cup_id === currentCupId) {
        sumCup += r.total_score;
        countCup++;
        if (r.total_score > maxCup) {
          maxCup = r.total_score;
          maxCupGame = r;
        }
      }
    });

    averageResultAllTime = sumAll / allResults.length;
    bestResultAllTime = maxAllGame;

    if (countCup > 0) {
      averageResultInCup = sumCup / countCup;
      bestResultInCup = maxCupGame;
    }
  }

  // Calculate places in cups
  // Find all cups this participant is in
  const participantCups = db.prepare(`
    SELECT DISTINCT cup_id 
    FROM cup_participants 
    WHERE participant_id = ?
    UNION
    SELECT DISTINCT g.cup_id
    FROM game_results gr
    JOIN games g ON gr.game_id = g.id
    WHERE gr.participant_id = ?
  `).all(participantId, participantId);

  let currentCupPlace = null;
  const previousCupsPlaces = [];

  participantCups.forEach(pc => {
    const cupData = getCupDataLogic(pc.cup_id);
    if (!cupData) return;

    // Find the participant in the leagues
    let foundPlace = null;
    let foundLeagueName = null;

    for (const league of cupData.leagues) {
      const idx = league.leaderboard.findIndex(p => p.id === participantId);
      if (idx !== -1) {
        foundPlace = idx + 1;
        foundLeagueName = league.name;
        break;
      }
    }

    if (foundPlace !== null) {
      if (pc.cup_id === currentCupId) {
        currentCupPlace = { place: foundPlace, league_name: foundLeagueName };
      } else {
        previousCupsPlaces.push({
          cup_name: cupData.cup.name,
          place: foundPlace,
          league_name: foundLeagueName,
          created_at: cupData.cup.created_at
        });
      }
    }
  });

  // Sort previous cups by created_at descending
  previousCupsPlaces.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({
    participant,
    bestResultAllTime,
    averageResultAllTime,
    bestResultInCup,
    averageResultInCup,
    currentCupPlace,
    previousCupsPlaces
  });
});

// ==========================================
// ANALYTICS
// ==========================================
app.get('/api/db/analytics', (req, res) => {
  try {
    // 1. Best result
    const bestResult = db.prepare(`
      SELECT gr.id, gr.total_score, p.id as participant_id, p.name as participant_name, g.game_number, c.id as cup_id, c.name as cup_name
      FROM game_results gr
      JOIN participants p ON gr.participant_id = p.id
      JOIN games g ON gr.game_id = g.id
      JOIN cups c ON g.cup_id = c.id
      ORDER BY gr.total_score DESC
      LIMIT 1
    `).get();

    if (bestResult) {
      bestResult.rounds = db.prepare(`
        SELECT round_number, score, years_off, distance_meters
        FROM round_details
        WHERE game_result_id = ?
        ORDER BY round_number ASC
      `).all(bestResult.id);
    }

    // 2. Best average result
    const bestAverage = db.prepare(`
      SELECT p.id as participant_id, p.name as participant_name, AVG(gr.total_score) as avg_score, COUNT(gr.id) as games_played
      FROM game_results gr
      JOIN participants p ON gr.participant_id = p.id
      JOIN games g ON gr.game_id = g.id
      GROUP BY p.id
      HAVING games_played >= 5
      ORDER BY avg_score DESC
      LIMIT 1
    `).get();

    // 3. Closest distance guess (excluding 0)
    const closestDistance = db.prepare(`
      SELECT rd.distance_meters, rd.round_number, p.id as participant_id, p.name as participant_name, g.game_number, c.id as cup_id, c.name as cup_name
      FROM round_details rd
      JOIN game_results gr ON rd.game_result_id = gr.id
      JOIN participants p ON gr.participant_id = p.id
      JOIN games g ON gr.game_id = g.id
      JOIN cups c ON g.cup_id = c.id
      WHERE rd.distance_meters > 0
      ORDER BY rd.distance_meters ASC
      LIMIT 1
    `).get();

    // 4. Best average years off
    const bestAvgYears = db.prepare(`
      SELECT p.id as participant_id, p.name as participant_name, AVG(rd.years_off) as avg_years_off, COUNT(DISTINCT gr.id) as games_played
      FROM round_details rd
      JOIN game_results gr ON rd.game_result_id = gr.id
      JOIN participants p ON gr.participant_id = p.id
      JOIN games g ON gr.game_id = g.id
      GROUP BY p.id
      HAVING games_played >= 5
      ORDER BY avg_years_off ASC
      LIMIT 1
    `).get();

    // 5. Best average distance
    const bestAvgDistance = db.prepare(`
      SELECT p.id as participant_id, p.name as participant_name, AVG(rd.distance_meters) as avg_distance, COUNT(DISTINCT gr.id) as games_played
      FROM round_details rd
      JOIN game_results gr ON rd.game_result_id = gr.id
      JOIN participants p ON gr.participant_id = p.id
      JOIN games g ON gr.game_id = g.id
      GROUP BY p.id
      HAVING games_played >= 5
      ORDER BY avg_distance ASC
      LIMIT 1
    `).get();

    res.json({
      bestResult,
      bestAverage,
      closestDistance,
      bestAvgYears,
      bestAvgDistance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;

async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV === 'development') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: projectRoot,
      configFile: path.join(projectRoot, 'vite.config.ts'),
      server: {
        middlewareMode: true,
        hmr: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite dev mode with HMR enabled');
  }

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nPort ${PORT} is already in use.`);
      console.error('Stop the other process or use another port, e.g.:');
      console.error(`  $env:PORT=3002; npm run dev   (PowerShell)`);
      console.error('To free port 3001 on Windows:');
      console.error(`  netstat -ano | findstr ":${PORT}"`);
      console.error('  Stop-Process -Id <PID> -Force');
      process.exit(1);
    }
    throw err;
  });

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (process.env.NODE_ENV === 'development') {
      console.log('Open this URL in the browser for the dev UI (API + frontend).');
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
