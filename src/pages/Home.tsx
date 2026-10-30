import Hero from '../components/Hero/Hero';
import BuildTimestampBadge from '../components/BuildTimestampBadge/BuildTimestampBadge';
import PhotoCarousel from '../components/PhotoCarousel/PhotoCarousel';

const Home = () => {
  return (
    <div className="home">
      <Hero>
        <PhotoCarousel />
      </Hero>
      <BuildTimestampBadge />
    </div>
  );
};

export default Home;
