import { Link, useParams } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { PageHeader, ErrorState } from '@/components/states'
import { Skeleton } from '@/components/ui/skeleton'
import { LeadForm } from './LeadForm'
import { useLead } from './hooks'

export function LeadNewPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Nuevo lead" description="Registre una consulta comercial recibida por cualquier canal." />
      <LeadForm />
    </div>
  )
}

export function LeadEditPage() {
  const { code = '' } = useParams()
  const lead = useLead(code)
  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Ruta" className="mb-3 flex items-center gap-1 text-sm text-slate-500">
        <Link to="/leads" className="hover:text-slate-900">
          Leads
        </Link>
        <ChevronRight className="size-3.5" />
        <Link to={`/leads/${code}`} className="font-mono hover:text-slate-900">
          {code}
        </Link>
      </nav>
      <PageHeader title="Editar lead" />
      {lead.isPending ? (
        <Skeleton className="h-[32rem]" />
      ) : lead.isError ? (
        <ErrorState message={lead.error.message} onRetry={() => lead.refetch()} />
      ) : (
        <LeadForm lead={lead.data} />
      )}
    </div>
  )
}
