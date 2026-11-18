import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, MapPin, CreditCard, Plus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useERP, selectores } from '@/store/erp'
import { PageHeader, Badge, EstadoBadge, StatCard, Tabs, Avatar, Modal, Field, Select, EmptyState } from '@/components/ui'
import { fmtMoneyCompact, isoLocal, fmtMoney, fmtDate, fmtDateTime, totales, mesLabel, mesKey, sumBy, uid, today } from '@/lib/utils'
import type { ActividadCRM } from '@/types'

export default function ClienteDetalle() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const s = useERP()
  const sim = s.empresa.simbolo
  const cliente = s.clientes.find((c) => c.id === id)
  const [tab, setTab] = useState<'resumen' | 'facturas' | 'pedidos' | 'cobros' | 'actividad'>('resumen')
  const [nuevaAct, setNuevaAct] = useState(false)
  const [act, setAct] = useState({ tipo: 'llamada' as ActividadCRM['tipo'], descripcion: '' })

  const datos = useMemo(() => {
    if (!cliente) return null
    const facturas = s.facturas.filter((f) => f.clienteId === id && f.estado !== 'anulada')
    const pedidos = s.pedidos.filter((p) => p.clienteId === id)
    const cobros = s.cobros.filter((c) => c.clienteId === id)
    const actividades = s.actividadesCRM.filter((a) => a.clienteId === id)
    const oportunidades = s.oportunidades.filter((o) => o.clienteId === id)
    const total = sumBy(facturas, (f) => totales(f.lineas).total)
    const saldo = sumBy(facturas.filter((f) => f.estado !== 'pagada'), (f) => selectores.saldoFactura(s, f))
    const map: Record<string, number> = {}
    for (let i = 11; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); map[isoLocal(d).slice(0, 7)] = 0 }
    facturas.forEach((f) => { const k = mesKey(f.fecha); if (k in map) map[k] += totales(f.lineas).total })
    const serie = Object.entries(map).map(([k, v]) => ({ mes: mesLabel(k + '-01'), total: Math.round(v) }))
    const productos: Record<string, number> = {}
    facturas.forEach((f) => f.lineas.forEach((l) => (productos[l.productoId] = (productos[l.productoId] ?? 0) + l.cantidad)))
    const top = Object.entries(productos).sort((a, b) => b[1] - a[1]).slice(0, 5)
    return { facturas, pedidos, cobros, actividades, oportunidades, total, saldo, serie, top, vencidas: facturas.filter((f) => f.estado === 'vencida') }
  }, [cliente, id, s])

  if (!cliente || !datos) return <EmptyState title="Cliente no encontrado" action={<Link className="btn-primary" to="/clientes">Volver</Link>} />

  const guardarAct = () => {
    if (!act.descripcion) return
    s.add('actividadesCRM', { id: uid('ac'), clienteId: id, tipo: act.tipo, descripcion: act.descripcion, fecha: new Date().toISOString(), usuarioId: s.usuarioActual!.id, completada: true })
    s.toast('Actividad registrada')
    setNuevaAct(false); setAct({ tipo: 'llamada', descripcion: '' })
  }

  return (
    <div>
      <button className="btn-ghost btn-sm mb-3" onClick={() => navigate('/clientes')}><ArrowLeft size={15} /> Volver a clientes</button>
      <div className="card mb-5 p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={cliente.razonSocial} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{cliente.razonSocial}</h1>
              <Badge color={cliente.segmento === 'corporativo' ? 'purple' : cliente.segmento === 'mayorista' ? 'blue' : 'gray'}>{cliente.segmento}</Badge>
              <Badge color={cliente.activo ? 'green' : 'gray'}>{cliente.activo ? 'Activo' : 'Inactivo'}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{cliente.codigo} · RUC {cliente.ruc} · Cliente desde {fmtDate(cliente.creadoEn)}</p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
              <span className="flex items-center gap-1.5"><Mail size={14} className="text-slate-400" /> {cliente.email}</span>
              <span className="flex items-center gap-1.5"><Phone size={14} className="text-slate-400" /> {cliente.telefono}</span>
              <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> {cliente.direccion}, {cliente.ciudad}</span>
              <span className="flex items-center gap-1.5"><CreditCard size={14} className="text-slate-400" /> Límite {fmtMoney(cliente.limiteCredito, sim)} · {cliente.diasCredito} días</span>
            </div>
            {cliente.notas && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{cliente.notas}</p>}
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Compras totales" value={fmtMoneyCompact(datos.total, sim)} tone="blue" hint={`${datos.facturas.length} facturas`} />
        <StatCard label="Saldo pendiente" value={fmtMoneyCompact(datos.saldo, sim)} tone={datos.saldo > cliente.limiteCredito ? 'red' : 'amber'} hint={datos.saldo > cliente.limiteCredito ? 'Supera el límite de crédito' : `${((datos.saldo / (cliente.limiteCredito || 1)) * 100).toFixed(0)}% del límite`} />
        <StatCard label="Facturas vencidas" value={String(datos.vencidas.length)} tone="red" />
        <StatCard label="Oportunidades abiertas" value={String(datos.oportunidades.filter((o) => !['ganada', 'perdida'].includes(o.etapa)).length)} />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'resumen', label: 'Resumen' }, { value: 'facturas', label: 'Facturas', count: datos.facturas.length }, { value: 'pedidos', label: 'Pedidos', count: datos.pedidos.length }, { value: 'cobros', label: 'Cobros', count: datos.cobros.length }, { value: 'actividad', label: 'Actividad CRM', count: datos.actividades.length }]} />

      {tab === 'resumen' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card p-4 lg:col-span-2">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Evolución de compras · 12 meses</h3>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datos.serie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1e6)}M`} width={54} />
                  <Tooltip formatter={(v: number) => fmtMoney(v, sim)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="total" name="Compras" fill="#3f5ff5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Productos más comprados</h3>
            {datos.top.map(([pid, q]) => (
              <div key={pid} className="flex items-center justify-between border-b border-slate-50 py-1.5 text-sm last:border-0">
                <span className="truncate text-slate-700">{s.productos.find((p) => p.id === pid)?.nombre}</span>
                <span className="font-semibold tabular-nums">{q}</span>
              </div>
            ))}
            {datos.oportunidades.length > 0 && (
              <>
                <h3 className="mb-2 mt-4 text-sm font-semibold text-slate-800">Oportunidades</h3>
                {datos.oportunidades.map((o) => (
                  <div key={o.id} className="mb-1.5 rounded-lg border border-slate-100 p-2 text-xs">
                    <div className="flex items-center justify-between gap-2"><span className="truncate font-medium text-slate-700">{o.titulo}</span><EstadoBadge estado={o.etapa} /></div>
                    <div className="mt-0.5 text-slate-500">{fmtMoney(o.valor, sim)} · cierre {fmtDate(o.fechaCierre)}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'facturas' && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>N°</th><th>Fecha</th><th>Vence</th><th>Condición</th><th className="text-right">Total</th><th className="text-right">Saldo</th><th>Estado</th></tr></thead>
            <tbody>{datos.facturas.map((f) => <tr key={f.id}><td className="font-mono text-xs">{f.numero}</td><td>{fmtDate(f.fecha)}</td><td>{fmtDate(f.vencimiento)}</td><td className="capitalize">{f.condicion}</td><td className="num">{fmtMoney(totales(f.lineas).total, sim)}</td><td className="num">{fmtMoney(selectores.saldoFactura(s, f), sim)}</td><td><EstadoBadge estado={f.estado} /></td></tr>)}</tbody>
          </table>
        </div>
      )}
      {tab === 'pedidos' && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>N°</th><th>Fecha</th><th className="text-center">Ítems</th><th className="text-right">Total</th><th>Estado</th><th>Factura</th></tr></thead>
            <tbody>{datos.pedidos.map((p) => <tr key={p.id}><td className="font-mono text-xs">{p.numero}</td><td>{fmtDate(p.fecha)}</td><td className="text-center">{p.lineas.length}</td><td className="num">{fmtMoney(totales(p.lineas).total, sim)}</td><td><EstadoBadge estado={p.estado} /></td><td className="font-mono text-xs">{s.facturas.find((f) => f.id === p.facturaId)?.numero ?? '—'}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {tab === 'cobros' && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Recibo</th><th>Fecha</th><th>Factura</th><th>Medio</th><th>Referencia</th><th className="text-right">Monto</th></tr></thead>
            <tbody>{datos.cobros.map((c) => <tr key={c.id}><td className="font-mono text-xs">{c.numero}</td><td>{fmtDate(c.fecha)}</td><td className="font-mono text-xs">{s.facturas.find((f) => f.id === c.facturaId)?.numero}</td><td className="capitalize">{c.medio}</td><td className="text-xs text-slate-500">{c.referencia ?? '—'}</td><td className="num font-medium text-emerald-700">{fmtMoney(c.monto, sim)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {tab === 'actividad' && (
        <div className="card p-4">
          <button className="btn-secondary btn-sm mb-4" onClick={() => setNuevaAct(true)}><Plus size={14} /> Registrar actividad</button>
          <div className="space-y-3">
            {datos.actividades.sort((a, b) => b.fecha.localeCompare(a.fecha)).map((a) => (
              <div key={a.id} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0">
                <Badge color={a.tipo === 'llamada' ? 'blue' : a.tipo === 'email' ? 'purple' : a.tipo === 'reunion' ? 'green' : 'gray'}>{a.tipo}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700">{a.descripcion}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{fmtDateTime(a.fecha)} · {s.usuarios.find((u) => u.id === a.usuarioId)?.nombre} {!a.completada && '· Pendiente'}</p>
                </div>
              </div>
            ))}
            {datos.actividades.length === 0 && <EmptyState title="Sin actividades registradas" />}
          </div>
        </div>
      )}

      <Modal open={nuevaAct} onClose={() => setNuevaAct(false)} title="Registrar actividad" size="sm" footer={<><button className="btn-secondary" onClick={() => setNuevaAct(false)}>Cancelar</button><button className="btn-primary" onClick={guardarAct}>Guardar</button></>}>
        <div className="grid gap-3">
          <Field label="Tipo"><Select value={act.tipo} onChange={(v) => setAct({ ...act, tipo: v as ActividadCRM['tipo'] })} options={['llamada', 'email', 'reunion', 'nota', 'tarea'].map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }))} /></Field>
          <Field label="Descripción"><textarea className="input" rows={3} value={act.descripcion} onChange={(e) => setAct({ ...act, descripcion: e.target.value })} /></Field>
        </div>
      </Modal>
      <span className="hidden">{today()}</span>
    </div>
  )
}
