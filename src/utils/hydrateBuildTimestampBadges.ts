const BUILD_TIMESTAMP_PLACEHOLDER = '__BUILD_TIMESTAMP__'
const BUILD_TIMESTAMP_ATTRIBUTE = 'data-build-timestamp'
const FALLBACK_TEXT = 'Build timestamp unavailable'

function formatTimestamp(rawValue: string) {
  if (!rawValue || rawValue === BUILD_TIMESTAMP_PLACEHOLDER) {
    return null
  }

  const parsedDate = new Date(rawValue)
  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return formatter.format(parsedDate)
}

export function hydrateBuildTimestampBadges() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  const badges = document.querySelectorAll<HTMLElement>(`[${BUILD_TIMESTAMP_ATTRIBUTE}]`)
  if (!badges.length) {
    return
  }

  badges.forEach((badge) => {
    const rawValue = badge.getAttribute(BUILD_TIMESTAMP_ATTRIBUTE)
    const formattedValue = rawValue ? formatTimestamp(rawValue) : null

    badge.textContent = formattedValue ?? FALLBACK_TEXT
  })
}
