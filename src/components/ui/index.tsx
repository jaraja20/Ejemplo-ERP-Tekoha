import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { X, Search, ChevronLeft, ChevronRight, ArrowUpDown, Download, Inbox, AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn, downloadCSV } from '@/lib/utils'
import { useERP } from '@/store/erp'

// ---------- Badge ----------
const badgeColors: Record<string, string> = {
  gray: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  red: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  yellow: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  blue: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  purple: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  indigo: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200',
  orange: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
}
export function Badge({ color = 'gray', children, className }: { color?: keyof typeof badgeColors; children: ReactNode; className?: string }) {
  return <span className={cn('badge', badgeColors[color], className)}>{children}</span>
}

export const estadoColor: Record<string, keyof typeof badgeColors> = {
  pendiente: 'yellow', parcial: 'blue', pagada: 'green', vencida: 'red', anulada: 'gray',
  borrador: 'gray', enviado: 'blue', enviada: 'blue', aceptado: 'green', rechazado: 'red', vencido: 'red',
  confirmado: 'indigo', preparando: 'purple', entregado: 'green', cancelado: 'gray', recibida: 'green', cancelada: 'gray',
  activo: 'green', vacaciones: 'blue', licencia: 'yellow', baja: 'gray', aprobada: 'green', solicitada: 'yellow', rechazada: 'red',
  prospecto: 'gray', contacto: 'blue', propuesta: 'purple', negociacion: 'orange', ganada: 'green', perdida: 'red',
  presente: 'green', ausente: 'red', tarde: 'yellow', feriado: 'gray', en_progreso: 'blue', completada: 'green',
  alta: 'red', media: 'yellow', baja_prioridad: 'gray', ingreso: 'green', egreso: 'red', transferencia: 'blue', entrada: 'green', salida: 'red', ajuste: 'yellow',
}
export const estadoLabel: Record<string, string> = {
  en_progreso: 'En progreso', pendiente: 'Pendiente', parcial: 'Parcial', pagada: 'Pagada', vencida: 'Vencida', anulada: 'Anulada',
  borrador: 'Borrador', enviado: 'Enviado', enviada: 'Enviada', aceptado: 'Aceptado', rechazado: 'Rechazado', vencido: 'Vencido',
  confirmado: 'Confirmado', preparando: 'Preparando', entregado: 'Entregado', cancelado: 'Cancelado', recibida: 'Recibida', cancelada: 'Cancelada',
  activo: 'Activo', vacaciones: 'Vacaciones', licencia: 'Licencia', baja: 'Baja', aprobada: 'Aprobada', solicitada: 'Solicitada', rechazada: 'Rechazada',
  prospecto: 'Prospecto', contacto: 'Contacto', propuesta: 'Propuesta', negociacion: 'Negociación', ganada: 'Ganada', perdida: 'Perdida',
  presente: 'Presente', ausente: 'Ausente', tarde: 'Tarde', feriado: 'Feriado', completada: 'Completada', alta: 'Alta', media: 'Media', baja_prioridad: 'Baja',
  ingreso: 'Ingreso', egreso: 'Egreso', transferencia: 'Transferencia', entrada: 'Entrada', salida: 'Salida', ajuste: 'Ajuste',
}
export function EstadoBadge({ estado }: { estado: string }) {
  return <Badge color={estadoColor[estado] ?? 'gray'}>{estadoLabel[estado] ?? estado}</Badge>
}

// ---------- Page header ----------
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

// ---------- Stat card ----------
export function StatCard({ label, value, hint, icon, tone = 'default', onClick }: { label: string; value: string; hint?: ReactNode; icon?: ReactNode; tone?: 'default' | 'green' | 'red' | 'blue' | 'amber'; onClick?: () => void }) {
  const tones = { default: 'bg-slate-100 text-slate-600', green: 'bg-emerald-50 text-emerald-600', red: 'bg-rose-50 text-rose-600', blue: 'bg-brand-50 text-brand-600', amber: 'bg-amber-50 text-amber-600' }
  return (
    <div className={cn('card p-4', onClick && 'cursor-pointer transition hover:border-brand-300')} onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold tabular-nums text-slate-900">{value}</p>
          {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
        </div>
        {icon && <div className={cn('rounded-lg p-2', tones[tone])}>{icon}</div>}
      </div>
    </div>
  )
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-[2px] sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cn('card w-full animate-[fadeIn_.15s_ease-out]', sizes[size])}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button className="btn-ghost btn-sm" onClick={onClose} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, danger }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; danger?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose() }}>Confirmar</button></>}>
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  )
}

