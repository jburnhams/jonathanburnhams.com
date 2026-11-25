import { TextLink } from 'strata-react';
import { PlainBand } from '../components/PhotoBand';

/** Any address the site does not have (404.html serves the app, which lands here). */
export default function NotFound() {
  return (
    <PlainBand title="No page at this address">
      <p>It may be an old link. The races are on <TextLink to="/running">Running</TextLink>.</p>
    </PlainBand>
  );
}
