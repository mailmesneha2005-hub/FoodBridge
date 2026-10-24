import { ArrowRight, ArrowUpRight, Check, HeartHandshake, Leaf, PackageCheck, Recycle, Truck, UsersRound } from 'lucide-react'
import { Button } from '../components/Button'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'

const heroPhoto = 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1500&q=85'
const producePhoto = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=720&q=80'

const steps = [
  { icon: PackageCheck, title: 'Donors share', text: 'Local shops, kitchens and growers let nearby organizations know when good food is ready to be collected.' },
  { icon: HeartHandshake, title: 'NGOs connect', text: 'Community organizations find donations that suit the people and schedules they serve.' },
  { icon: Truck, title: 'Volunteers deliver', text: 'Local volunteers help move food safely from the pickup point to a community table.' },
]

const exampleStats = [
  { value: '1,250+', label: 'meals kept in circulation' },
  { value: '85+', label: 'community partners' },
  { value: '320+', label: 'neighbors ready to help' },
]

const benefits = [
  'One place to coordinate local food sharing',
  'A clear handoff between donors and community groups',
  'More ways for neighbors to make a practical difference',
]

export function HomePage() {
  return <><SiteHeader/><main>
    <section className="bg-background">
      <div className="mx-auto grid max-w-7xl items-center gap-9 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[.95fr_1.05fr] lg:gap-14 lg:py-16">
        <div className="max-w-xl">
          <Badge variant="success">A community food-sharing network</Badge>
          <h1 className="mt-5 font-display text-[2.65rem] font-extrabold leading-[1.08] tracking-[-.045em] text-ink sm:text-5xl lg:text-[3.65rem]">Turning Surplus Food into <span className="text-primary">Shared Hope.</span></h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted sm:text-lg sm:leading-8">FoodBridge brings food donors, local NGOs and volunteers together to make sure good food reaches people, not landfills.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button to="/register?role=donor">Donate food <ArrowUpRight size={17}/></Button>
            <Button to="/register?role=ngo" variant="secondary">Join as an NGO <ArrowRight size={17}/></Button>
          </div>
          <div className="mt-7 flex items-center gap-3 text-sm text-muted"><span className="grid size-9 place-items-center rounded-full bg-white text-primary shadow-sm"><Leaf size={17}/></span><span><strong className="text-ink">Local food. Local care.</strong> Shared with purpose.</span></div>
        </div>
        <div className="relative mx-auto w-full max-w-[630px]">
          <div className="overflow-hidden rounded-[1.6rem] border border-white shadow-raised"><img src={heroPhoto} alt="Fresh vegetables and a nourishing meal prepared for sharing" className="aspect-[1.2/1] w-full object-cover sm:aspect-[1.38/1]"/></div>
          <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-xl border border-white/80 bg-white/95 p-3.5 shadow-card sm:bottom-5 sm:left-5 sm:right-auto sm:max-w-[310px] sm:p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mist text-forest"><PackageCheck size={20}/></span><div><p className="text-sm font-bold text-ink">A good meal, passed along</p><p className="mt-0.5 text-xs text-muted">From a generous kitchen to a nearby community</p></div>
          </div>
        </div>
      </div>
    </section>

    <section id="how-it-works" className="scroll-mt-20 border-y border-[#e8eee9] bg-white px-5 py-14 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="eyebrow">How it works</p><h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-[2.5rem]">Three good neighbors.<br className="hidden sm:block"/> One simple connection.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">Every successful food handoff starts with people who care and a clear way to work together.</p></div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">{steps.map((step, index) => { const Icon = step.icon; return <Card key={step.title} className="p-5 sm:p-6"><div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-xl bg-mist text-forest"><Icon size={21}/></span><span className="text-xs font-extrabold tracking-widest text-[#95b89a]">0{index + 1}</span></div><h3 className="mt-5 font-display text-lg font-extrabold text-ink">{step.title}</h3><p className="mt-2 text-sm leading-6 text-muted">{step.text}</p></Card> })}</div>
      </div>
    </section>

    <section id="impact" className="scroll-mt-20 bg-background px-5 py-14 sm:px-8 sm:py-16">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-center"><div><p className="eyebrow">The difference we can make</p><h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink">Small handoffs.<br/>Lasting impact.</h2><p className="mt-3 text-sm leading-6 text-muted">FoodBridge is being built to help communities reduce waste and improve access to nourishing food.</p></div>
        <div className="rounded-2xl border border-[#dcebdd] bg-[#f0f8f1] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-forest">A picture of what’s possible</p><Badge variant="warning">Illustrative · not live data</Badge></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{exampleStats.map(stat => <div key={stat.label} className="rounded-xl border border-white bg-white p-4"><p className="font-display text-2xl font-extrabold tracking-tight text-forest">{stat.value}</p><p className="mt-1 text-xs leading-5 text-muted">{stat.label}</p></div>)}</div></div>
      </div>
    </section>

    <section id="about" className="scroll-mt-20 bg-white px-5 py-14 sm:px-8 sm:py-16">
      <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="relative overflow-hidden rounded-2xl"><img src={producePhoto} alt="A colorful bowl filled with fresh vegetables" className="aspect-[1.25/1] w-full object-cover"/><span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-xs font-bold text-forest shadow-sm"><Recycle size={15}/> Better use for good food</span></div>
        <div><p className="eyebrow">Our mission</p><h2 className="mt-2 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">A more thoughtful food system starts close to home.</h2><p className="mt-4 text-sm leading-7 text-muted">We believe surplus food can become shared opportunity when local businesses, community organizations and volunteers can find one another. FoodBridge is being built around that simple idea.</p>
          <ul className="mt-5 space-y-3">{benefits.map(benefit => <li key={benefit} className="flex items-start gap-2.5 text-sm text-ink"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-mist text-forest"><Check size={13}/></span>{benefit}</li>)}</ul>
          <div className="mt-6 flex flex-wrap gap-2"><a href="https://sdgs.un.org/goals/goal2" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-[#e8eee9] bg-background px-3 py-2 text-xs font-bold text-forest hover:bg-mist"><UsersRound size={15}/> UN SDG 2 · Zero Hunger <ArrowUpRight size={13}/></a><a href="https://sdgs.un.org/goals/goal12" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-[#e8eee9] bg-background px-3 py-2 text-xs font-bold text-forest hover:bg-mist"><Recycle size={15}/> UN SDG 12 · Responsible Consumption <ArrowUpRight size={13}/></a></div>
        </div>
      </div>
    </section>

    <section id="get-involved" className="scroll-mt-20 px-5 py-12 sm:px-8 sm:py-14"><div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-2xl border border-[#dcebdd] bg-mist p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"><div className="max-w-2xl"><p className="eyebrow">Be part of the bridge</p><h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink">Have food to share or a community to support?</h2><p className="mt-2 text-sm leading-6 text-muted">Get in touch to learn how FoodBridge is bringing local partners together.</p></div><Button to="/register" className="shrink-0">Explore ways to help <ArrowRight size={16}/></Button></div></section>
  </main><SiteFooter/></>
}
