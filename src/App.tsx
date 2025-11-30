import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Running from './pages/Running';
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
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
