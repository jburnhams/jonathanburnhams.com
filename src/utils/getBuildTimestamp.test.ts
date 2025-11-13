import { describe, expect, it, afterEach } from 'vitest'
import { DEFAULT_BUILD_TIMESTAMP, getBuildTimestamp } from './getBuildTimestamp'

afterEach(() => {
  delete (window as { __BUILD_INFO__?: unknown }).__BUILD_INFO__
})

describe('getBuildTimestamp', () => {
  it('returns the default timestamp when build info is missing', () => {
    delete (window as { __BUILD_INFO__?: unknown }).__BUILD_INFO__

    expect(getBuildTimestamp()).toBe(DEFAULT_BUILD_TIMESTAMP)
  })

  it('returns the default timestamp when the value is not a non-empty string', () => {
    ;(window as { __BUILD_INFO__?: unknown }).__BUILD_INFO__ = {
      buildTimestamp: '',
    }

    expect(getBuildTimestamp()).toBe(DEFAULT_BUILD_TIMESTAMP)

    ;(window as { __BUILD_INFO__?: unknown }).__BUILD_INFO__ = {
      buildTimestamp: 42,
    }

    expect(getBuildTimestamp()).toBe(DEFAULT_BUILD_TIMESTAMP)
  })

  it('returns the timestamp when provided with a valid string value', () => {
    ;(window as { __BUILD_INFO__?: unknown }).__BUILD_INFO__ = {
      buildTimestamp: '2024-06-15T12:30:45.000Z',
    }

    expect(getBuildTimestamp()).toBe('2024-06-15T12:30:45.000Z')
  })
})
