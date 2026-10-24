export function LoadingSkeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-lg bg-[#e9efea] ${className}`}/>
}

export function CardSkeleton() {
  return <div aria-label="Loading content" aria-busy="true" className="surface-card space-y-4 p-5"><LoadingSkeleton className="h-5 w-1/3"/><LoadingSkeleton className="h-4 w-full"/><LoadingSkeleton className="h-4 w-2/3"/></div>
}
