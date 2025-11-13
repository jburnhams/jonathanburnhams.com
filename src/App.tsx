import './App.css'
import Hero from './components/Hero/Hero'
import BuildTimestampBadge from './components/BuildTimestampBadge/BuildTimestampBadge'

/**
 * Main application component
 *
 * This is the root component that renders the personal homepage
 * for Jonathan Burnhams.
 */
function App() {
  return (
    <div className="app">
      <Hero />
      <BuildTimestampBadge />
    </div>
  )
}

export default App
