import { useMemo, useState } from 'react'
import { Plus, CalendarClock, TrendingUp } from 'lucide-react'
import { useERP } from '@/store/erp'
import type { Oportunidad, EtapaOportunidad } from '@/types'
import { PageHeader, StatCard, Modal, Field, Select, Badge, EmptyState } from '@/components/ui'
import { fmtMoneyCompact, fmtMoney, fmtDate, sumBy, uid, today, cn } from '@/lib/utils'

const etapas: { id: EtapaOportunidad; label: string; color: string }[] = [
  { id: 'prospecto', label: 'Prospecto', color: 'bg-slate-400' },
  { id: 'contacto', label: 'Contacto inicial', color: 'bg-sky-500' },
  { id: 'propuesta', label: 'Propuesta enviada', color: 'bg-violet-500' },
  { id: 'negociacion', label: 'Negociación', color: 'bg-amber-500' },
  { id: 'ganada', label: 'Ganada', color: 'bg-emerald-500' },
  { id: 'perdida', label: 'Perdida', color: 'bg-rose-500' },
]

export default function CRM() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const [nuevo, setNuevo] = useState(false)
  const [detalle, setDetalle] = useState<Oportunidad | null>(null)
  const [form, setForm] = useState({ titulo: '', clienteId: '', valor: 10000000, probabilidad: 30, etapa: 'prospecto' as EtapaOportunidad, fechaCierre: today(), notas: '' })

  const stats = useMemo(() => {
    const abiertas = s.oportunidades.filter((o) => !['ganada', 'perdida'].includes(o.etapa))
    const ganadas = s.oportunidades.filter((o) => o.etapa === 'ganada')
    const perdidas = s.oportunidades.filter((o) => o.etapa === 'perdida')
    return {
      pipeline: sumBy(abiertas, (o) => o.valor),
      ponderado: sumBy(abiertas, (o) => (o.valor * o.probabilidad) / 100),
      ganadas: sumBy(ganadas, (o) => o.valor),
      tasa: ganadas.length + perdidas.length ? Math.round((ganadas.length / (ganadas.length + perdidas.length)) * 100) : 0,
      abiertas: abiertas.length,
    }
  }, [s.oportunidades])

  const mover = (o: Oportunidad, etapa: EtapaOportunidad) => {
    s.update('oportunidades', o.id, { etapa, probabilidad: etapa === 'ganada' ? 100 : etapa === 'perdida' ? 0 : o.probabilidad })
    s.registrarLog('CRM', 'Movió oportunidad', `${o.titulo} → ${etapa}`)
    s.toast(`"${o.titulo}" movida a ${etapa}`)
    setDetalle(null)
  }
  const guardar = () => {
    if (!form.titulo || !form.clienteId) return
    s.add('oportunidades', { ...form, id: uid('op'), vendedorId: s.usuarioActual!.id, creadoEn: today() } as Oportunidad)
    s.toast('Oportunidad creada')
    setNuevo(false)
    setForm({ titulo: '', clienteId: '', valor: 10000000, probabilidad: 30, etapa: 'prospecto', fechaCierre: today(), notas: '' })
  }
  const tareasPend = s.actividadesCRM.filter((a) => !a.completada).sort((a, b) => a.fecha.localeCompare(b.fecha))

  return (
    <div>
      <PageHeader title="CRM · Pipeline de oportunidades" subtitle="Embudo comercial con valor ponderado por probabilidad" actions={<button className="btn-primary" onClick={() => setNuevo(true)}><Plus size={16} /> Nueva oportunidad</button>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pipeline abierto" value={fmtMoneyCompact(stats.pipeline, sim)} tone="blue" icon={<TrendingUp size={20} />} hint={`${stats.abiertas} oportunidades`} />
        <StatCard label="Valor ponderado" value={fmtMoneyCompact(stats.ponderado, sim)} tone="amber" hint="Ajustado por probabilidad de cierre" />
        <StatCard label="Ganadas (histórico)" value={fmtMoneyCompact(stats.ganadas, sim)} tone="green" />
        <StatCard label="Tasa de cierre" value={`${stats.tasa}%`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="overflow-x-auto">
          <div className="flex min-w-[900px] gap-3">
            {etapas.map((e) => {
              const items = s.oportunidades.filter((o) => o.etapa === e.id)
              return (
                <div key={e.id} className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', e.color)} />
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{e.label}</span>
                    <span className="ml-auto rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">{items.length}</span>
                  </div>
                  <div className="mb-2 text-[11px] text-slate-400">{fmtMoney(sumBy(items, (o) => o.valor), sim)}</div>
                  <div className="space-y-2">
                    {items.map((o) => {
                      const cli = s.clientes.find((c) => c.id === o.clienteId)
                      return (
                        <button key={o.id} className="card w-full p-3 text-left transition hover:border-brand-400" onClick={() => setDetalle(o)}>
                          <div className="text-xs font-semibold text-slate-800">{o.titulo}</div>
                          <div className="mt-0.5 truncate text-[11px] text-slate-500">{cli?.razonSocial}</div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">{fmtMoney(o.valor, sim)}</span>
                            <Badge color={o.probabilidad >= 70 ? 'green' : o.probabilidad >= 40 ? 'yellow' : 'gray'}>{o.probabilidad}%</Badge>
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><CalendarClock size={10} /> {fmtDate(o.fechaCierre)}</div>
                        </button>
                      )
                    })}
                    {items.length === 0 && <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-[11px] text-slate-300">Vacío</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Próximas actividades</h3>
          <div className="space-y-3">
            {tareasPend.map((a) => (
              <div key={a.id} className="border-b border-slate-100 pb-2 last:border-0">
                <div className="flex items-center gap-2"><Badge color="blue">{a.tipo}</Badge><span className="text-[11px] text-slate-400">{fmtDate(a.fecha)}</span></div>
                <p className="mt-1 text-xs text-slate-600">{a.descripcion}</p>
                <p className="text-[11px] text-slate-400">{s.clientes.find((c) => c.id === a.clienteId)?.razonSocial}</p>
                <button className="mt-1 text-[11px] text-brand-600 hover:underline" onClick={() => { s.update('actividadesCRM', a.id, { completada: true }); s.toast('Actividad completada') }}>Marcar completada</button>
              </div>
            ))}
            {tareasPend.length === 0 && <EmptyState title="Sin actividades pendientes" />}
          </div>
        </div>
      </div>

      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Nueva oportunidad" footer={<><button className="btn-secondary" onClick={() => setNuevo(false)}>Cancelar</button><button className="btn-primary" onClick={guardar}>Crear</button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Título" className="sm:col-span-2"><input className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Provisión mensual bebidas" /></Field>
          <Field label="Cliente" className="sm:col-span-2"><Select value={form.clienteId} onChange={(v) => setForm({ ...form, clienteId: v })} placeholder="Seleccionar..." options={s.clientes.map((c) => ({ value: c.id, label: c.razonSocial }))} /></Field>
          <Field label="Valor estimado"><input type="number" className="input" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} /></Field>
          <Field label="Probabilidad (%)"><input type="number" min={0} max={100} className="input" value={form.probabilidad} onChange={(e) => setForm({ ...form, probabilidad: Number(e.target.value) })} /></Field>
          <Field label="Etapa"><Select value={form.etapa} onChange={(v) => setForm({ ...form, etapa: v as EtapaOportunidad })} options={etapas.map((e) => ({ value: e.id, label: e.label }))} /></Field>
          <Field label="Fecha de cierre estimada"><input type="date" className="input" value={form.fechaCierre} onChange={(e) => setForm({ ...form, fechaCierre: e.target.value })} /></Field>
          <Field label="Notas" className="sm:col-span-2"><textarea className="input" rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={detalle?.titulo ?? ''} size="md">
        {detalle && (
          <div>
            <div className="mb-4 grid gap-2 sm:grid-cols-2 text-sm">
              <div><span className="text-slate-500">Cliente:</span> <span className="font-medium">{s.clientes.find((c) => c.id === detalle.clienteId)?.razonSocial}</span></div>
              <div><span className="text-slate-500">Vendedor:</span> <span className="font-medium">{s.usuarios.find((u) => u.id === detalle.vendedorId)?.nombre}</span></div>
              <div><span className="text-slate-500">Valor:</span> <span className="font-medium">{fmtMoney(detalle.valor, sim)}</span></div>
              <div><span className="text-slate-500">Probabilidad:</span> <span className="font-medium">{detalle.probabilidad}%</span></div>
              <div><span className="text-slate-500">Cierre estimado:</span> <span className="font-medium">{fmtDate(detalle.fechaCierre)}</span></div>
              <div><span className="text-slate-500">Creada:</span> <span className="font-medium">{fmtDate(detalle.creadoEn)}</span></div>
            </div>
            {detalle.notas && <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{detalle.notas}</p>}
            <p className="label">Mover a etapa</p>
            <div className="flex flex-wrap gap-2">
              {etapas.filter((e) => e.id !== detalle.etapa).map((e) => <button key={e.id} className="btn-secondary btn-sm" onClick={() => mover(detalle, e.id)}>{e.label}</button>)}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
