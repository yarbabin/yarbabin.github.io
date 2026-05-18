import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('results'); // results, setup, manage

  // Setup state
  const [leagues, setLeagues] = useState<any[]>([]);
  const [cups, setCups] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  
  // New entry state
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newCupName, setNewCupName] = useState('');
  const [selectedLeagueIds, setSelectedLeagueIds] = useState<string[]>([]);
  const [newCupScoring, setNewCupScoring] = useState('25, 18, 15, 12, 10, 8, 6, 4, 2, 1');
  const [newCupBonus, setNewCupBonus] = useState(1);
  const [newParticipantName, setNewParticipantName] = useState('');

  // Result entry state
  const [selectedCupId, setSelectedCupId] = useState('');
  const [selectedGameNumber, setSelectedGameNumber] = useState(1);
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [cupParticipants, setCupParticipants] = useState<any[]>([]);
  
  const [totalScore, setTotalScore] = useState<number | ''>('');
  const [rounds, setRounds] = useState(Array(5).fill({ score: '', yearsOff: '', distanceMeters: '' }));
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<{type: 'success'|'warning'|'error', text: string} | null>(null);
  const [saveStatus, setSaveStatus] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Manage state
  const [resultsList, setResultsList] = useState<any[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSetupData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedCupId) {
      fetchCupParticipants(selectedCupId);
      if (activeTab === 'manage') {
        fetchResultsList(selectedCupId);
      }
    }
  }, [selectedCupId, activeTab]);

  useEffect(() => {
    if (selectedCupId && selectedGameNumber && selectedParticipantId && activeTab === 'results') {
      checkExistingResult();
    }
  }, [selectedCupId, selectedGameNumber, selectedParticipantId, activeTab]);

  const checkExistingResult = async () => {
    try {
      const data = await api.checkResult(selectedCupId, selectedGameNumber, selectedParticipantId);
      if (data) {
        setTotalScore(data.total_score);
        // Ensure we have 5 rounds
        const newRounds = Array(5).fill({ score: '', yearsOff: '', distanceMeters: '' });
        data.rounds.forEach((r: any) => {
          const idx = r.round_number ? r.round_number - 1 : -1;
          if (idx >= 0 && idx < 5) {
            newRounds[idx] = {
              score: r.score !== null ? r.score : '',
              yearsOff: r.yearsOff !== null ? r.yearsOff : '',
              distanceMeters: r.distanceMeters !== null ? r.distanceMeters : ''
            };
          }
        });
        setRounds(newRounds);
      } else {
        setTotalScore('');
        setRounds(Array(5).fill({ score: '', yearsOff: '', distanceMeters: '' }));
      }
    } catch (e) {
      console.error('Error checking existing result', e);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert('Неверный пароль');
    }
  };

  const fetchSetupData = async () => {
    try {
      const [lData, cData, pData] = await Promise.all([
        api.getLeagues(),
        api.getCups(),
        api.getParticipants()
      ]);
      setLeagues(lData);
      setCups(cData);
      setParticipants(pData);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCupParticipants = async (cupId: string) => {
    try {
      const data = await api.getCupParticipants(cupId);
      setCupParticipants(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchResultsList = async (cupId: string) => {
    try {
      const data = await api.getResults(cupId);
      setResultsList(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddLeague = async () => {
    if (!newLeagueName) return;
    try {
      await api.createLeague(newLeagueName);
      setNewLeagueName('');
      fetchSetupData();
    } catch (error: any) {
      alert('Ошибка при добавлении лиги: ' + error.message);
    }
  };

  const handleAddCup = async () => {
    if (!newCupName || selectedLeagueIds.length === 0) {
      return alert('Введите название кубка и выберите хотя бы одну лигу');
    }
    
    // Parse scoring system
    const scoringObj: Record<string, number> = {};
    const pointsArray = newCupScoring.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    pointsArray.forEach((pts, idx) => {
      scoringObj[(idx + 1).toString()] = pts;
    });

    try {
      await api.createCup(newCupName, selectedLeagueIds, scoringObj, newCupBonus);
      setNewCupName('');
      setSelectedLeagueIds([]);
      setNewCupScoring('25, 18, 15, 12, 10, 8, 6, 4, 2, 1');
      setNewCupBonus(1);
      fetchSetupData();
    } catch (error: any) {
      alert('Ошибка при добавлении кубка: ' + error.message);
    }
  };

  const handleAddParticipant = async () => {
    if (!newParticipantName) return;
    try {
      await api.createParticipant(newParticipantName);
      setNewParticipantName('');
      fetchSetupData();
    } catch (error: any) {
      alert('Ошибка при добавлении участника: ' + error.message);
    }
  };

  const handleAssignParticipant = async (participantId: string) => {
    if (!selectedCupId) return alert('Выберите кубок');
    
    // Find the cup to see its leagues
    const cup = cups.find(c => c.id === selectedCupId);
    let leagueId = undefined;
    
    if (cup && cup.leagues && cup.leagues.length > 0) {
      if (cup.leagues.length === 1) {
        // If cup has only one league, auto-assign it
        leagueId = cup.leagues[0].id;
      } else {
        // If multiple leagues, ask user
        const leaguesText = cup.leagues.map((l: any, idx: number) => `${idx + 1}. ${l.name}`).join('\n');
        const input = prompt(`В какой лиге играет этот участник в данном кубке?\n\n${leaguesText}\n\nВведите номер (или оставьте пустым, если без лиги):`);
        
        if (input) {
          const idx = parseInt(input, 10) - 1;
          if (idx >= 0 && idx < cup.leagues.length) {
            leagueId = cup.leagues[idx].id;
          }
        }
      }
    }

    try {
      await api.assignParticipant(selectedCupId, participantId, leagueId);
      fetchCupParticipants(selectedCupId);
    } catch (error: any) {
      alert('Ошибка при назначении участника: ' + error.message);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!selectedCupId) return;
    try {
      await api.removeParticipant(selectedCupId, participantId);
      fetchCupParticipants(selectedCupId);
    } catch (error: any) {
      alert('Ошибка при удалении участника из кубка: ' + error.message);
    }
  };

  // Manage functions
  const handleDeleteLeague = async (id: string) => {
    if (!confirm('Удалить лигу? Все кубки и игры в ней также будут удалены!')) return;
    try {
      await api.deleteLeague(id);
      fetchSetupData();
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    }
  };

  const handleEditLeague = async (id: string, oldName: string) => {
    const newName = prompt('Новое название лиги:', oldName);
    if (!newName || newName === oldName) return;
    try {
      await api.updateLeague(id, newName);
      fetchSetupData();
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    }
  };

  const handleDeleteCup = async (id: string) => {
    if (!confirm('Удалить кубок? Все результаты игр будут удалены!')) return;
    try {
      await api.deleteCup(id);
      fetchSetupData();
      if (selectedCupId === id) setSelectedCupId('');
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    }
  };

  const handleEditCup = async (cup: any) => {
    const newName = prompt('Новое название кубка:', cup.name);
    if (!newName) return;
    
    // Edit scoring system
    let currentScoringStr = '';
    try {
      const scoring = typeof cup.scoring_system === 'string' ? JSON.parse(cup.scoring_system) : cup.scoring_system;
      currentScoringStr = Object.values(scoring).join(', ');
    } catch (e) {
      currentScoringStr = '25, 18, 15, 12, 10, 8, 6, 4, 2, 1';
    }
    
    const newScoringStr = prompt('Очки за места (через запятую, начиная с 1-го места):', currentScoringStr);
    let scoringObj: Record<string, number> | undefined = undefined;
    
    if (newScoringStr && newScoringStr !== currentScoringStr) {
      scoringObj = {};
      const pointsArray = newScoringStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      pointsArray.forEach((pts, idx) => {
        scoringObj![(idx + 1).toString()] = pts;
      });
    }

    const newBonusStr = prompt('Бонус за идеальный раунд (10000 очков):', cup.perfect_round_bonus?.toString() || '1');
    const perfect_round_bonus = newBonusStr ? parseInt(newBonusStr, 10) : undefined;

    // Simple prompt for leagues (in a real app, this would be a proper modal with checkboxes)
    const currentLeagueNames = cup.leagues?.map((l: any) => l.name).join(', ') || '';
    const updateLeagues = confirm(`Текущие лиги: ${currentLeagueNames}\nХотите изменить привязку к лигам?`);
    
    let newLeagueIds = undefined;
    if (updateLeagues) {
      const leaguesText = leagues.map(l => `${l.id.substring(0,4)}... - ${l.name}`).join('\n');
      const input = prompt(`Введите ID лиг через запятую:\n${leaguesText}`);
      if (input !== null) {
        // Find matching leagues by name or ID prefix
        newLeagueIds = input.split(',').map(s => s.trim()).map(inputStr => {
          const l = leagues.find(l => l.id.startsWith(inputStr) || l.name.toLowerCase() === inputStr.toLowerCase());
          return l ? l.id : null;
        }).filter(Boolean);
      }
    }

    try {
      await api.updateCup(cup.id, newName, newLeagueIds, scoringObj, perfect_round_bonus);
      fetchSetupData();
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    }
  };

  const handleDeleteParticipant = async (id: string) => {
    if (!confirm('Удалить участника из базы? Его результаты также удалятся.')) return;
    try {
      await api.deleteParticipant(id);
      fetchSetupData();
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    }
  };

  const handleEditParticipant = async (id: string, oldName: string) => {
    const newName = prompt('Новое имя участника:', oldName);
    if (!newName || newName === oldName) return;
    try {
      await api.updateParticipant(id, newName);
      fetchSetupData();
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    }
  };

  const handleDeleteResult = async (id: string) => {
    if (!confirm('Удалить этот результат?')) return;
    try {
      await api.deleteResult(id);
      fetchResultsList(selectedCupId);
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    }
  };

  const handleRoundChange = (index: number, field: string, value: string) => {
    const newRounds = [...rounds];
    newRounds[index] = { ...newRounds[index], [field]: value };
    setRounds(newRounds);
  };

  const processImage = async (file: File) => {
    setOcrLoading(true);
    setOcrStatus(null);
    try {
      // Конвертируем файл в Base64 (без префикса data:image/...)
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      if (!apiKey) {
        setOcrStatus({ type: 'error', text: 'Пожалуйста, добавьте VITE_OPENROUTER_API_KEY в файл .env' });
        setOcrLoading(false);
        return;
      }

      const prompt = `You are an expert data extractor. Analyze this TimeGuessr result screenshot.
      Extract the total score and the details for all 5 rounds.
      Return ONLY a valid JSON object with this exact structure:
      {
        "totalScore": 46541,
        "rounds": [
          { "score": 10000, "yearsOff": 0, "distanceMeters": 19 },
          { "score": 7783, "yearsOff": 6, "distanceMeters": 117500 }
        ]
      }
      Rules:
      - totalScore is the main big number at the top (max 50000).
      - distanceMeters MUST be converted to METERS (if the image says 5.9km, write 5900. If 19.4m, write 19).
      - yearsOff is the number of years.
      - score is the points for the round (max 10000).`;

      const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: file.type || 'image/jpeg',
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
        }
      };

      // Отправляем запрос на наш собственный локальный бэкенд (Node.js),
      // который создаст абсолютно "чистый" запрос к Google через корпоративный прокси.
      const response = await fetch('/api/db/gemini', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey, requestBody })
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = 'Gemini API Error';
        try {
          const err = JSON.parse(text);
          errorMessage = err.error?.message || errorMessage;
        } catch (e) {
          errorMessage = `HTTP Error ${response.status}: ${text.substring(0, 100)}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const jsonString = data.candidates[0].content.parts[0].text;
      const parsedData = JSON.parse(jsonString);

      if (parsedData.totalScore) setTotalScore(parsedData.totalScore);
      
      if (parsedData.rounds && Array.isArray(parsedData.rounds)) {
        const newRounds = Array(5).fill({ score: '', yearsOff: '', distanceMeters: '' });
        let roundsSum = 0;
        
        parsedData.rounds.forEach((r: any, i: number) => {
          if (i < 5) {
            newRounds[i] = {
              score: r.score ?? '',
              yearsOff: r.yearsOff ?? '',
              distanceMeters: r.distanceMeters ?? ''
            };
            if (typeof r.score === 'number') roundsSum += r.score;
          }
        });
        setRounds(newRounds);

        if (parsedData.totalScore && parsedData.totalScore !== roundsSum) {
          setOcrStatus({ type: 'warning', text: `ВНИМАНИЕ! Сумма очков за раунды (${roundsSum}) НЕ СОВПАДАЕТ с общим счетом (${parsedData.totalScore}). Возможно, нейросеть ошиблась.` });
        } else {
          setOcrStatus({ type: 'success', text: 'Распознавание успешно завершено! Сумма очков совпадает.' });
        }
      }

    } catch (error: any) {
      console.error('AI Error', error);
      setOcrStatus({ type: 'error', text: 'Ошибка при распознавании текста: ' + error.message });
    } finally {
      setOcrLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImage(file);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (activeTab !== 'results') return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processImage(file);
            break; // Обрабатываем только первое изображение
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [activeTab]);

  const handleSaveResult = async () => {
    if (!selectedCupId || !selectedParticipantId || totalScore === '') {
      setSaveStatus({ type: 'error', text: 'Заполните все обязательные поля' });
      return;
    }

    setSaveStatus(null);
    try {
      await api.saveResult({
        cup_id: selectedCupId,
        game_number: selectedGameNumber,
        participant_id: selectedParticipantId,
        total_score: totalScore,
        rounds: rounds
          .map((r, index) => {
            // Check if any of the fields are filled. If so, parse them (empty string becomes NaN, which we'll handle or treat as 0 if needed, but here we require valid numbers or empty string)
            // Wait, if they enter 0, it's a valid number.
            const s = r.score !== undefined && r.score !== null ? r.score.toString().trim() : '';
            const y = r.yearsOff !== undefined && r.yearsOff !== null ? r.yearsOff.toString().trim() : '';
            const d = r.distanceMeters !== undefined && r.distanceMeters !== null ? r.distanceMeters.toString().trim() : '';
            
            if (s !== '' && y !== '' && d !== '') {
              return {
                roundNumber: index + 1,
                score: parseInt(s, 10),
                yearsOff: parseInt(y, 10),
                distanceMeters: parseInt(d, 10)
              };
            }
            return null;
          })
          .filter(r => r !== null)
      });

      setSaveStatus({ type: 'success', text: 'Результат успешно сохранен!' });
      setTimeout(() => setSaveStatus(null), 3000);

      // Reset form
      setTotalScore('');
      setRounds(Array(5).fill({ score: '', yearsOff: '', distanceMeters: '' }));
      setOcrStatus(null);
      if (activeTab === 'manage') fetchResultsList(selectedCupId);
      
    } catch (error: any) {
      console.error('Save error', error);
      setSaveStatus({ type: 'error', text: 'Ошибка при сохранении: ' + error.message });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 brutal-card p-8">
        <h2 className="text-3xl font-black uppercase tracking-tight mb-8 text-center text-black">Вход в Админку</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-lg font-black uppercase mb-2 text-black">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="brutal-input"
            />
          </div>
          <button type="submit" className="brutal-button bg-primary text-white w-full text-xl py-4">
            Войти
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-5xl font-black uppercase tracking-tight mb-10 text-black drop-shadow-[4px_4px_0px_#fff]">Панель Администратора</h1>
      
      <div className="flex flex-wrap gap-4 mb-10">
        <button 
          onClick={() => setActiveTab('results')}
          className={`brutal-button ${activeTab === 'results' ? 'bg-primary text-white' : 'bg-white text-black hover:bg-secondary'}`}
        >
          Ввод результатов
        </button>
        <button 
          onClick={() => setActiveTab('setup')}
          className={`brutal-button ${activeTab === 'setup' ? 'bg-primary text-white' : 'bg-white text-black hover:bg-secondary'}`}
        >
          Настройка турнира
        </button>
        <button 
          onClick={() => setActiveTab('manage')}
          className={`brutal-button ${activeTab === 'manage' ? 'bg-primary text-white' : 'bg-white text-black hover:bg-secondary'}`}
        >
          Управление данными
        </button>
      </div>

      {activeTab === 'setup' && (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="brutal-card p-6 bg-[#cb99ff]">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-6 text-black bg-white inline-block px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">Создать Лигу</h2>
            <div className="flex flex-col gap-4">
              <input value={newLeagueName} onChange={e => setNewLeagueName(e.target.value)} placeholder="Название лиги" className="brutal-input" />
              <button onClick={handleAddLeague} className="brutal-button bg-primary text-white w-full">Добавить</button>
            </div>
          </div>

          <div className="brutal-card p-6 bg-secondary">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-6 text-black bg-white inline-block px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">Создать Кубок</h2>
            <div className="flex flex-col gap-6">
              <div>
                <label className="block text-lg font-black uppercase mb-3 text-black">Выберите лиги:</label>
                <div className="space-y-3 max-h-48 overflow-y-auto bg-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_#000]">
                  {leagues.map(l => (
                    <label key={l.id} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-secondary border-2 border-transparent hover:border-black transition-colors">
                      <input 
                        type="checkbox" 
                        checked={selectedLeagueIds.includes(l.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeagueIds([...selectedLeagueIds, l.id]);
                          } else {
                            setSelectedLeagueIds(selectedLeagueIds.filter(id => id !== l.id));
                          }
                        }}
                        className="brutal-input w-6 h-6"
                      />
                      <span className="text-lg font-bold text-black">{l.name}</span>
                    </label>
                  ))}
                  {leagues.length === 0 && <span className="text-black font-bold">Сначала создайте лигу</span>}
                </div>
              </div>
              <div>
                <label className="block text-lg font-black uppercase mb-2 text-black">Название кубка</label>
                <input value={newCupName} onChange={e => setNewCupName(e.target.value)} placeholder="Название кубка" className="brutal-input" />
              </div>
              <div>
                <label className="block text-lg font-black uppercase mb-2 text-black">Очки за места (через запятую):</label>
                <input value={newCupScoring} onChange={e => setNewCupScoring(e.target.value)} placeholder="25, 18, 15, 12..." className="brutal-input" />
              </div>
              <div>
                <label className="block text-lg font-black uppercase mb-2 text-black">Бонус за 10000 pts:</label>
                <input type="number" value={newCupBonus} onChange={e => setNewCupBonus(Number(e.target.value))} className="brutal-input" />
              </div>
              <button onClick={handleAddCup} className="brutal-button bg-primary text-white w-full py-3">Создать Кубок</button>
            </div>
          </div>

          <div className="brutal-card p-6 bg-success">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-6 text-black bg-white inline-block px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">Участники</h2>
            <div className="flex flex-col gap-4">
              <input value={newParticipantName} onChange={e => setNewParticipantName(e.target.value)} placeholder="Имя участника" className="brutal-input" />
              <button onClick={handleAddParticipant} className="brutal-button bg-primary text-white w-full">Создать</button>
            </div>
          </div>

          <div className="brutal-card p-6 bg-warning">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-6 text-black bg-white inline-block px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">Назначить в Кубок</h2>
            <select value={selectedCupId} onChange={e => setSelectedCupId(e.target.value)} className="brutal-input mb-6">
              <option value="">Выберите кубок...</option>
              {cups.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {selectedCupId && (
              <div className="space-y-3 max-h-60 overflow-y-auto bg-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_#000]">
                {participants.map(p => {
                  const isAssigned = cupParticipants.some(cp => cp.id === p.id);
                  return (
                    <div key={p.id} className="flex justify-between items-center bg-white p-3 border-4 border-black">
                      <span className="text-lg font-bold text-black">{p.name}</span>
                      {!isAssigned ? (
                        <button onClick={() => handleAssignParticipant(p.id)} className="brutal-button bg-secondary text-black px-4 py-1 text-sm">Добавить</button>
                      ) : (
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-black uppercase bg-success px-2 border-2 border-black">
                            {cupParticipants.find(cp => cp.id === p.id)?.league_name ? `(${cupParticipants.find(cp => cp.id === p.id)?.league_name})` : ''}
                          </span>
                          <button onClick={() => handleRemoveParticipant(p.id)} className="brutal-button bg-primary text-white px-3 py-1 text-sm">✕</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="brutal-card p-8 bg-white max-w-3xl">
          <h2 className="text-3xl font-black uppercase tracking-tight mb-8 text-black bg-secondary inline-block px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">Ввод результатов</h2>
          
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block text-lg font-black uppercase mb-2 text-black">Кубок</label>
              <select value={selectedCupId} onChange={e => setSelectedCupId(e.target.value)} className="brutal-input">
                <option value="">Выберите...</option>
                {cups.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-lg font-black uppercase mb-2 text-black">Игра</label>
              <select value={selectedGameNumber} onChange={e => setSelectedGameNumber(Number(e.target.value))} className="brutal-input">
                {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} {n === 10 ? '(Финал)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-lg font-black uppercase mb-2 text-black">Участник</label>
              <select value={selectedParticipantId} onChange={e => setSelectedParticipantId(e.target.value)} className="brutal-input">
                <option value="">Выберите...</option>
                {cupParticipants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t-4 border-black pt-8 mb-8">
            <h3 className="text-xl font-black uppercase tracking-tight mb-4 text-black">Загрузка скриншота (OCR)</h3>
            <div className="flex items-center gap-6 bg-secondary p-4 border-4 border-black shadow-[4px_4px_0px_0px_#000]">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload}
                className="block w-full text-lg font-bold text-black file:mr-4 file:py-2 file:px-4 file:border-4 file:border-black file:text-sm file:font-black file:uppercase file:bg-primary file:text-white hover:file:bg-primary/90 file:cursor-pointer cursor-pointer file:shadow-[2px_2px_0px_0px_#000] file:transition-all"
              />
              <span className="text-lg font-black uppercase whitespace-nowrap">или Ctrl+V</span>
            </div>
            {ocrLoading && <p className="text-primary mt-4 text-xl font-black uppercase animate-pulse">Распознавание текста...</p>}
            {ocrStatus && (
              <div className={`mt-4 p-4 border-4 border-black font-bold text-lg shadow-[4px_4px_0px_0px_#000] ${
                ocrStatus.type === 'success' ? 'bg-success text-black' : 
                ocrStatus.type === 'warning' ? 'bg-warning text-black' : 
                'bg-primary text-white'
              }`}>
                {ocrStatus.text}
              </div>
            )}
          </div>

          <div className="border-t-4 border-black pt-8">
            <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black">Данные результата</h3>
            
            <div className="mb-8">
              <label className="block text-lg font-black uppercase mb-2 text-black">Общий счет (0 - 50000)</label>
              <input 
                type="number" 
                value={totalScore} 
                onChange={e => setTotalScore(e.target.value ? Number(e.target.value) : '')}
                className="brutal-input text-2xl"
              />
            </div>

            <div className="space-y-4">
              {rounds.map((round, idx) => (
                <div key={idx} className="flex gap-4 items-center bg-[#f4f0ea] p-4 border-4 border-black shadow-[4px_4px_0px_0px_#000]">
                  <div className="font-black text-2xl w-12 text-black bg-white border-4 border-black text-center py-2">R{idx + 1}</div>
                  <div className="flex-1">
                    <label className="block text-sm font-black uppercase mb-1">Очки</label>
                    <input type="number" value={round.score} onChange={e => handleRoundChange(idx, 'score', e.target.value)} className="brutal-input py-1" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-black uppercase mb-1">Года</label>
                    <input type="number" value={round.yearsOff} onChange={e => handleRoundChange(idx, 'yearsOff', e.target.value)} className="brutal-input py-1" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-black uppercase mb-1">Дистанция (м)</label>
                    <input type="number" value={round.distanceMeters} onChange={e => handleRoundChange(idx, 'distanceMeters', e.target.value)} className="brutal-input py-1" />
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleSaveResult}
              disabled={!selectedCupId || !selectedParticipantId || totalScore === ''}
              className="mt-10 brutal-button bg-success text-black w-full py-4 text-xl"
            >
              Сохранить (или обновить)
            </button>
            {saveStatus && (
              <div className={`mt-6 p-4 border-4 border-black font-bold text-lg text-center shadow-[4px_4px_0px_0px_#000] ${
                saveStatus.type === 'success' ? 'bg-success text-black' : 'bg-primary text-white'
              }`}>
                {saveStatus.text}
              </div>
            )}
          </div>

        </div>
      )}
      {activeTab === 'manage' && (
        <div className="space-y-10">
          <div className="brutal-card p-8 bg-secondary">
            <h2 className="text-3xl font-black uppercase tracking-tight mb-6 text-black bg-white inline-block px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">Управление Лигами</h2>
            <div className="space-y-4">
              {leagues.map(l => (
                <div key={l.id} className="flex justify-between items-center bg-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_#000]">
                  <span className="font-black text-xl text-black">{l.name}</span>
                  <div className="space-x-4">
                    <button onClick={() => handleEditLeague(l.id, l.name)} className="brutal-button bg-accent text-white px-4 py-2 text-sm">Изменить</button>
                    <button onClick={() => handleDeleteLeague(l.id)} className="brutal-button bg-primary text-white px-4 py-2 text-sm">Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="brutal-card p-8 bg-success">
            <h2 className="text-3xl font-black uppercase tracking-tight mb-6 text-black bg-white inline-block px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">Управление Кубками</h2>
            <div className="space-y-4">
              {cups.map(c => (
                <div key={c.id} className="flex justify-between items-center bg-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_#000]">
                  <div>
                    <span className="font-black text-xl text-black">{c.name}</span>
                    <span className="text-sm font-bold ml-4 bg-secondary px-2 border-2 border-black">
                      ({c.leagues?.map((l: any) => l.name).join(', ') || 'Нет лиг'})
                    </span>
                  </div>
                  <div className="space-x-4">
                    <button onClick={() => handleEditCup(c)} className="brutal-button bg-accent text-white px-4 py-2 text-sm">Изменить</button>
                    <button onClick={() => handleDeleteCup(c.id)} className="brutal-button bg-primary text-white px-4 py-2 text-sm">Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="brutal-card p-8 bg-[#cb99ff]">
            <h2 className="text-3xl font-black uppercase tracking-tight mb-6 text-black bg-white inline-block px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">Управление Участниками</h2>
            <div className="space-y-4">
              {participants.map(p => (
                <div key={p.id} className="flex justify-between items-center bg-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_#000]">
                  <span className="font-black text-xl text-black">{p.name}</span>
                  <div className="space-x-4">
                    <button onClick={() => handleEditParticipant(p.id, p.name)} className="brutal-button bg-accent text-white px-4 py-2 text-sm">Изменить</button>
                    <button onClick={() => handleDeleteParticipant(p.id)} className="brutal-button bg-primary text-white px-4 py-2 text-sm">Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="brutal-card p-8 bg-warning">
            <h2 className="text-3xl font-black uppercase tracking-tight mb-6 text-black bg-white inline-block px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">Результаты Игр</h2>
            <select value={selectedCupId} onChange={e => setSelectedCupId(e.target.value)} className="brutal-input mb-8 text-lg">
              <option value="">Выберите кубок для просмотра результатов...</option>
              {cups.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            
            {selectedCupId && (
              <div className="space-y-4">
                {resultsList.length === 0 ? (
                  <p className="font-bold text-xl bg-white p-4 border-4 border-black inline-block">Нет результатов в этом кубке.</p>
                ) : (
                  resultsList.map(r => (
                    <div key={r.result_id} className="flex justify-between items-center bg-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_#000]">
                      <div className="text-lg">
                        <span className="font-black uppercase bg-secondary px-2 border-2 border-black mr-4">Игра {r.game_number}</span>
                        <span className="font-black text-black mr-4">{r.participant_name}</span>
                        <span className="font-bold">Счет: <span className="font-black text-primary">{r.total_score}</span></span>
                      </div>
                      <button onClick={() => handleDeleteResult(r.result_id)} className="brutal-button bg-primary text-white px-4 py-2 text-sm">Удалить</button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
