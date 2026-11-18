import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, FileText, Truck } from 'lucide-react'
import { useERP } from '@/store/erp'
import type { Pedido, LineaDocumento, EstadoPedido } from '@/types'
import { PageHeader, DataTable, EstadoBadge, Modal, Field, Select, Tabs, KV, type Column } from '@/components/ui'
import { LineasEditor } from '@/components/LineasEditor'
import { DocumentoPrint } from '@/components/DocumentoPrint'
import { fmtMoney, fmtDate, totales, today } from '@/lib/utils'

const flujo: EstadoPedido[] = ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado']

export default function Pedidos() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const [params] = useSearchParams()
  const [tab, setTab] = useState<'todos' | 'abiertos' | 'entregados' | 'cancelados'>(params.get('tab') === 'abiertos' ? 'abiertos' : 'todos')
  const [nuevo, setNuevo] = useState(false)
  const [detalle, setDetalle] = useState<Pedido | null>(null)
  const [form, setForm] = useState({ clienteId: '', sucursalId: 's01', notas: '' })
  const [lineas, setLineas] = useState<LineaDocumento[]>([])

  const rows = s.pedidos.filter((p) => tab === 'todos' || (tab === 'abiertos' && !['entregado', 'cancelado'].includes(p.estado)) || (tab === 'entregados' && p.estado === 'entregado') || (tab === 'cancelados' && p.estado === 'cancelado'))
  const cliente = (id: string) => s.clientes.find((c) => c.id === id)
  const columns: Column<Pedido>[] = [
    { key: 'numero', header: 'N°', render: (r) => <span className="font-mono text-xs font-medium">{r.numero}</span>, value: (r) => r.numero, sortable: true },
    { key: 'fecha', header: 'Fecha', render: (r) => fmtDate(r.fecha), value: (r) => r.fecha, sortable: true },
    { key: 'cliente', header: 'Cliente', render: (r) => cliente(r.clienteId)?.razonSocial, value: (r) => cliente(r.clienteId)?.razonSocial ?? '' },
    { key: 'vendedor', header: 'Vendedor', render: (r) => s.usuarios.find((u) => u.id === r.vendedorId)?.nombre, value: (r) => s.usuarios.find((u) => u.id === r.vendedorId)?.nombre ?? '' },
    { key: 'sucursal', header: 'Sucursal', render: (r) => s.sucursales.find((x) => x.id === r.sucursalId)?.nombre },
    { key: 'items', header: 'Ítems', render: (r) => r.lineas.length, align: 'center' },
    { key: 'total', header: 'Total', render: (r) => fmtMoney(totales(r.lineas).total, sim), value: (r) => totales(r.lineas).total, sortable: true, align: 'right' },
    { key: 'estado', header: 'Estado', render: (r) => <EstadoBadge estado={r.estado} /> },
    { key: 'factura', header: 'Factura', render: (r) => r.facturaId ? <span className="font-mono text-xs text-emerald-700">{s.facturas.find((f) => f.id === r.facturaId)?.numero}</span> : <span className="text-xs text-slate-400">—</span> },
  ]

  const guardar = () => {
    if (!form.clienteId || !lineas.length) return
    s.crearPedido({ fecha: today(), clienteId: form.clienteId, vendedorId: s.usuarioActual!.id, sucursalId: form.sucursalId, depositoId: form.sucursalId === 's02' ? 'd02' : form.sucursalId === 's03' ? 'd03' : 'd01', lineas, estado: 'pendiente', notas: form.notas || undefined })
    setNuevo(false); setLineas([]); setForm({ clienteId: '', sucursalId: 's01', notas: '' })
  }
  const detalleActual = detalle ? s.pedidos.find((p) => p.id === detalle.id) ?? detalle : null
  const cli = detalleActual ? cliente(detalleActual.clienteId) : undefined

  return (
    <div>
      <PageHeader title="Pedidos de venta" subtitle="Seguimiento del ciclo: pendiente → confirmado → preparando → enviado → entregado" actions={<button className="btn-primary" onClick={() => setNuevo(true)}><Plus size={16} /> Nuevo pedido</button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'todos', label: 'Todos', count: s.pedidos.length }, { value: 'abiertos', label: 'En curso', count: s.pedidos.filter((p) => !['entregado', 'cancelado'].includes(p.estado)).length }, { value: 'entregados', label: 'Entregados' }, { value: 'cancelados', label: 'Cancelados' }]} />
      <DataTable rows={rows} columns={columns} searchKeys={(r) => `${r.numero} ${cliente(r.clienteId)?.razonSocial ?? ''} ${r.estado}`} onRowClick={setDetalle} exportName="pedidos" />

      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Nuevo pedido de venta" size="xl" footer={<><button className="btn-secondary" onClick={() => setNuevo(false)}>Cancelar</button><button className="btn-primary" onClick={guardar} disabled={!form.clienteId || !lineas.length}>Guardar pedido</button></>}>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Field label="Cliente" className="sm:col-span-2"><Select value={form.clienteId} onChange={(v) => setForm({ ...form, clienteId: v })} placeholder="Seleccionar cliente..." options={s.clientes.filter((c) => c.activo).map((c) => ({ value: c.id, label: `${c.razonSocial} — ${c.ruc}` }))} /></Field>
          <Field label="Sucursal / depósito"><Select value={form.sucursalId} onChange={(v) => setForm({ ...form, sucursalId: v })} options={s.sucursales.map((x) => ({ value: x.id, label: x.nombre }))} /></Field>
          <Field label="Notas" className="sm:col-span-3"><input className="input" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Instrucciones de entrega, horario, etc." /></Field>
        </div>
        <LineasEditor lineas={lineas} onChange={setLineas} precioMayorista={cliente(form.clienteId)?.segmento !== 'minorista'} depositoId={form.sucursalId === 's02' ? 'd02' : form.sucursalId === 's03' ? 'd03' : 'd01'} />
      </Modal>

      <Modal open={!!detalleActual} onClose={() => setDetalle(null)} title={`Pedido ${detalleActual?.numero ?? ''}`} size="lg"
        footer={detalleActual && <>
          {!detalleActual.facturaId && detalleActual.estado !== 'cancelado' && <button className="btn-secondary" onClick={() => s.facturarPedido(detalleActual.id, cli && cli.diasCredito > 0 ? 'credito' : 'contado')}><FileText size={15} /> Facturar</button>}
          {detalleActual.estado !== 'cancelado' && detalleActual.estado !== 'entregado' && (
            <button className="btn-primary" onClick={() => s.cambiarEstadoPedido(detalleActual.id, flujo[flujo.indexOf(detalleActual.estado) + 1])}><Truck size={15} /> Avanzar a "{flujo[flujo.indexOf(detalleActual.estado) + 1]}"</button>
          )}
          {['pendiente', 'confirmado'].includes(detalleActual.estado) && !detalleActual.facturaId && <button className="btn-danger" onClick={() => s.cambiarEstadoPedido(detalleActual.id, 'cancelado')}>Cancelar pedido</button>}
        </>}>
        {detalleActual && cli && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              {flujo.map((e, i) => {
                const idx = flujo.indexOf(detalleActual.estado)
                return <div key={e} className="flex flex-1 items-center gap-2"><div className={`h-2 flex-1 rounded-full ${detalleActual.estado === 'cancelado' ? 'bg-slate-200' : i <= idx ? 'bg-brand-600' : 'bg-slate-200'}`} /><span className="text-[10px] capitalize text-slate-500">{e}</span></div>
              })}
            </div>
            <div className="mb-4 grid gap-x-8 sm:grid-cols-2">
              <KV k="Estado" v={<EstadoBadge estado={detalleActual.estado} />} />
              <KV k="Fecha" v={fmtDate(detalleActual.fecha)} />
              <KV k="Vendedor" v={s.usuarios.find((u) => u.id === detalleActual.vendedorId)?.nombre} />
              <KV k="Depósito" v={s.depositos.find((d) => d.id === detalleActual.depositoId)?.nombre} />
              {detalleActual.presupuestoId && <KV k="Origen" v={s.presupuestos.find((p) => p.id === detalleActual.presupuestoId)?.numero} />}
              {detalleActual.facturaId && <KV k="Factura" v={s.facturas.find((f) => f.id === detalleActual.facturaId)?.numero} />}
            </div>
            <DocumentoPrint tipo="Pedido de venta" numero={detalleActual.numero} fecha={detalleActual.fecha} tercero={{ nombre: cli.razonSocial, ruc: cli.ruc, direccion: cli.direccion, ciudad: cli.ciudad, telefono: cli.telefono, email: cli.email }} lineas={detalleActual.lineas} notas={detalleActual.notas} />
          </div>
        )}
      </Modal>
    </div>
  )
}
