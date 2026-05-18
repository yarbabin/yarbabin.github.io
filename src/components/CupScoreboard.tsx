import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ArrowUp, ArrowDown, Minus, ArrowUpCircle, ArrowDownCircle, X } from 'lucide-react';

function ParticipantStatsModal({ participantId, cupId, onClose }: { participantId: string, cupId: string, onClose: () => void }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await api.getParticipantStats(participantId, cupId);
        setStats(data);
      } catch (error) {
        console.error('Error fetching participant stats', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [participantId, cupId]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div className="brutal-card w-full max-w-md overflow-hidden relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-black hover:scale-110 transition-transform">
          <X size={28} strokeWidth={3} />
        </button>
        
        {loading ? (
          <div className="p-8 text-center font-black uppercase text-xl">Загрузка данных...</div>
        ) : stats ? (
          <div className="p-6">
            <h2 className="text-3xl font-black uppercase tracking-tight text-black mb-6 bg-secondary inline-block px-2 border-4 border-black">{stats.participant.name}</h2>
            
            <div className="space-y-4 text-black">
              {stats.currentCupPlace && stats.currentCupPlace.league_name && (
                <div className="border-b-4 border-black pb-2">
                  <div className="font-black uppercase tracking-wider text-xs">Лига</div>
                  <div className="font-bold text-lg">{stats.currentCupPlace.league_name}</div>
                </div>
              )}

              <div className="border-b-4 border-black pb-2">
                <div className="font-black uppercase tracking-wider text-xs">Лучший результат в кубке</div>
                <div className="font-bold text-lg">
                  {stats.bestResultInCup ? `${stats.bestResultInCup.total_score} (Тур ${stats.bestResultInCup.game_number})` : '-'}
                </div>
              </div>

              <div className="border-b-4 border-black pb-2">
                <div className="font-black uppercase tracking-wider text-xs">Лучший результат за всё время</div>
                <div className="font-bold text-lg">
                  {stats.bestResultAllTime ? `${stats.bestResultAllTime.total_score} (Тур ${stats.bestResultAllTime.game_number}, ${stats.bestResultAllTime.cup_name})` : '-'}
                </div>
              </div>

              <div className="border-b-4 border-black pb-2">
                <div className="font-black uppercase tracking-wider text-xs">Средний результат в кубке</div>
                <div className="font-bold text-lg">
                  {stats.averageResultInCup ? stats.averageResultInCup.toFixed(1) : '-'}
                </div>
              </div>

              <div className="border-b-4 border-black pb-2">
                <div className="font-black uppercase tracking-wider text-xs">Средний результат за всё время</div>
                <div className="font-bold text-lg">
                  {stats.averageResultAllTime ? stats.averageResultAllTime.toFixed(1) : '-'}
                </div>
              </div>

              {stats.currentCupPlace && (
                <div className="border-b-4 border-black pb-2">
                  <div className="font-black uppercase tracking-wider text-xs">Место в текущем кубке</div>
                  <div className="font-bold text-lg">
                    {stats.currentCupPlace.place} {stats.currentCupPlace.league_name ? `(лига ${stats.currentCupPlace.league_name})` : ''}
                  </div>
                </div>
              )}

              {stats.previousCupsPlaces && stats.previousCupsPlaces.length > 0 && (
                <div>
                  <div className="font-black uppercase tracking-wider text-xs mb-2">Места в предыдущих кубках</div>
                  <div className="font-bold text-base space-y-2">
                    {stats.previousCupsPlaces.map((pc: any, idx: number) => (
                      <div key={idx} className="bg-muted p-2 border-2 border-black">
                        {pc.cup_name} — {pc.place} {pc.league_name ? `(лига ${pc.league_name})` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center font-black uppercase text-xl text-primary">Ошибка загрузки данных</div>
        )}
      </div>
    </div>
  );
}

export default function CupScoreboard({ cupId }: { cupId: string }) {
  const [cup, setCup] = useState<any>(null);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [activeLeagueId, setActiveLeagueId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [selectedGameAnalytics, setSelectedGameAnalytics] = useState<number | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.tooltip-trigger')) {
        setActiveTooltip(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    async function fetchCupData() {
      try {
        const data = await api.getCupData(cupId);
        setCup(data.cup);
        setLeagues(data.leagues);
        if (data.leagues.length > 0) {
          setActiveLeagueId(data.leagues[0].id);
          
          // Find the latest game for default analytics tab
          let maxGame = 1;
          if (data.leagues[0].analytics && data.leagues[0].analytics.games) {
            const games = Object.keys(data.leagues[0].analytics.games).map(Number);
            if (games.length > 0) {
              maxGame = Math.max(...games);
            }
          }
          setSelectedGameAnalytics(maxGame);
        }
      } catch (error) {
        console.error('Error fetching cup data', error);
      } finally {
        setLoading(false);
      }
    }
    if (cupId) fetchCupData();
  }, [cupId]);

  if (loading) return <div className="text-center py-10 font-black uppercase text-2xl">Загрузка...</div>;
  if (!cup) return <div className="text-center py-10 font-black uppercase text-2xl">Кубок не найден</div>;

  const activeLeague = leagues.find(l => l.id === activeLeagueId);

  return (
    <div>
      <h1 className="text-4xl font-black uppercase tracking-tight mb-8 text-black bg-white inline-block px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">{cup.name}</h1>

      {/* Tabs */}
      {leagues.length > 1 && (
        <div className="flex flex-wrap gap-4 mb-8">
          {leagues.map(league => (
            <button
              key={league.id}
              onClick={() => setActiveLeagueId(league.id)}
              className={`brutal-button ${
                activeLeagueId === league.id ? 'bg-primary text-white' : 'bg-white text-black hover:bg-secondary'
              }`}
            >
              {league.name}
            </button>
          ))}
        </div>
      )}

      {activeLeague && (
        <div className="brutal-table-container">
          <div className="overflow-x-auto">
            <table className="brutal-table">
              <thead>
                <tr>
                  <th className="w-16 text-center">Место</th>
                  <th>Участник</th>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <th key={num} className="text-center w-20">
                      И{num}
                    </th>
                  ))}
                  <th className="text-center text-primary bg-black">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {activeLeague.leaderboard.map((player: any, index: number) => {
                  const isPromo = !activeLeague.isTopLeague && index < 2 && activeLeague.leaderboard.length > 2;
                  const isRelegation = !activeLeague.isBottomLeague && index >= activeLeague.leaderboard.length - 2 && activeLeague.leaderboard.length > 2;
                  const isBottomHalf = index >= activeLeague.leaderboard.length / 2 && activeLeague.leaderboard.length > 3;

                  return (
                    <tr key={player.id}>
                      <td className="text-center font-black text-xl relative">
                        <div className="flex flex-col items-center justify-center">
                          <span>{index + 1}</span>
                          {isPromo && <ArrowUpCircle size={20} strokeWidth={3} className="text-success mt-1" />}
                          {isRelegation && <ArrowDownCircle size={20} strokeWidth={3} className="text-primary mt-1" />}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {player.trend === 'up' && <ArrowUp size={20} strokeWidth={3} className="text-success" />}
                          {player.trend === 'down' && <ArrowDown size={20} strokeWidth={3} className="text-primary" />}
                          {player.trend === 'same' && <Minus size={20} strokeWidth={3} className="text-gray-400" />}
                          <button 
                            onClick={() => setSelectedParticipantId(player.id)}
                            className="hover:bg-secondary px-2 py-1 transition-colors text-left font-black uppercase text-lg border-2 border-transparent hover:border-black hover:shadow-[2px_2px_0px_0px_#000]"
                          >
                            {player.name}
                          </button>
                        </div>
                      </td>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
                        const gameData = player.games[num];
                        const cellId = `${player.id}-${num}`;
                        const isTooltipActive = activeTooltip === cellId;
                        
                        return (
                          <td 
                            key={num} 
                            className="text-center relative group tooltip-trigger"
                            onClick={() => setActiveTooltip(isTooltipActive ? null : cellId)}
                          >
                            {gameData ? (
                              <div className="cursor-help inline-block px-2 py-1 border-2 border-transparent hover:border-black hover:bg-secondary transition-colors">
                                <div className="font-black text-lg">{gameData.total}</div>
                                {cup.name !== 'Кубок Нормандии' && <div className="text-xs font-bold">({gameData.score})</div>}
                                
                                {/* Tooltip */}
                                <div className={`absolute left-1/2 -translate-x-1/2 w-64 brutal-card p-4 transition-all z-[100] pointer-events-none ${isBottomHalf ? 'bottom-full mb-2' : 'top-full mt-2'} ${isTooltipActive ? 'opacity-100 visible' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'}`}>
                                  <div className="text-sm font-black uppercase mb-3 border-b-4 border-black pb-2 bg-secondary inline-block px-2">
                                    Игра {num} • {gameData.score} очков
                                  </div>
                                  <div className="space-y-2">
                                    {gameData.rounds.map((r: any) => (
                                      <div key={r.round_number} className="flex justify-between text-sm font-bold border-b-2 border-dashed border-black pb-1 last:border-0">
                                        <span className="w-6">R{r.round_number}</span>
                                        <span className="w-12 text-right">{r.score}</span>
                                        <span className="w-16 text-right">{r.years_off} yrs</span>
                                        <span className="w-16 text-right">
                                          {r.distance_meters >= 1000 ? `${(r.distance_meters / 1000).toFixed(1)}km` : `${r.distance_meters}m`}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-300 font-black">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center font-black text-2xl bg-muted">{player.totalGp}</td>
                    </tr>
                  );
                })}
                {activeLeague.leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={13} className="p-8 text-center font-black uppercase text-xl">В этой лиге пока нет участников или результатов.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- АНАЛИТИКА --- */}
      {activeLeague && activeLeague.analytics && (
        <div className="mt-16">
          <h2 className="text-3xl font-black uppercase tracking-tight mb-8 text-black bg-white inline-block px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">
            Аналитика по кубку ({activeLeague.name})
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            
            {/* Главный географ */}
            {activeLeague.analytics.cup.chiefGeographer && (
              <div className="brutal-card p-6 bg-white">
                <div className="text-sm font-black uppercase tracking-wider mb-2 text-black">Главный географ</div>
                <div className="text-xs font-bold mb-4 opacity-80 text-black">Минимальная средняя ошибка по метрам</div>
                <div className="text-2xl font-black uppercase bg-secondary text-black inline-block px-2 border-2 border-black mb-2">
                  {activeLeague.analytics.cup.chiefGeographer.name}
                </div>
                <div className="text-xl font-bold text-black">
                  {activeLeague.analytics.cup.chiefGeographer.avgDist >= 1000 
                    ? `${(activeLeague.analytics.cup.chiefGeographer.avgDist / 1000).toFixed(1)} км` 
                    : `${activeLeague.analytics.cup.chiefGeographer.avgDist.toFixed(0)} м`}
                </div>
              </div>
            )}

            {/* Хранитель эпох */}
            {activeLeague.analytics.cup.keeperOfEpochs && (
              <div className="brutal-card p-6 bg-white">
                <div className="text-sm font-black uppercase tracking-wider mb-2 text-black">Хранитель эпох</div>
                <div className="text-xs font-bold mb-4 opacity-80 text-black">Минимальная средняя ошибка в годах</div>
                <div className="text-2xl font-black uppercase bg-secondary text-black inline-block px-2 border-2 border-black mb-2">
                  {activeLeague.analytics.cup.keeperOfEpochs.name}
                </div>
                <div className="text-xl font-bold text-black">
                  {activeLeague.analytics.cup.keeperOfEpochs.avgYears.toFixed(1)} лет
                </div>
              </div>
            )}

            {/* ЖБ */}
            {activeLeague.analytics.cup.ironclad && (
              <div className="brutal-card p-6 bg-white">
                <div className="text-sm font-black uppercase tracking-wider mb-2 text-black">ЖБ</div>
                <div className="text-xs font-bold mb-4 opacity-80 text-black">Самые стабильные результаты от игры к игре</div>
                <div className="text-2xl font-black uppercase bg-secondary text-black inline-block px-2 border-2 border-black mb-2">
                  {activeLeague.analytics.cup.ironclad.name}
                </div>
              </div>
            )}

            {/* Американские горки */}
            {activeLeague.analytics.cup.rollercoaster && (
              <div className="brutal-card p-6 bg-white">
                <div className="text-sm font-black uppercase tracking-wider mb-2 text-black">Американские горки</div>
                <div className="text-xs font-bold mb-4 opacity-80 text-black">Самый большой разброс очков от игры к игре</div>
                <div className="text-2xl font-black uppercase bg-secondary text-black inline-block px-2 border-2 border-black mb-2">
                  {activeLeague.analytics.cup.rollercoaster.name}
                </div>
              </div>
            )}

            {/* Cumбэкер */}
            {activeLeague.analytics.cup.comebacker && (
              <div className="brutal-card p-6 bg-white">
                <div className="text-sm font-black uppercase tracking-wider mb-2 text-black">Cumбэкер</div>
                <div className="text-xs font-bold mb-4 opacity-80 text-black">Из аутсайдеров в Топ-5</div>
                <div className="text-2xl font-black uppercase bg-secondary text-black inline-block px-2 border-2 border-black mb-2">
                  {activeLeague.analytics.cup.comebacker.name}
                </div>
                <div className="text-lg font-bold text-black">
                  С {activeLeague.analytics.cup.comebacker.from} места на {activeLeague.analytics.cup.comebacker.to}
                </div>
              </div>
            )}

            {/* Масштаб катастрофы */}
            {activeLeague.analytics.cup.disasterScaleKm > 0 && (
              <div className="brutal-card p-6 bg-white">
                <div className="text-sm font-black uppercase tracking-wider mb-2 text-black">Масштаб катастрофы</div>
                <div className="text-xs font-bold mb-4 opacity-80 text-black">Суммарная ошибка всех игроков по расстоянию</div>
                <div className="text-3xl font-black text-primary">
                  {activeLeague.analytics.cup.disasterScaleKm.toFixed(0)} км
                </div>
              </div>
            )}

            {/* Путешествие во времени */}
            {activeLeague.analytics.cup.timeTravelYears > 0 && (
              <div className="brutal-card p-6 bg-white">
                <div className="text-sm font-black uppercase tracking-wider mb-2 text-black">Путешествие во времени</div>
                <div className="text-xs font-bold mb-4 opacity-80 text-black">Суммарная ошибка всех игроков в годах</div>
                <div className="text-3xl font-black text-[#5271ff]">
                  {activeLeague.analytics.cup.timeTravelYears} лет
                </div>
              </div>
            )}

            {/* Над чем работать */}
            {activeLeague.analytics.cup.needsWork && (
              <div className="brutal-card p-6 bg-white">
                <div className="text-sm font-black uppercase tracking-wider mb-2 text-black">Над чем работать</div>
                <div className="text-xs font-bold mb-4 opacity-80 text-black">Слабое место лиги в этом кубке</div>
                <div className="text-2xl font-black uppercase bg-secondary text-black inline-block px-2 border-2 border-black mb-2">
                  {activeLeague.analytics.cup.needsWork === 'years' ? 'Лучше угадывать годы' : 'Лучше знать локации'}
                </div>
              </div>
            )}

            {/* Поумнели */}
            {activeLeague.analytics.cup.gotSmarter !== null && (
              <div className="brutal-card p-6 bg-white">
                <div className="text-sm font-black uppercase tracking-wider mb-2 text-black">Поумнели?</div>
                <div className="text-xs font-bold mb-4 opacity-80 text-black">Средний балл растет к концу кубка</div>
                <div className="text-3xl font-black text-black">
                  {activeLeague.analytics.cup.gotSmarter ? 'ДА 📈' : 'НЕТ 📉'}
                </div>
              </div>
            )}

          </div>

          <h2 className="text-3xl font-black uppercase tracking-tight mb-8 text-black bg-white inline-block px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">
            Аналитика по туру ({activeLeague.name})
          </h2>
          
          <div className="flex flex-wrap gap-2 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
              const hasData = activeLeague.analytics.games[num];
              if (!hasData) return null;
              return (
                <button
                  key={num}
                  onClick={() => setSelectedGameAnalytics(num)}
                  className={`brutal-button !py-1 !px-3 ${
                    selectedGameAnalytics === num ? 'bg-primary text-white' : 'bg-white text-black hover:bg-secondary'
                  }`}
                >
                  Тур {num}
                </button>
              );
            })}
          </div>

          {selectedGameAnalytics && activeLeague.analytics.games[selectedGameAnalytics] && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Я тут был */}
              {activeLeague.analytics.games[selectedGameAnalytics].iWasHere && (
                <div className="brutal-card p-6 bg-white">
                  <div className="text-sm font-black uppercase tracking-wider mb-2 text-black">Я тут был</div>
                  <div className="text-xs font-bold mb-4 opacity-80 text-black">Минимальное среднее расстояние по всем фото</div>
                  <div className="text-2xl font-black uppercase bg-secondary text-black inline-block px-2 border-2 border-black mb-2">
                    {activeLeague.analytics.games[selectedGameAnalytics].iWasHere.name}
                  </div>
                  <div className="text-lg font-bold text-black">
                    {activeLeague.analytics.games[selectedGameAnalytics].iWasHere.distance >= 1000 
                      ? `${(activeLeague.analytics.games[selectedGameAnalytics].iWasHere.distance / 1000).toFixed(1)} км` 
                      : `${activeLeague.analytics.games[selectedGameAnalytics].iWasHere.distance.toFixed(0)} м`}
                  </div>
                </div>
              )}

              {/* Я тут жил */}
              {activeLeague.analytics.games[selectedGameAnalytics].iLivedHere && (
                <div className="brutal-card p-6 bg-white">
                  <div className="text-sm font-black uppercase tracking-wider mb-2 text-black">Я тут жил</div>
                  <div className="text-xs font-bold mb-4 opacity-80 text-black">Самое близкое среднее по годам</div>
                  <div className="text-2xl font-black uppercase bg-secondary text-black inline-block px-2 border-2 border-black mb-2">
                    {activeLeague.analytics.games[selectedGameAnalytics].iLivedHere.name}
                  </div>
                  <div className="text-lg font-bold text-black">
                    {activeLeague.analytics.games[selectedGameAnalytics].iLivedHere.avgYears.toFixed(1)} лет
                  </div>
                </div>
              )}

              {/* Застряли в текстурах */}
              {activeLeague.analytics.games[selectedGameAnalytics].stuckInTextures && (
                <div className="brutal-card p-6 bg-white">
                  <div className="text-sm font-black uppercase tracking-wider mb-2 text-black">Застряли в текстурах</div>
                  <div className="text-xs font-bold mb-4 opacity-80 text-black">Самое сложное фото (меньше всего очков)</div>
                  <div className="text-2xl font-black uppercase bg-primary text-white inline-block px-2 border-2 border-black mb-2">
                    Раунд {activeLeague.analytics.games[selectedGameAnalytics].stuckInTextures.round}
                  </div>
                  <div className="text-lg font-bold text-black">
                    Средний балл: {activeLeague.analytics.games[selectedGameAnalytics].stuckInTextures.avgScore.toFixed(0)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedParticipantId && (
        <ParticipantStatsModal 
          participantId={selectedParticipantId} 
          cupId={cupId} 
          onClose={() => setSelectedParticipantId(null)} 
        />
      )}
    </div>
  );
}