import { useNavigate } from 'react-router-dom';
import Hero from '../components/Hero/Hero';
import BuildTimestampBadge from '../components/BuildTimestampBadge/BuildTimestampBadge';
import PhotoCarousel from '../components/PhotoCarousel/PhotoCarousel';
import { getRacePages, racePageUrl } from '../utils/racePages';

const Home = () => {
  const navigate = useNavigate();
  return (
    <div className="home">
      <Hero>
        <PhotoCarousel
          onOpenActivity={async id => {
            const slugs = await getRacePages();
            if (slugs[id]) window.location.assign(racePageUrl(slugs[id])); // the race's own page
            else navigate(`/running?activity=${id}`); // no race page (e.g. dev server): the popup
          }}
        />
      </Hero>
      <BuildTimestampBadge />
    </div>
  );
};

export default Home;
