import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck, Circle } from 'lucide-react'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { EmptyState, ErrorState, PageHeader } from '../components/ui/FeedbackState'
import { Card } from '../components/ui/Card'
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton'
import { Button } from '../components/Button'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'
import { useRealtime } from '../contexts/RealtimeContext'
import { apiList, apiRequest, type ApiPage } from '../services/apiClient'

type NotificationRecord = { _id: string; type: string; message: string; entityType?: string; entityId?: string; read: boolean; readAt?: string; createdAt: string }
const dateLabel = (value:string) => new Date(value).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})

export function NotificationsPage() {
  const [page,setPage]=useState<ApiPage<NotificationRecord>|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false);const [pageNumber,setPageNumber]=useState(1)
  const toast=useToast(); const {profile}=useAuth(); const {socket,revision,connected}=useRealtime()
  const load=useCallback(async()=>{setLoading(true);setError('');try{setPage(await apiList<NotificationRecord>(`/notifications?page=${pageNumber}&limit=50&sort=-createdAt`))}catch(reason){setError(reason instanceof Error?reason.message:'Notifications could not be loaded.')}finally{setLoading(false)}},[pageNumber])
  useEffect(()=>{void load()},[load,revision])
  useEffect(()=>{if(!socket)return;const refresh=()=>void load();socket.on('notifications:refresh',refresh);return()=>{socket.off('notifications:refresh',refresh)}},[socket,load])
  const markRead=async(id:string)=>{setBusy(true);try{await apiRequest(`/notifications/${encodeURIComponent(id)}/read`,{method:'PATCH'});await load()}catch(reason){setError(reason instanceof Error?reason.message:'Notification status could not be updated.')}finally{setBusy(false)}}
  const markAll=async()=>{setBusy(true);try{await apiRequest('/notifications/read-all',{method:'PATCH'});await load();toast({title:'Notifications marked as read',variant:'success'})}catch(reason){setError(reason instanceof Error?reason.message:'Notifications could not be updated.')}finally{setBusy(false)}}
  const records=page?.items??[]
  return <><SiteHeader/><main className="mx-auto min-h-[60vh] max-w-4xl space-y-6 px-5 py-10 sm:px-8 sm:py-14"><PageHeader eyebrow="Shared workspace" title="Notifications" description="Updates about donation requests, pickups and account activity." action={records.some(item=>!item.read)?<Button variant="secondary" disabled={busy} onClick={()=>void markAll()}><CheckCheck size={16}/>Mark all read</Button>:undefined}/>
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${connected?'bg-mist text-forest':'bg-slate-100 text-muted'}`}><span className={`size-2 rounded-full ${connected?'bg-[#2e8b45]':'bg-slate-400'}`}/>{connected?'Live updates connected':'Live updates reconnecting; saved notifications remain available'}</div>
    {error&&<ErrorState description={error} onRetry={()=>void load()}/>}
    {loading?<div className="space-y-3">{[1,2,3].map(x=><LoadingSkeleton key={x} className="h-24 w-full"/>)}</div>:!error&&records.length===0?<EmptyState title="You’re all caught up" description="When a request, pickup or account update needs your attention, it will appear here." actionLabel="Back to FoodBridge" actionTo="/"/>:!error&&<div className="space-y-3">{records.map(item=><Card key={item._id} className={`flex items-start gap-3 p-4 sm:p-5 ${item.read?'':'border-leaf-200 bg-[#fbfefb]'}`}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mist text-forest"><Bell size={18}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm font-bold text-ink">{item.message}</p>{!item.read&&<span className="inline-flex items-center gap-1 text-[11px] font-bold text-forest"><Circle size={8} fill="currentColor"/>New</span>}</div><p className="mt-1 text-xs capitalize text-muted">{item.type.replaceAll('_',' ')} · {dateLabel(item.createdAt)}</p></div>{!item.read&&<Button variant="quiet" disabled={busy} onClick={()=>void markRead(item._id)} aria-label="Mark notification as read">Mark read</Button>}</Card>)}</div>}
    {page&&page.pages>1&&<div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-muted">Showing {records.length} of {page.total} · Page {page.page} of {page.pages}</span><div className="flex gap-2"><Button variant="secondary" disabled={page.page<=1||loading} onClick={()=>setPageNumber(value=>Math.max(1,value-1))}>Previous</Button><Button variant="secondary" disabled={page.page>=page.pages||loading} onClick={()=>setPageNumber(value=>value+1)}>Next</Button></div></div>}
    {!profile&&<p className="text-xs text-muted">Sign in to load notifications for your FoodBridge account.</p>}
  </main><SiteFooter/></>
}
