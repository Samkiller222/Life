import { describe, expect, it } from 'vitest'
import { addMonths, budgetState, matchRule, monthRange, parseAmountInput, suggestPattern, summarise } from './money'
import type { Category, Rule, Transaction } from '../types'

describe('parseAmountInput', () => {
  it.each([
    ['12.50', 12.5],
    ['12,50', 12.5],
    ['€ 3', 3],
    ['.5', 0.5],
    ['7.', 7],
    ['2.345', 2.35],
    ['0', null],
    ['-4', null],
    ['1,234.50', null],
    ['abc', null],
    ['', null],
  ])('%s', (raw, expected) => {
    expect(parseAmountInput(raw)).toBe(expected)
  })
})

const rule = (pattern: string, category_id: string, position: number): Rule => ({ id: pattern, pattern, category_id, position })

describe('rules', () => {
  it('uses the first matching rule by position, ignoring case', () => {
    const rules = [rule('lidl', 'groceries', 1), rule('card', 'other', 0)]
    expect(matchRule('LIDL MALTA', rules)?.category_id).toBe('groceries')
    expect(matchRule('Card payment LIDL', rules)?.category_id).toBe('other')
    expect(matchRule('Bolt ride', rules)).toBeUndefined()
  })

  it('suggests a pattern without card numbers or dates', () => {
    expect(suggestPattern('POS PURCHASE 12/09 LIDL MSIDA 4567****1234')).toBe('POS PURCHASE LIDL')
    expect(suggestPattern('Netflix.com')).toBe('Netflix.com')
  })
})

const cat = (id: string, kind: Category['kind'], monthly_budget: number | null = null): Category => ({ id, name: id, kind, monthly_budget, position: 0 })
const tx = (amount: number, category_id: string | null): Transaction => ({
  id: String(Math.random()),
  account_id: 'a',
  date: '2026-09-01',
  description: '',
  amount,
  category_id,
  categorised_by: null,
})

describe('summarise', () => {
  it('splits income, spending and transfers, netting refunds', () => {
    const cats = [cat('food', 'expense', 300), cat('pay', 'income'), cat('move', 'transfer'), cat('fun', 'expense')]
    const s = summarise([tx(-50, 'food'), tx(10, 'food'), tx(2000, 'pay'), tx(-500, 'move'), tx(-20, null), tx(5, null)], cats)
    expect(s.income).toBe(2005)
    expect(s.spending).toBe(60)
    expect(s.uncategorisedCount).toBe(2)
    expect(s.uncategorisedSpending).toBe(20)
    expect(s.budgeted).toBe(300)
    expect(s.lines.map((l) => [l.category.id, l.spent])).toEqual([
      ['food', 40],
      ['fun', 0],
    ])
  })
})

describe('months', () => {
  it('steps months and finds their last day', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(monthRange('2028-02')).toEqual(['2028-02-01', '2028-02-29'])
  })
})

describe('budgetState', () => {
  it('warns from 85% and flags overspending', () => {
    expect(budgetState(50, 100)).toBe('')
    expect(budgetState(85, 100)).toBe('warn')
    expect(budgetState(100, 100)).toBe('warn')
    expect(budgetState(101, 100)).toBe('over')
    expect(budgetState(0, null)).toBe('')
  })
})
