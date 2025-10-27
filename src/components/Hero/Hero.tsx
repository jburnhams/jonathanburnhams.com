import './Hero.css'

/**
 * Hero component displaying the main name and introduction
 *
 * This component renders a modern, animated hero section with
 * the name "Jonathan Burnhams" and a subtle gradient effect.
 */
function Hero() {
  return (
    <section className="hero" role="banner">
      <div className="hero-content">
        <h1 className="hero-title">
          <span className="hero-name">Jonathan Burnhams</span>
        </h1>
        <div className="hero-underline" aria-hidden="true"></div>
        <div className="hero-links">
          <a href="https://www.strava.com/athletes/jburnhams" target="_blank" rel="noopener noreferrer" className="hero-link">
            🏃‍♂️ Strava 🏃‍♀️
          </a>
        </div>
      </div>
    </section>
  )
}

export default Hero
