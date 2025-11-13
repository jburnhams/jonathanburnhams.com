export const DEFAULT_BUILD_TIMESTAMP = '1970-01-01T00:00:00.000Z'

interface BuildInfo {
  buildTimestamp?: string
}

declare global {
  interface Window {
    __BUILD_INFO__?: BuildInfo
  }
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function getBuildTimestamp() {
  if (typeof window === 'undefined') {
    return DEFAULT_BUILD_TIMESTAMP
  }

  const timestamp = window.__BUILD_INFO__?.buildTimestamp
  return isValidTimestamp(timestamp) ? timestamp : DEFAULT_BUILD_TIMESTAMP
}
