import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { IndexPage } from './pages/IndexPage';
import { ModePage } from './pages/ModePage';
import { HeroPage } from './pages/HeroPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/modo/:dungeonId" element={<ModePage />} />
        <Route path="/heroi/:heroId" element={<HeroPage />} />
      </Routes>
    </BrowserRouter>
  );
}
