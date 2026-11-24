import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router'

/** Header for screens outside the tab bar: back arrow + title. */
export function ScreenHeader({ title, backTo }: { title: string; backTo: string }) {
  const navigate = useNavigate()
  return (
    <header className="flex items-center gap-2 py-4">
      <button
        type="button"
        onClick={() => navigate(backTo)}
        aria-label="Back"
        className="grid size-11 place-items-center rounded-full text-fg hover:bg-surface-2"
      >
        <ChevronLeft size={24} aria-hidden />
      </button>
      <h1 className="text-lg font-bold">{title}</h1>
    </header>
  )
}
