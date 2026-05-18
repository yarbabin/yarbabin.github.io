const API_BASE = '/api/db';
const IS_STATIC = import.meta.env.VITE_STATIC_MODE === 'true';

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  let url = `${API_BASE}${endpoint}`;

  if (IS_STATIC && options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE') {
    // Convert API endpoint to static JSON file path
    // e.g. /dashboard -> /data/dashboard.json
    // e.g. /cup-data/123 -> /data/cup-data-123.json
    // e.g. /participants/123/stats?cupId=456 -> /data/participant-123-cup-456.json
    
    let fileName = endpoint.replace(/^\//, '').replace(/\//g, '-');
    
    if (fileName.includes('?')) {
      const [pathPart, queryPart] = fileName.split('?');
      const params = new URLSearchParams(queryPart);
      let querySuffix = '';
      params.forEach((value, key) => {
        querySuffix += `-${key}-${value}`;
      });
      fileName = `${pathPart}${querySuffix}`;
    }
    
    url = `/data/${fileName}.json`;
    // Add base path for GitHub Pages if needed, Vite handles absolute paths from public folder
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  const text = await res.text(); // Читаем ответ как текст
  
  if (!res.ok) {
    let errorMessage = 'API Error';
    try {
      const err = JSON.parse(text);
      errorMessage = err.error || errorMessage;
    } catch (e) {
      errorMessage = text || `HTTP Error ${res.status}`;
    }
    throw new Error(errorMessage);
  }

  if (!text) return {}; // Если ответ пустой, возвращаем пустой объект
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse JSON:', text);
    throw new Error('Invalid JSON response from server');
  }
}

export const api = {
  // Leagues
  getLeagues: () => fetchApi('/leagues'),
  createLeague: (name: string) => fetchApi('/leagues', { method: 'POST', body: JSON.stringify({ name }) }),
  updateLeague: (id: string, name: string) => fetchApi(`/leagues/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteLeague: (id: string) => fetchApi(`/leagues/${id}`, { method: 'DELETE' }),

  // Cups
  getCups: () => fetchApi('/cups'),
  createCup: (name: string, league_ids: string[], scoring_system?: any, perfect_round_bonus?: number) => 
    fetchApi('/cups', { method: 'POST', body: JSON.stringify({ name, league_ids, scoring_system, perfect_round_bonus }) }),
  updateCup: (id: string, name: string, league_ids?: string[], scoring_system?: any, perfect_round_bonus?: number) => 
    fetchApi(`/cups/${id}`, { method: 'PUT', body: JSON.stringify({ name, league_ids, scoring_system, perfect_round_bonus }) }),
  deleteCup: (id: string) => fetchApi(`/cups/${id}`, { method: 'DELETE' }),

  // Participants
  getParticipants: () => fetchApi('/participants'),
  createParticipant: (name: string) => fetchApi('/participants', { method: 'POST', body: JSON.stringify({ name }) }),
  updateParticipant: (id: string, name: string) => fetchApi(`/participants/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteParticipant: (id: string) => fetchApi(`/participants/${id}`, { method: 'DELETE' }),

  // Cup Participants
  getCupParticipants: (cupId: string) => fetchApi(`/cup-participants/${cupId}`),
  assignParticipant: (cup_id: string, participant_id: string, league_id?: string) => fetchApi('/cup-participants', { method: 'POST', body: JSON.stringify({ cup_id, participant_id, league_id }) }),
  removeParticipant: (cupId: string, participantId: string) => fetchApi(`/cup-participants/${cupId}/${participantId}`, { method: 'DELETE' }),

  // Results
  saveResult: (data: any) => fetchApi('/results', { method: 'POST', body: JSON.stringify(data) }),
  getResults: (cupId: string) => fetchApi(`/results/${cupId}`),
  deleteResult: (resultId: string) => fetchApi(`/results/${resultId}`, { method: 'DELETE' }),
  checkResult: (cupId: string, gameNumber: number, participantId: string) => 
    fetchApi(`/results/check?cup_id=${cupId}&game_number=${gameNumber}&participant_id=${participantId}`),

  // Aggregated
  getDashboard: () => fetchApi('/dashboard'),
  getCupData: (id: string) => fetchApi(`/cup-data/${id}`),
  getParticipantStats: (participantId: string, cupId?: string) => {
    const url = cupId ? `/participants/${participantId}/stats?cupId=${cupId}` : `/participants/${participantId}/stats`;
    return fetchApi(url);
  },
  getAnalytics: (cupId?: string) => {
    const url = cupId ? `/analytics?cup_id=${cupId}` : '/analytics';
    return fetchApi(url);
  }
};
