// The site's routes, shared by main.tsx and the tests (renderRoutes from strata-react/testing).
// The homepage is in the first bundle; the other pages load when visited, so the homepage does
// not download the map, the tables and the chart (most of the JavaScript) before its photo.
import type { RouteObject } from 'react-router'
import Home from './pages/Home'

const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({ Component: (await load()).default })

export const routes: RouteObject[] = [
  { path: '/', element: <Home /> },
  {
    lazy: async () => ({ Component: (await import('./components/SiteLayout')).SiteLayout }),
    children: [
      { path: '/running', lazy: page(() => import('./pages/Running')) },
      { path: '/running/:slug', lazy: page(() => import('./pages/RacePage')) },
      { path: '/training', lazy: page(() => import('./pages/Training')) },
      { path: '*', lazy: page(() => import('./pages/NotFound')) },
    ],
  },
]
