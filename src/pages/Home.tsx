import Hero from '../components/Hero/Hero';
import BuildTimestampBadge from '../components/BuildTimestampBadge/BuildTimestampBadge';

const Home = () => {
  return (
    <div className="home">
      <Hero />
      <BuildTimestampBadge />
    </div>
  );
};

export default Home;