// ---------- Form helpers ----------
export function Field({ label, children, className, hint }: { label: string; children: ReactNode; className?: string; hint?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

export function Select({ value, onChange, options, placeholder, className, disabled }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; className?: string; disabled?: boolean }) {
  return (
    <select className={cn('input', className)} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)} className={cn('-mb-px border-b-2 px-3 py-2 text-sm font-medium transition', value === t.value ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
          {t.label}
          {t.count !== undefined && <span className={cn('ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]', value === t.value ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500')}>{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400"><Inbox size={22} /></div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ---------- DataTable ----------
export interface Column<Row> {
  key: string
  header: string
  render?: (row: Row) => ReactNode
  value?: (row: Row) => string | number
  sortable?: boolean
  className?: string
  align?: 'left' | 'right' | 'center'
}
export function DataTable<Row extends { id: string }>({ rows, columns, searchKeys, pageSize = 15, onRowClick, exportName, toolbar, emptyText = 'Sin registros', rowClassName }: {
  rows: Row[]; columns: Column<Row>[]; searchKeys?: (row: Row) => string; pageSize?: number; onRowClick?: (row: Row) => void; exportName?: string; toolbar?: ReactNode; emptyText?: string; rowClassName?: (row: Row) => string
}) {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)

  const filtered = useMemo(() => {
    let r = rows
    if (q && searchKeys) {
      const needle = q.toLowerCase()
      r = r.filter((row) => searchKeys(row).toLowerCase().includes(needle))
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key)
      if (col?.value) {
        const v = col.value
        r = [...r].sort((a, b) => {
          const va = v(a), vb = v(b)
          if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sort.dir
          return String(va).localeCompare(String(vb)) * sort.dir
        })
      }
    }
    return r
  }, [rows, q, sort, columns, searchKeys])

  useEffect(() => setPage(0), [q, rows.length])
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = filtered.slice(page * pageSize, (page + 1) * pageSize)

  const exportar = () => {
    downloadCSV(`${exportName ?? 'export'}.csv`, filtered.map((row) => Object.fromEntries(columns.map((c) => [c.header, c.value ? c.value(row) : (row as Record<string, unknown>)[c.key] ?? '']))))
  }

  return (
    <div>
      {(searchKeys || toolbar || exportName) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {searchKeys && (
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          )}
          {toolbar}
          {exportName && <button className="btn-secondary btn-sm ml-auto" onClick={exportar}><Download size={14} /> Exportar CSV</button>}
        </div>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={cn(c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.className)}>
                  {c.sortable && c.value ? (
                    <button className="inline-flex items-center gap-1 hover:text-slate-800" onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))}>
                      {c.header} <ArrowUpDown size={11} className={sort?.key === c.key ? 'text-brand-600' : 'text-slate-300'} />
                    </button>
                  ) : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {current.length === 0 && (
              <tr><td colSpan={columns.length}><EmptyState title={emptyText} /></td></tr>
            )}
            {current.map((row) => (
              <tr key={row.id} className={cn(onRowClick && 'cursor-pointer', rowClassName?.(row))} onClick={() => onRowClick?.(row)}>
                {columns.map((c) => (
                  <td key={c.key} className={cn(c.align === 'right' && 'num', c.align === 'center' && 'text-center', c.className)}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > pageSize && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Mostrando {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} de {filtered.length}</span>
          <div className="flex items-center gap-1">
            <button className="btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /></button>
            <span className="px-2">Página {page + 1} / {pages}</span>
            <button className="btn-ghost btn-sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}><ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Toasts ----------
export function Toaster() {
  const toasts = useERP((s) => s.toasts)
  const dismiss = useERP((s) => s.dismissToast)
  const icons = { success: <CheckCircle2 size={16} className="text-emerald-500" />, error: <XCircle size={16} className="text-rose-500" />, info: <Info size={16} className="text-sky-500" /> }
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-lg animate-[slideUp_.2s_ease-out]">
          {icons[t.tipo]}
          <span>{t.msg}</span>
          <button className="ml-2 text-slate-400 hover:text-slate-600" onClick={() => dismiss(t.id)}><X size={14} /></button>
        </div>
      ))}
    </div>
  )
}

export function Alert({ tipo = 'info', children }: { tipo?: 'info' | 'warning' | 'error' | 'success'; children: ReactNode }) {
  const styles = { info: 'bg-sky-50 text-sky-800 border-sky-200', warning: 'bg-amber-50 text-amber-800 border-amber-200', error: 'bg-rose-50 text-rose-800 border-rose-200', success: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
  const icons = { info: <Info size={16} />, warning: <AlertTriangle size={16} />, error: <XCircle size={16} />, success: <CheckCircle2 size={16} /> }
  return <div className={cn('flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm', styles[tipo])}>{icons[tipo]}<div>{children}</div></div>
}

export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-slate-500">{k}</span>
      <span className="text-right font-medium text-slate-800">{v}</span>
    </div>
  )
}

export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const ini = name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
  const hues = ['bg-brand-100 text-brand-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-violet-100 text-violet-700', 'bg-sky-100 text-sky-700']
  const h = hues[name.length % hues.length]
  const sz = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-14 w-14 text-lg' }
  return <div className={cn('flex shrink-0 items-center justify-center rounded-full font-bold', h, sz[size], className)}>{ini}</div>
}
