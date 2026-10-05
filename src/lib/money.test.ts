import { describe, expect, it } from 'vitest'
import { detectDelimiter, guessHeaderRow, parseCsv } from './csv'
import { addMonths, budgetState, guessFormat, matchRule, monthRange, parseAmount, parseDate, readTransactions, suggestPattern, summarise } from './money'
import type { Category, Rule, Transaction } from '../types'

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, commas inside quotes and CRLF', () => {
    const rows = parseCsv('a,b,c\r\n"x, y","say ""hi""",3\r\n\r\n')
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['x, y', 'say "hi"', '3'],
    ])
  })

  it('detects semicolons and tabs', () => {
    expect(detectDelimiter('Date;Amount;Text\n01.10.2026;-1,50;Kiosk')).toBe(';')
    expect(detectDelimiter('Date\tAmount\n1\t2')).toBe('\t')
  })

  it('finds the header below an account summary', () => {
    const rows = parseCsv('Account,12345\nFrom,01/09/2026\nDate,Description,Debit,Credit,Balance\n01/09/2026,Tesco,12.00,,100.00')
    expect(guessHeaderRow(rows)).toBe(2)
  })
})

describe('parseAmount', () => {
  it.each([
    ['-12.50', -12.5],
    ['1,234.56', 1234.56],
    ['1.234,56', 1234.56],
    ['-1,50', -1.5],
    ['€12.50', 12.5],
    ['(12.50)', -12.5],
    ['12.50 DR', -12.5],
    ['12.50-', -12.5],
    ['EUR 3', 3],
    ['', null],
    ['n/a', null],
  ])('%s', (raw, expected) => {
    expect(parseAmount(raw)).toBe(expected)
  })
})

describe('parseDate', () => {
  it('reads common bank formats', () => {
    expect(parseDate('05/10/2026', 'dmy')).toBe('2026-10-05')
    expect(parseDate('10/05/2026', 'mdy')).toBe('2026-10-05')
    expect(parseDate('2026-10-05 14:03:11', 'dmy')).toBe('2026-10-05')
    expect(parseDate('5 Oct 2026', 'dmy')).toBe('2026-10-05')
    expect(parseDate('05-Oct-26', 'dmy')).toBe('2026-10-05')
    expect(parseDate('01.10.2026', 'dmy')).toBe('2026-10-01')
  })

  it('rejects impossible dates', () => {
    expect(parseDate('31/02/2026', 'dmy')).toBeNull()
    expect(parseDate('Balance', 'dmy')).toBeNull()
  })
})

describe('guessFormat and readTransactions', () => {
  it('reads a Revolut-style export with one signed amount', () => {
    const csv = [
      'Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance',
      'CARD_PAYMENT,Current,2026-09-02 08:10:00,2026-09-03 09:00:00,Lidl,-23.40,0.00,EUR,COMPLETED,476.60',
      'TOPUP,Current,2026-09-01 10:00:00,2026-09-01 10:00:00,Salary,1500.00,0.00,EUR,COMPLETED,1976.60',
    ].join('\n')
    const rows = parseCsv(csv)
    const format = guessFormat(rows, guessHeaderRow(rows))
    expect(format).toMatchObject({ dateCol: 'Completed Date', descriptionCols: ['Description'], amountMode: 'single', amountCol: 'Amount' })
    const { rows: tx, skipped } = readTransactions(rows, format)
    expect(skipped).toEqual([])
    expect(tx.map((t) => [t.date, t.description, t.amount])).toEqual([
      ['2026-09-03', 'Lidl', -23.4],
      ['2026-09-01', 'Salary', 1500],
    ])
  })

  it('reads separate debit and credit columns and keeps identical rows apart', () => {
    const csv = [
      'Account summary',
      'Date,Description,Debit,Credit,Balance',
      '13/09/2026,COFFEE BAR,2.50,,97.50',
      '13/09/2026,COFFEE BAR,2.50,,95.00',
      '14/09/2026,REFUND,,10.00,105.00',
      'Closing balance,,,,105.00',
    ].join('\n')
    const rows = parseCsv(csv)
    const format = guessFormat(rows, guessHeaderRow(rows))
    expect(format).toMatchObject({ amountMode: 'split', outCol: 'Debit', inCol: 'Credit', dateOrder: 'dmy' })
    const { rows: tx, skipped } = readTransactions(rows, format)
    expect(tx.map((t) => t.amount)).toEqual([-2.5, -2.5, 10])
    expect(new Set(tx.map((t) => t.importKey)).size).toBe(3)
    expect(skipped).toEqual([6])
  })

  it('gives the same keys when the same file is read twice', () => {
    const rows = parseCsv('Date,Details,Amount\n01/09/2026,Shop,-5\n01/09/2026,Shop,-5')
    const f = guessFormat(rows, 0)
    expect(readTransactions(rows, f).rows.map((r) => r.importKey)).toEqual(readTransactions(rows, f).rows.map((r) => r.importKey))
  })

  it('flips the sign when spending is shown as positive', () => {
    const rows = parseCsv('Date,Details,Amount\n01/09/2026,Shop,5')
    const { rows: tx } = readTransactions(rows, { ...guessFormat(rows, 0), flipSign: true })
    expect(tx[0].amount).toBe(-5)
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
