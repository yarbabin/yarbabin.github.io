import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import CupScoreboard from '../components/CupScoreboard';

export default function Dashboard() {
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

  const latestCup = cups.length > 0 ? cups[0] : null;

  return (
    <div>
      <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-8 md:mb-10 text-black drop-shadow-[4px_4px_0px_#fff]">Дашборд</h1>

      {latestCup ? (
        <div className="mb-12">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-6 text-black bg-white inline-block px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">Текущий кубок</h2>
          <CupScoreboard cupId={latestCup.id} />
        </div>
      ) : (
        <p className="text-black font-bold bg-white p-4 border-4 border-black">Нет доступных кубков.</p>
      )}
    </div>
  );
}