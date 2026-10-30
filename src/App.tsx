import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Running from './pages/Running';
import Training from './pages/Training';
import RacePage from './pages/RacePage';
import './App.css';

/**
 * Main application component
 *
 * This is the root component that renders the personal homepage
 * for Jonathan Burnhams.
 */
function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/running" element={<Running />} />
          <Route path="/running/:slug" element={<RacePage />} />
          <Route path="/training" element={<Training />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
