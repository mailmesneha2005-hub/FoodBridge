import { useState, type FormEvent } from 'react'
import { ArrowLeft, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { DashboardLayout } from '../components/ui/DashboardLayout'
import { FormField } from '../components/ui/FormField'
import { PageHeader } from '../components/ui/FeedbackState'
import { useToast } from '../components/ui/Toast'

export function DonationFormPage() {
  const toast = useToast()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const next: Record<string, string> = {}
    if (!String(values.get('title') ?? '').trim()) next.title = 'Enter a short name for the food.'
    if (!String(values.get('category') ?? '')) next.category = 'Choose a food category.'
    if (!(Number(values.get('quantity')) > 0)) next.quantity = 'Enter a quantity greater than zero.'
    if (!String(values.get('pickupBy') ?? '')) next.pickupBy = 'Choose a pickup date and time.'
    if (!String(values.get('pickupAddress') ?? '').trim()) next.pickupAddress = 'Enter the pickup address.'
    setErrors(next)
    if (Object.keys(next).length === 0) toast({ title: 'Details passed browser checks', message: 'No donation was created. Donation submission is not connected to an API.', variant: 'info' })
  }

  return <DashboardLayout role="donor"><div className="mx-auto max-w-3xl space-y-5"><Link to="/donor/donations" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-forest"><ArrowLeft size={16}/> Back to donations</Link><PageHeader eyebrow="Donor workspace · preview" title="Prepare a food donation" description="Enter sample details to preview the accessible donation form. Nothing is sent or saved."/><div className="flex gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-950"><Info size={16} className="mt-0.5 shrink-0"/><p>This form is not connected to donation submission yet. Signing in is protected by Firebase and server profile authorization.</p></div><form noValidate onSubmit={submit} className="space-y-4 rounded-2xl border border-[#e8eee9] bg-white p-5 shadow-card sm:p-7"><FormField id="donation-title" name="title" label="Food item" placeholder="e.g. Seasonal produce boxes" required error={errors.title}/><div className="grid gap-4 sm:grid-cols-2"><FormField id="donation-category" name="category" label="Category" required error={errors.category}><select id="donation-category" name="category" defaultValue="" required aria-required="true" aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'donation-category-error' : undefined} className="field-control"><option value="" disabled>Select a category</option><option>Fresh produce</option><option>Bakery</option><option>Prepared meals</option><option>Dairy and chilled</option><option>Pantry goods</option><option>Other</option></select></FormField><div className="grid grid-cols-[1fr_8rem] gap-3"><FormField id="donation-quantity" name="quantity" label="Quantity" type="number" min="0.1" step="0.1" placeholder="0" required error={errors.quantity}/><FormField id="donation-unit" name="unit" label="Unit"><select id="donation-unit" name="unit" className="field-control"><option>kg</option><option>items</option><option>crates</option><option>servings</option></select></FormField></div></div><FormField id="donation-pickup" name="pickupBy" label="Available for pickup until" type="datetime-local" required error={errors.pickupBy}/><FormField id="donation-address" name="pickupAddress" label="Pickup address" autoComplete="street-address" placeholder="Street, area, city" required error={errors.pickupAddress}/><FormField id="donation-notes" name="notes" label="Handling notes" placeholder="Allergens, storage or collection instructions (optional)"/><div className="flex flex-wrap items-center gap-3 border-t border-[#edf1ee] pt-4"><Button type="submit">Check donation details</Button><span className="text-xs text-muted">Donation submission is not yet connected to the API.</span></div></form></div></DashboardLayout>
}
