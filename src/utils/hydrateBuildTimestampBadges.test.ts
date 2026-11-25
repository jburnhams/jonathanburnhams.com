import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hydrateBuildTimestampBadges } from './hydrateBuildTimestampBadges'

const FALLBACK_TEXT = 'Build timestamp unavailable'

describe('hydrateBuildTimestampBadges', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('formats timestamp attributes using Intl.DateTimeFormat', () => {
    const badge = document.createElement('div')
    badge.setAttribute('data-build-timestamp', '2024-06-15T12:30:45.000Z')
    document.body.appendChild(badge)

    hydrateBuildTimestampBadges()

    // en-GB day/month/year and a 24-hour time, in the visitor's own time zone
    expect(badge.textContent).toMatch(/^15\/06\/2024, \d{2}:\d{2}$/)
  })

  it('falls back to the placeholder text when the timestamp is invalid', () => {
    const badge = document.createElement('div')
    badge.setAttribute('data-build-timestamp', 'not-a-date')
    document.body.appendChild(badge)

    const dateTimeFormatSpy = vi.spyOn(Intl, 'DateTimeFormat')

    hydrateBuildTimestampBadges()

    expect(dateTimeFormatSpy).not.toHaveBeenCalled()
    expect(badge.textContent).toBe(FALLBACK_TEXT)
  })

  it('falls back to the placeholder text when the attribute is empty', () => {
    const badge = document.createElement('div')
    badge.setAttribute('data-build-timestamp', '')
    document.body.appendChild(badge)

    hydrateBuildTimestampBadges()

    expect(badge.textContent).toBe(FALLBACK_TEXT)
  })

  it('exits early when no badges are present', () => {
    const dateTimeFormatSpy = vi.spyOn(Intl, 'DateTimeFormat')

    hydrateBuildTimestampBadges()

    expect(dateTimeFormatSpy).not.toHaveBeenCalled()
  })
})
