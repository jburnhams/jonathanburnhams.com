// Vitest setup: jest-dom matchers, the MSW server that answers every request the app makes
// (strata-react's rule: never mock modules or stub fetch; put the server in a state instead), and
// the layout shims measuring components need in jsdom.
import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { installLayoutShims } from 'strata-react/testing'
import { server } from './server'

installLayoutShims()
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => { cleanup(); server.resetHandlers(); sessionStorage.clear(); delete document.body.dataset.photo })
afterAll(() => server.close())
