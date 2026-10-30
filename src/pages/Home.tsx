import { useNavigate } from 'react-router-dom';
import Hero from '../components/Hero/Hero';
import BuildTimestampBadge from '../components/BuildTimestampBadge/BuildTimestampBadge';
import PhotoCarousel from '../components/PhotoCarousel/PhotoCarousel';

const Home = () => {
  const navigate = useNavigate();
  return (
    <div className="home">
      <Hero>
        <PhotoCarousel onOpenActivity={id => navigate(`/running?activity=${id}`)} />
      </Hero>
      <BuildTimestampBadge />
    </div>
  );
};

export default Home;
