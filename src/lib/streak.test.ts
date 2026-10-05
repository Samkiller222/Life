import { describe, expect, it } from 'vitest'
import { completionRate, streak } from './streak'

const ALL = [0, 1, 2, 3, 4, 5, 6]
// 2026-10-05 is a Monday.
const MON = '2026-10-05'

describe('streak', () => {
  it('counts consecutive days ending today', () => {
    const done = new Set(['2026-10-03', '2026-10-04', '2026-10-05'])
    expect(streak(done, ALL, MON, '2026-01-01')).toBe(3)
  })

  it('keeps the streak when today is not done yet', () => {
    const done = new Set(['2026-10-03', '2026-10-04'])
    expect(streak(done, ALL, MON, '2026-01-01')).toBe(2)
  })

  it('breaks on a missed scheduled day', () => {
    const done = new Set(['2026-10-02', '2026-10-04', '2026-10-05'])
    expect(streak(done, ALL, MON, '2026-01-01')).toBe(2)
  })

  it('skips days the habit is not scheduled', () => {
    // Mon, Wed, Fri only: Fri 2 Oct and Mon 5 Oct, weekend ignored.
    const done = new Set(['2026-09-30', '2026-10-02', '2026-10-05'])
    expect(streak(done, [1, 3, 5], MON, '2026-01-01')).toBe(3)
  })

  it('stops at the creation date', () => {
    const done = new Set(['2026-10-04', '2026-10-05'])
    expect(streak(done, ALL, MON, '2026-10-04')).toBe(2)
  })

  it('is zero with nothing done', () => {
    expect(streak(new Set(), ALL, MON, '2026-01-01')).toBe(0)
  })
})

describe('completionRate', () => {
  const week = ['2026-10-05', '2026-10-06', '2026-10-07']

  it('ignores future days', () => {
    expect(completionRate(new Set(['2026-10-05']), ALL, week, MON)).toBe(1)
  })

  it('returns null when nothing was due', () => {
    expect(completionRate(new Set(), [3], week, MON)).toBeNull()
  })
})
