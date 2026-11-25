import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { analyse, decodePolyline, photoColours, routePath, score, seedsFrom, webpWidths, widthsFor } from './backgrounds.mjs'
import { firstPhotoScript } from './first-photo.mjs'

const image = (bg, patch) => sharp({ create: { width: 1200, height: 800, channels: 3, background: bg } })
  .composite(patch ? [{ input: { create: { width: 300, height: 300, channels: 3, background: patch } }, left: 100, top: 100 }] : [])
  .jpeg().toBuffer()

describe('background photos', () => {
  it('scores a landscape, well-exposed, colourful photo above a dark grey one', async () => {
    const good = await analyse(await image('#3a6ea5', '#e8442a'))
    const dull = await analyse(await image('#101010'))
    expect(good.width).toBe(1200)
    expect(score(good)).toBeGreaterThan(score(dull))
  })

  it('takes the primary from the photo\'s strongest colour and the secondary from what it is mostly made of', async () => {
    const seeds = seedsFrom(await photoColours(await image('#6b7f4a', '#d8262c')))
    expect(seeds.from).toBe('photo')
    const hue = (hex) => { const [r, g] = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16)]; return r > g ? 'red' : 'green' }
    expect(hue(seeds.primary)).toBe('red')
    expect(hue(seeds.secondary)).toBe('green')
  })

  it('gives a grey photo the complement of its main hue', async () => {
    expect(seedsFrom(await photoColours(await image('#7a7c80'))).from).toBe('complement')
  })

  it('draws the route in a 100 x 100 box, north up', () => {
    const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')
    expect(points[0]).toEqual([38.5, -120.2])
    const d = routePath(points)
    expect(d.startsWith('M')).toBe(true)
    for (const n of d.match(/-?[\d.]+/g).map(Number)) expect(n).toBeGreaterThanOrEqual(0), expect(n).toBeLessThanOrEqual(100)
    expect(routePath([[1, 1]])).toBeNull()
  })

  it('builds widths up to the source, and WebP only up to about 1920', () => {
    expect(widthsFor(1200)).toEqual([640, 960, 1200])
    expect(widthsFor(2048)).toEqual([640, 960, 1440, 2048])
    expect(widthsFor(4618)).toEqual([640, 960, 1440, 1920, 2560, 3200])
    expect(webpWidths(widthsFor(1200))).toEqual([640, 960, 1200])
    expect(webpWidths(widthsFor(2048))).toEqual([640, 960, 1440, 2048])
    expect(webpWidths(widthsFor(4618))).toEqual([640, 960, 1440, 1920])
  })

  it('writes a head script only when there are photos', () => {
    expect(firstPhotoScript([])).toBe('')
    expect(firstPhotoScript([{ id: 'a_0', sizes: [{ width: 640 }] }])).toContain('/backgrounds/')
  })
})
