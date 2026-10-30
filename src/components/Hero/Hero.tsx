import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './Hero.css'

/**
 * Hero component displaying the main name and introduction
 *
 * This component renders a modern, animated hero section with
 * the name "Jonathan Burnhams" and a subtle gradient effect.
 * Anything passed as children (the photo carousel) goes under the links.
 */
function Hero({ children }: { children?: ReactNode }) {
  return (
    <section className="hero" role="banner">
      <div className="hero-content">
        <h1 className="hero-title">
          <span className="hero-name">Jonathan Burnhams</span>
        </h1>
        <div className="hero-underline" aria-hidden="true"></div>
        <div className="hero-links">
          <Link to="/running" className="hero-link">
            🏃‍♂️ Running 🏃‍♀️
          </Link>
          <Link to="/training" className="hero-link">
            📈 Training
          </Link>
          <a href="https://www.strava.com/athletes/jburnhams" target="_blank" rel="noopener noreferrer" className="hero-link">
            🔗 Strava Profile
          </a>
          <a href="https://www.youtube.com/@JonathanBurnhams" target="_blank" rel="noopener noreferrer" className="hero-link">
            📹 YouTube 🎬
          </a>
          <a href="https://github.com/jburnhams" target="_blank" rel="noopener noreferrer" className="hero-link">
            👨‍💻 GitHub 💻
          </a>
        </div>
        {children}
      </div>
    </section>
  )
}

export default Hero;
