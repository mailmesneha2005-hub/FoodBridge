import type { ReactNode } from 'react'
export function FeatureCard({ number, icon, title, children }: { number: string; icon: ReactNode; title: string; children: ReactNode }) {
  return <article className="group rounded-3xl border border-leaf-900/[.06] bg-white p-7 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-8"><div className="flex items-center justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-leaf-50 text-leaf-700 transition group-hover:bg-leaf-600 group-hover:text-white">{icon}</span><span className="font-display text-sm font-bold text-leaf-300">{number}</span></div><h3 className="mt-7 font-display text-xl font-extrabold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{children}</p></article>
}
