import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Trophy } from 'lucide-react';

export default function Archive() {
  const [cups, setCups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await api.getDashboard();
        setCups(data.cups);
      } catch (error) {
        console.error('Error fetching data', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="text-center py-10 font-black text-2xl uppercase">Загрузка...</div>;

  return (
    <div>
      <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-8 md:mb-10 text-black drop-shadow-[4px_4px_0px_#fff]">Архив Кубков</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        {cups.length === 0 ? (
          <p className="text-black font-bold bg-white p-4 border-4 border-black md:col-span-2">Нет доступных кубков.</p>
        ) : (
          cups.map(cup => (
            <Link key={cup.id} to={`/cup/${cup.id}`} className="block brutal-card p-4 md:p-6 bg-white hover:bg-[#cb99ff] transition-colors">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-black flex items-center gap-2 md:gap-3">
                    <Trophy size={24} className="text-black shrink-0" />
                    {cup.name}
                  </h3>
                  <p className="text-sm md:text-lg font-bold text-black mt-2 bg-secondary inline-block px-2 border-2 border-black">
                    {cup.leagues?.map((l: any) => l.name).join(', ') || 'Без лиги'}
                  </p>
                </div>
                <div className="text-sm md:text-base text-black font-black uppercase border-b-4 border-black whitespace-nowrap">Подробнее &rarr;</div>
              </div>
              
              {cup.leagues && cup.leagues.length > 0 && (
                <div className="flex flex-col gap-4">
                  {cup.leagues.map((league: any) => (
                    league.top3 && league.top3.length > 0 ? (
                      <div key={league.id} className="bg-white border-4 border-black p-4">
                        <h4 className="text-sm text-black mb-3 uppercase tracking-wider font-black">Топ-3 ({league.name})</h4>
                        <div className="space-y-2">
                          {league.top3.map((player: any, idx: number) => (
                            <div key={player.name} className="flex justify-between text-lg font-bold border-b-2 border-dashed border-black pb-1 last:border-0">
                              <span className="text-black">
                                {idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : '🥉 '}
                                {player.name}
                              </span>
                              <span className="font-black text-primary">{player.totalGp} pts</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null
                  ))}
                </div>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
