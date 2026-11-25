import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { StrataQueryProvider, ThemeProvider } from 'strata-react'
import { routes } from './routes'
import './app.css'
import { hydrateBuildTimestampBadges } from './utils/hydrateBuildTimestampBadges'

const router = createBrowserRouter(routes)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <StrataQueryProvider>
        <RouterProvider router={router} />
      </StrataQueryProvider>
    </ThemeProvider>
  </StrictMode>,
)

hydrateBuildTimestampBadges()
