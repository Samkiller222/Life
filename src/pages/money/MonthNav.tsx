import { addMonths, monthOf } from '../../lib/money'
import { today } from '../../lib/dates'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/Icons'

export default function MonthNav({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <>
      <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => onChange(addMonths(month, -1))}>
        <ChevronLeftIcon />
      </button>
      <button type="button" className="icon-btn" aria-label="Next month" onClick={() => onChange(addMonths(month, 1))} disabled={month >= monthOf(today())}>
        <ChevronRightIcon />
      </button>
    </>
  )
}
