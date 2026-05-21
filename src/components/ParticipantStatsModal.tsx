import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { X } from 'lucide-react';

export function ParticipantNameButton({
  name,
  onClick,
  className = '',
}: {
  name: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`hover:bg-secondary px-2 py-1 transition-colors text-left font-black uppercase border-2 border-transparent hover:border-black hover:shadow-[2px_2px_0px_0px_#000] ${className}`}
    >
      {name}
    </button>
  );
}

export function ParticipantStatsModal({
  participantId,
  cupId,
  onClose,
}: {
  participantId: string;
  cupId?: string;
  onClose: () => void;
}) {
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
