import { Link } from 'react-router-dom';
import { Settings, BarChart2, Archive, Send } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b-4 border-black bg-secondary">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 md:space-x-3 text-xl md:text-2xl font-black tracking-tight text-black uppercase">
          <img src="/logo.png" alt="PrGuessrCup Logo" className="h-8 w-8 md:h-10 md:w-10 object-contain" />
          <span className="hidden sm:inline">PrGuessrCup</span>
        </Link>
        <div className="flex items-center space-x-3 md:space-x-6 text-xs md:text-sm font-black text-black uppercase tracking-wider">
          <a href="https://t.me/prguessrcup" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 hover:underline decoration-4 underline-offset-4">
            <Send size={20} className="md:w-5 md:h-5 w-6 h-6" />
            <span className="hidden md:inline">Telegram</span>
          </a>
          <Link to="/archive" className="flex items-center space-x-1 hover:underline decoration-4 underline-offset-4">
            <Archive size={20} className="md:w-5 md:h-5 w-6 h-6" />
            <span className="hidden md:inline">Архив</span>
          </Link>
          <Link to="/analytics" className="flex items-center space-x-1 hover:underline decoration-4 underline-offset-4">
            <BarChart2 size={20} className="md:w-5 md:h-5 w-6 h-6" />
            <span className="hidden md:inline">Аналитика</span>
          </Link>
          {import.meta.env.VITE_STATIC_MODE !== 'true' && (
            <Link to="/admin" className="flex items-center space-x-1 hover:underline decoration-4 underline-offset-4">
              <Settings size={20} className="md:w-5 md:h-5 w-6 h-6" />
              <span className="hidden md:inline">Админ</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}