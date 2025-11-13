import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../utils/getBuildTimestamp', () => ({
  getBuildTimestamp: vi.fn(() => '2024-01-02T03:04:05.678Z'),
}))

import { getBuildTimestamp } from '../../utils/getBuildTimestamp'
import BuildTimestampBadge from './BuildTimestampBadge'

const mockGetBuildTimestamp = vi.mocked(getBuildTimestamp)

describe('BuildTimestampBadge', () => {
  it('renders the fallback label before hydration', () => {
    render(<BuildTimestampBadge />)

    expect(
      screen.getByText('Build timestamp unavailable', { exact: false })
    ).toBeInTheDocument()
  })

  it('exposes the build timestamp value as a data attribute', () => {
    mockGetBuildTimestamp.mockReturnValueOnce('2024-06-15T12:30:45.000Z')

    const { container } = render(<BuildTimestampBadge />)
    const badge = container.querySelector('[data-build-timestamp]')

    expect(badge).not.toBeNull()
    expect(badge).toHaveAttribute(
      'data-build-timestamp',
      '2024-06-15T12:30:45.000Z'
    )
  })
})
