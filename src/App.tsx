import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CupPage from './pages/CupPage';
import AdminPanel from './pages/AdminPanel';
import Analytics from './pages/Analytics';
import Archive from './pages/Archive';
import Navbar from './components/Navbar';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground font-sans">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cup/:id" element={<CupPage />} />
            {import.meta.env.VITE_STATIC_MODE !== 'true' && <Route path="/admin" element={<AdminPanel />} />}
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/archive" element={<Archive />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;