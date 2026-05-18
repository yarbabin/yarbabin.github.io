import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Trophy, Target, MapPin, Calendar, Activity } from 'lucide-react';

export default function Analytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const res = await api.getAnalytics();
        setData(res);
      } catch (error) {
        console.error('Error fetching analytics', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading && !data) return <div className="text-center py-12 font-black uppercase text-2xl">Загрузка аналитики...</div>;
  if (!data) return <div className="text-center py-12 font-black uppercase text-2xl text-primary">Ошибка загрузки данных</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-black drop-shadow-[4px_4px_0px_#fff] flex items-center gap-4">
          <Activity size={36} strokeWidth={3} className="md:w-12 md:h-12" />
          Глобальная Аналитика
        </h1>
      </div>

      {loading && <div className="text-center py-4 font-black uppercase text-xl animate-pulse">Обновление данных...</div>}

      <div className={`grid md:grid-cols-2 gap-8 mb-6 ${loading ? 'opacity-50 pointer-events-none' : 'transition-opacity duration-300'}`}>
        {/* Лучший результат */}
        <div className="brutal-card p-6 bg-secondary md:col-span-2">
          <div className="flex items-center gap-3 mb-6 bg-white inline-flex px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">
            <Trophy className="text-black" size={28} strokeWidth={3} />
            <h2 className="text-2xl font-black uppercase tracking-tight text-black">
              Лучший результат за всё время
            </h2>
          </div>
          
          {data.bestResult ? (
            <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_#000]">
              <div className="flex flex-wrap items-baseline gap-4 mb-6">
                <span className="text-6xl font-black tracking-tight text-primary drop-shadow-[2px_2px_0px_#000]">{data.bestResult.total_score}</span>
                <span className="text-3xl font-black uppercase text-black bg-secondary px-2 border-2 border-black">{data.bestResult.participant_name}</span>
                <span className="text-black font-bold text-lg">
                  (Тур {data.bestResult.game_number}, {data.bestResult.cup_name})
                </span>
              </div>
              
              <div className="overflow-x-auto border-4 border-black">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="bg-muted text-black text-sm uppercase tracking-wider font-black">
                      <th className="p-4 border-b-4 border-black border-r-4">Раунд</th>
                      <th className="p-4 border-b-4 border-black border-r-4">Очки</th>
                      <th className="p-4 border-b-4 border-black border-r-4">Ошибка (года)</th>
                      <th className="p-4 border-b-4 border-black">Дистанция</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bestResult.rounds?.map((r: any) => (
                      <tr key={r.round_number} className="border-b-4 border-black last:border-0 hover:bg-secondary transition-colors">
                        <td className="p-4 font-black border-r-4 border-black">R{r.round_number}</td>
                        <td className="p-4 font-black text-xl border-r-4 border-black">{r.score}</td>
                        <td className="p-4 font-bold border-r-4 border-black">{r.years_off}</td>
                        <td className="p-4 font-bold">
                          {r.distance_meters >= 1000 ? `${(r.distance_meters / 1000).toFixed(1)} км` : `${r.distance_meters} м`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="font-bold text-lg bg-white p-4 border-4 border-black inline-block">Нет данных</p>
          )}
        </div>

        {/* Лучший средний результат */}
        <div className="brutal-card p-6 bg-success">
          <div className="flex items-center gap-3 mb-6 bg-white inline-flex px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">
            <Target className="text-black" size={24} strokeWidth={3} />
            <h2 className="text-xl font-black uppercase tracking-tight text-black">Лучший средний результат <span className="text-sm font-bold ml-2">(от 5 игр)</span></h2>
          </div>
          {data.bestAverage ? (
            <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_#000]">
              <div className="text-6xl font-black tracking-tight text-black mb-4 drop-shadow-[2px_2px_0px_#8cff9e]">
                {data.bestAverage.avg_score.toFixed(1)}
              </div>
              <div className="text-2xl font-black uppercase bg-secondary inline-block px-2 border-2 border-black mb-2">{data.bestAverage.participant_name}</div>
              <div className="text-lg font-bold text-black">Сыграно игр: {data.bestAverage.games_played}</div>
            </div>
          ) : (
            <p className="font-bold text-lg bg-white p-4 border-4 border-black inline-block">Нет данных (нужно минимум 5 игр)</p>
          )}
        </div>

        {/* Самое близкое попадание */}
        <div className="brutal-card p-6 bg-[#cb99ff]">
          <div className="flex items-center gap-3 mb-6 bg-white inline-flex px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">
            <MapPin className="text-black" size={24} strokeWidth={3} />
            <h2 className="text-xl font-black uppercase tracking-tight text-black">Самое близкое попадание <span className="text-sm font-bold ml-2">(не 0)</span></h2>
          </div>
          {data.closestDistance ? (
            <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_#000]">
              <div className="text-6xl font-black tracking-tight text-black mb-4 drop-shadow-[2px_2px_0px_#cb99ff]">
                {data.closestDistance.distance_meters >= 1000 
                  ? `${(data.closestDistance.distance_meters / 1000).toFixed(1)} км` 
                  : `${data.closestDistance.distance_meters} м`}
              </div>
              <div className="text-2xl font-black uppercase bg-secondary inline-block px-2 border-2 border-black mb-2">{data.closestDistance.participant_name}</div>
              <div className="text-lg font-bold text-black">
                Тур {data.closestDistance.game_number}, Раунд {data.closestDistance.round_number} ({data.closestDistance.cup_name})
              </div>
            </div>
          ) : (
            <p className="font-bold text-lg bg-white p-4 border-4 border-black inline-block">Нет данных</p>
          )}
        </div>

        {/* Лучший по годам */}
        <div className="brutal-card p-6 bg-warning">
          <div className="flex items-center gap-3 mb-6 bg-white inline-flex px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">
            <Calendar className="text-black" size={24} strokeWidth={3} />
            <h2 className="text-xl font-black uppercase tracking-tight text-black">Самый точный по годам <span className="text-sm font-bold ml-2">(в среднем, от 5 игр)</span></h2>
          </div>
          {data.bestAvgYears ? (
            <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_#000]">
              <div className="text-6xl font-black tracking-tight text-black mb-4 drop-shadow-[2px_2px_0px_#ff914d]">
                {data.bestAvgYears.avg_years_off.toFixed(1)} <span className="text-3xl">лет</span>
              </div>
              <div className="text-2xl font-black uppercase bg-secondary inline-block px-2 border-2 border-black mb-2">{data.bestAvgYears.participant_name}</div>
              <div className="text-lg font-bold text-black">Сыграно игр: {data.bestAvgYears.games_played}</div>
            </div>
          ) : (
            <p className="font-bold text-lg bg-white p-4 border-4 border-black inline-block">Нет данных (нужно минимум 5 игр)</p>
          )}
        </div>

        {/* Лучший по дистанции */}
        <div className="brutal-card p-6 bg-accent">
          <div className="flex items-center gap-3 mb-6 bg-white inline-flex px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">
            <MapPin className="text-black" size={24} strokeWidth={3} />
            <h2 className="text-xl font-black uppercase tracking-tight text-black">Самый точный по дистанции <span className="text-sm font-bold ml-2">(в среднем, от 5 игр)</span></h2>
          </div>
          {data.bestAvgDistance ? (
            <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_#000]">
              <div className="text-6xl font-black tracking-tight text-black mb-4 drop-shadow-[2px_2px_0px_#5271ff]">
                {data.bestAvgDistance.avg_distance >= 1000 
                  ? `${(data.bestAvgDistance.avg_distance / 1000).toFixed(1)} км` 
                  : `${data.bestAvgDistance.avg_distance.toFixed(0)} м`}
              </div>
              <div className="text-2xl font-black uppercase bg-secondary inline-block px-2 border-2 border-black mb-2">{data.bestAvgDistance.participant_name}</div>
              <div className="text-lg font-bold text-black text-black">Сыграно игр: {data.bestAvgDistance.games_played}</div>
            </div>
          ) : (
            <p className="font-bold text-lg bg-white p-4 border-4 border-black inline-block">Нет данных (нужно минимум 5 игр)</p>
          )}
        </div>
      </div>
    </div>
  );
}