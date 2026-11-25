// The site's routes, shared by main.tsx and the tests (renderRoutes from strata-react/testing).
import type { RouteObject } from 'react-router'
import Home from './pages/Home'
import Running from './pages/Running'
import RacePage from './pages/RacePage'
import Training from './pages/Training'
import NotFound from './pages/NotFound'
import { SiteLayout } from './components/SiteLayout'

export const routes: RouteObject[] = [
  { path: '/', element: <Home /> },
  {
    element: <SiteLayout />,
    children: [
      { path: '/running', element: <Running /> },
      { path: '/running/:slug', element: <RacePage /> },
      { path: '/training', element: <Training /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]
