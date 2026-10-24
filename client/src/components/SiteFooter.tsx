import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Brand } from './Brand'

export function SiteFooter() {
  return <footer className="bg-[#173c27] text-white">
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_.8fr_.8fr] md:gap-16 md:py-14">
      <div><Brand light/><p className="mt-4 max-w-sm text-sm leading-6 text-white/70">A local food-sharing network connecting generosity with the people who need it most.</p><a href="mailto:hello@foodbridge.org" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:text-[#b9e0bd]">hello@foodbridge.org <ArrowUpRight size={15}/></a></div>
      <div><h2 className="text-sm font-bold">Explore</h2><div className="mt-4 flex flex-col gap-3 text-sm text-white/70"><Link to="/how-it-works" className="hover:text-white">How it works</Link><Link to="/about" className="hover:text-white">About FoodBridge</Link><Link to="/register" className="hover:text-white">Get involved</Link></div></div>
      <div><h2 className="text-sm font-bold">Our purpose</h2><div className="mt-4 flex flex-col gap-3 text-sm text-white/70"><a href="https://sdgs.un.org/goals/goal2" target="_blank" rel="noreferrer" className="hover:text-white">SDG 2 · Zero Hunger</a><a href="https://sdgs.un.org/goals/goal12" target="_blank" rel="noreferrer" className="hover:text-white">SDG 12 · Responsible Consumption</a></div></div>
    </div>
    <div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-4 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>© {new Date().getFullYear()} FoodBridge</span><span>Good food should reach good people.</span></div></div>
  </footer>
}
