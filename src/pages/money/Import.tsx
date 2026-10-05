import { useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMoneyContext } from './context'
import { guessHeaderRow, parseCsv } from '../../lib/csv'
import { formatMoney, guessFormat, headerNames, matchRule, monthOf, readTransactions } from '../../lib/money'
import { parseISODate } from '../../lib/dates'
import { EmptyState, Panel } from '../../components/Panel'
import type { CsvFormat } from '../../types'

const PREVIEW_ROWS = 100

/** A saved layout is reused only if this file still has its columns. */
function fits(format: Partial<CsvFormat>, rows: string[][]): format is CsvFormat {
  if (format.headerRow === undefined || !format.dateCol) return false
  const headers = headerNames(rows[format.headerRow] ?? [])
  const cols = format.amountMode === 'split' ? [format.outCol, format.inCol] : [format.amountCol]
  return [format.dateCol, ...cols, ...(format.descriptionCols ?? [])].every((c) => !!c && headers.includes(c))
}

const dateLabel = (d: string) => parseISODate(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

function ColumnSelect({ id, label, value, headers, onChange, optional }: { id: string; label: string; value: string; headers: string[]; onChange: (v: string) => void; optional?: boolean }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{optional ? 'None' : 'Choose a column'}</option>
        {headers.map((h, i) => (
          <option key={`${i}-${h}`} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function Import() {
  const { accounts, categories, rules, addAccount, saveFormat, importRows, setMonth, addStarterCategories } = useMoneyContext()
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? 'new')
  const [newName, setNewName] = useState('')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<string[][] | null>(null)
  const [format, setFormat] = useState<CsvFormat | null>(null)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ added: number; total: number; month: string } | null>(null)
  const [fileError, setFileError] = useState('')

  const account = accounts.find((a) => a.id === accountId)

  function formatFor(id: string, csv: string[][]): CsvFormat {
    const saved = accounts.find((a) => a.id === id)?.csv_format ?? {}
    return fits(saved, csv) ? saved : guessFormat(csv, guessHeaderRow(csv))
  }

  async function pickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setResult(null)
    setFileError('')
    const csv = parseCsv(await file.text())
    if (csv.length < 2) {
      setFileError(`${file.name} doesn't look like a CSV with transactions in it.`)
      return
    }
    setFileName(file.name)
    setRows(csv)
    setFormat(formatFor(accountId, csv))
  }

  function chooseAccount(id: string) {
    setAccountId(id)
    if (rows) setFormat(formatFor(id, rows))
  }

  const set = (patch: Partial<CsvFormat>) => format && setFormat({ ...format, ...patch })
  const headers = rows && format ? headerNames(rows[format.headerRow] ?? []) : []
  const parsed = rows && format ? readTransactions(rows, format) : null
  const preview = parsed?.rows ?? []
  const categoryName = new Map(categories.map((c) => [c.id, c.name]))
  const categorised = preview.map((r) => ({ ...r, categoryId: matchRule(r.description, rules)?.category_id ?? null }))
  const dates = preview.map((r) => r.date).sort()
  const moneyIn = preview.reduce((s, r) => s + Math.max(0, r.amount), 0)
  const moneyOut = preview.reduce((s, r) => s - Math.min(0, r.amount), 0)
  const matched = categorised.filter((r) => r.categoryId).length
  const canImport = !!format && preview.length > 0 && (accountId === 'new' ? !!newName.trim() : !!account) && !saving

  async function save() {
    if (!format || !canImport) return
    setSaving(true)
    const target = accountId === 'new' ? await addAccount(newName.trim()) : account
    if (target) {
      await saveFormat(target.id, format)
      const added = await importRows(target.id, categorised)
      if (added !== null) {
        const month = monthOf(dates[dates.length - 1])
        setResult({ added, total: preview.length, month })
        setMonth(month)
        setRows(null)
        setFormat(null)
        setAccountId(target.id)
        setNewName('')
      }
    }
    setSaving(false)
  }

  return (
    <div className="grid">
      <Panel title="Import a bank CSV">
        <p className="muted">Download a CSV of transactions from your bank's website or app, then pick it here. Nothing is saved until you press Import.</p>
        <div className="fields-grid">
          <div className="field">
            <label className="field-label" htmlFor="import-account">
              Account
            </label>
            <select id="import-account" value={accountId} onChange={(e) => chooseAccount(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
              <option value="new">New account</option>
            </select>
          </div>
          {accountId === 'new' && (
            <div className="field prose">
              <label className="field-label" htmlFor="import-name">
                Account name
              </label>
              <input id="import-name" placeholder="Current account" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
          )}
          <div className="field full">
            <label className="field-label" htmlFor="import-file">
              CSV file
            </label>
            <input id="import-file" type="file" accept=".csv,text/csv,text/plain" onChange={pickFile} />
            {fileName && rows && <div className="hint">{fileName}</div>}
          </div>
        </div>
        {fileError && <div className="status err">{fileError}</div>}
        {result && (
          <p className="notice ok">
            Added {result.added} new transaction{result.added === 1 ? '' : 's'}
            {result.total > result.added ? `; ${result.total - result.added} were already imported` : ''}.{' '}
            <Link to="/money">See the overview</Link> or <Link to="/money/transactions">check the transactions</Link>.
          </p>
        )}
        {categories.length === 0 && (
          <p className="notice">
            You have no categories yet, so everything will import uncategorised.{' '}
            <button type="button" className="link-btn" onClick={addStarterCategories}>
              Add starter categories
            </button>
          </p>
        )}
      </Panel>

      {rows && format && (
        <Panel title="Match the columns" meta={account && fits(account.csv_format, rows) ? <span className="tag">Saved layout</span> : undefined}>
          <div className="fields-grid">
            <div className="field">
              <label className="field-label" htmlFor="map-header">
                Header row
              </label>
              <input
                id="map-header"
                type="number"
                min="1"
                max={rows.length}
                inputMode="numeric"
                value={format.headerRow + 1}
                onChange={(e) => {
                  const n = Math.min(rows.length, Math.max(1, Number(e.target.value) || 1)) - 1
                  setFormat({ ...guessFormat(rows, n), flipSign: format.flipSign })
                }}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="map-order">
                Dates are written
              </label>
              <select id="map-order" value={format.dateOrder} onChange={(e) => set({ dateOrder: e.target.value as CsvFormat['dateOrder'] })}>
                <option value="dmy">Day first (31/01/2026)</option>
                <option value="mdy">Month first (01/31/2026)</option>
              </select>
            </div>
            <ColumnSelect id="map-date" label="Date" value={format.dateCol} headers={headers} onChange={(v) => set({ dateCol: v })} />
            <ColumnSelect
              id="map-desc"
              label="Description"
              value={format.descriptionCols[0] ?? ''}
              headers={headers}
              onChange={(v) => set({ descriptionCols: [v, ...format.descriptionCols.slice(1)].filter(Boolean) })}
            />
            <ColumnSelect
              id="map-desc2"
              label="Add to description"
              optional
              value={format.descriptionCols[1] ?? ''}
              headers={headers}
              onChange={(v) => set({ descriptionCols: [format.descriptionCols[0] ?? '', v].filter(Boolean) })}
            />
            <div className="field">
              <label className="field-label" htmlFor="map-mode">
                Amounts
              </label>
              <select id="map-mode" value={format.amountMode} onChange={(e) => set({ amountMode: e.target.value as CsvFormat['amountMode'] })}>
                <option value="single">One column</option>
                <option value="split">Money out and money in columns</option>
              </select>
            </div>
            {format.amountMode === 'single' ? (
              <>
                <ColumnSelect id="map-amount" label="Amount" value={format.amountCol} headers={headers} onChange={(v) => set({ amountCol: v })} />
                <div className="field">
                  <span className="field-label">Sign</span>
                  <label className="row">
                    <input type="checkbox" checked={format.flipSign} onChange={(e) => set({ flipSign: e.target.checked })} />
                    Spending shows as positive
                  </label>
                </div>
              </>
            ) : (
              <>
                <ColumnSelect id="map-out" label="Money out" value={format.outCol} headers={headers} onChange={(v) => set({ outCol: v })} />
                <ColumnSelect id="map-in" label="Money in" value={format.inCol} headers={headers} onChange={(v) => set({ inCol: v })} />
              </>
            )}
          </div>
          <p className="hint">The layout is saved with the account, so next time this bank's file is matched for you.</p>
        </Panel>
      )}

      {rows && format && parsed && (
        <Panel title="Preview" meta={preview.length > PREVIEW_ROWS ? <span className="tag">First {PREVIEW_ROWS} rows</span> : undefined}>
          {preview.length === 0 ? (
            <EmptyState>No rows have a readable date and amount yet. Check the header row and the columns above.</EmptyState>
          ) : (
            <>
              <dl className="totals">
                <div>
                  <dt>Transactions</dt>
                  <dd>{preview.length}</dd>
                </div>
                <div>
                  <dt>Dates</dt>
                  <dd className="small">
                    {dateLabel(dates[0])} to {dateLabel(dates[dates.length - 1])}
                  </dd>
                </div>
                <div>
                  <dt>Money in</dt>
                  <dd>{formatMoney(moneyIn)}</dd>
                </div>
                <div>
                  <dt>Money out</dt>
                  <dd>{formatMoney(moneyOut)}</dd>
                </div>
                <div>
                  <dt>Categorised</dt>
                  <dd>
                    {matched} of {preview.length}
                  </dd>
                </div>
              </dl>
              {parsed.skipped.length > 0 && (
                <p className="notice">
                  {parsed.skipped.length} row{parsed.skipped.length === 1 ? '' : 's'} without a readable date or amount will be left out (line
                  {parsed.skipped.length === 1 ? '' : 's'} {parsed.skipped.slice(0, 10).join(', ')}
                  {parsed.skipped.length > 10 ? ' and more' : ''}). Balance and summary lines are normal here.
                </p>
              )}
              <div className="table-wrap">
                <table className="table ledger">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th className="num">Amount</th>
                      <th>Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorised.slice(0, PREVIEW_ROWS).map((r) => (
                      <tr key={r.importKey}>
                        <td>{r.date}</td>
                        <td className="desc">{r.description || <span className="muted">No description</span>}</td>
                        <td className={r.amount > 0 ? 'num in' : 'num'}>{formatMoney(r.amount, true)}</td>
                        <td>{r.categoryId ? categoryName.get(r.categoryId) : <span className="muted">None yet</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="actions">
            <button type="button" className="btn stamp" disabled={!canImport} onClick={save}>
              {saving ? 'Importing…' : `Import ${preview.length} transaction${preview.length === 1 ? '' : 's'}`}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setRows(null)
                setFormat(null)
              }}
            >
              Cancel
            </button>
            {accountId === 'new' && !newName.trim() && <span className="muted">Name the account first.</span>}
          </div>
        </Panel>
      )}
    </div>
  )
}
