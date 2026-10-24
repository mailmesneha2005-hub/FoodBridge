import { Link } from 'react-router-dom'

export function Brand({ light = false }: { light?: boolean }) {
  return <Link to="/" aria-label="FoodBridge home" className={`inline-flex items-center gap-2.5 font-display text-[1.2rem] font-extrabold tracking-[-.04em] ${light ? 'text-white' : 'text-ink'}`}>
    <span className={`grid size-10 place-items-center rounded-xl ${light ? 'bg-white/10' : 'bg-mist text-forest'}`}>
      <svg viewBox="0 0 32 32" className="size-6" fill="none" aria-hidden="true">
        <path d="M5 21.5c2.2-5.7 6-8.5 11-8.5s8.8 2.8 11 8.5M8 22v3m16-3v3M12 16c0-4.2 2.2-7.2 6.5-9 1.5 4.9.2 8-3.8 9.3M9 25h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 7c-2 1.2-3.2 2.9-3.5 5.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
    <span>food<span className={light ? 'text-[#a9d5ad]' : 'text-primary'}>bridge</span></span>
  </Link>
}
