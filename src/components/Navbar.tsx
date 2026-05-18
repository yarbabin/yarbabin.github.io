import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings, BarChart2, Archive, Send, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b-4 border-black bg-secondary">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 md:space-x-3 text-xl md:text-2xl font-black tracking-tight text-black uppercase" onClick={closeMenu}>
          <img src="/logo.png" alt="PrGuessrCup Logo" className="h-8 w-8 md:h-10 md:w-10 object-contain" />
          <span>PrGuessrCup</span>
        </Link>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-6 text-sm font-black text-black uppercase tracking-wider">
          <a href="tg://resolve?domain=prguessrcup" className="flex items-center space-x-1 hover:underline decoration-4 underline-offset-4">
            <Send size={20} />
            <span>Telegram</span>
          </a>
          <Link to="/archive" className="flex items-center space-x-1 hover:underline decoration-4 underline-offset-4">
            <Archive size={20} />
            <span>Архив</span>
          </Link>
          <Link to="/analytics" className="flex items-center space-x-1 hover:underline decoration-4 underline-offset-4">
            <BarChart2 size={20} />
            <span>Аналитика</span>
          </Link>
          {import.meta.env.VITE_STATIC_MODE !== 'true' && (
            <Link to="/admin" className="flex items-center space-x-1 hover:underline decoration-4 underline-offset-4">
              <Settings size={20} />
              <span>Админ</span>
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button 
          className="md:hidden p-2 text-black hover:bg-black hover:text-white transition-colors border-2 border-transparent hover:border-black"
          onClick={toggleMenu}
        >
          {isMobileMenuOpen ? <X size={24} strokeWidth={3} /> : <Menu size={24} strokeWidth={3} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-secondary border-b-4 border-black shadow-xl flex flex-col font-black text-black uppercase tracking-wider">
          <a 
            href="tg://resolve?domain=prguessrcup" 
            className="flex items-center space-x-3 p-4 border-b-2 border-black hover:bg-white transition-colors"
            onClick={closeMenu}
          >
            <Send size={24} />
            <span>Telegram</span>
          </a>
          <Link 
            to="/archive" 
            className="flex items-center space-x-3 p-4 border-b-2 border-black hover:bg-white transition-colors"
            onClick={closeMenu}
          >
            <Archive size={24} />
            <span>Архив</span>
          </Link>
          <Link 
            to="/analytics" 
            className="flex items-center space-x-3 p-4 border-b-2 border-black hover:bg-white transition-colors"
            onClick={closeMenu}
          >
            <BarChart2 size={24} />
            <span>Аналитика</span>
          </Link>
          {import.meta.env.VITE_STATIC_MODE !== 'true' && (
            <Link 
              to="/admin" 
              className="flex items-center space-x-3 p-4 hover:bg-white transition-colors"
              onClick={closeMenu}
            >
              <Settings size={24} />
              <span>Админ</span>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}