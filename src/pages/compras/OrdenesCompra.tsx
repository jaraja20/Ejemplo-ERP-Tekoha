import { useState } from 'react'
import { Plus, PackageCheck, Send } from 'lucide-react'
import { useERP } from '@/store/erp'
import type { OrdenCompra, LineaDocumento, LineaOC } from '@/types'
import { PageHeader, DataTable, EstadoBadge, Modal, Field, Select, Tabs, KV, type Column } from '@/components/ui'
import { LineasEditor } from '@/components/LineasEditor'
import { DocumentoPrint } from '@/components/DocumentoPrint'
import { fmtMoney, fmtDate, totales, today, addDays } from '@/lib/utils'

export default function OrdenesCompra() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const [tab, setTab] = useState<'todas' | 'abiertas' | 'recibidas'>('todas')
  const [nuevo, setNuevo] = useState(false)
  const [detalle, setDetalle] = useState<OrdenCompra | null>(null)
  const [recepcion, setRecepcion] = useState<OrdenCompra | null>(null)
  const [recCants, setRecCants] = useState<Record<string, number>>({})
  const [form, setForm] = useState({ proveedorId: '', depositoId: 'd01', entrega: addDays(today(), 7), notas: '' })
  const [lineas, setLineas] = useState<LineaDocumento[]>([])
  const prov = (id: string) => s.proveedores.find((p) => p.id === id)

  const rows = s.ordenesCompra.filter((o) => tab === 'todas' || (tab === 'abiertas' && ['borrador', 'enviada', 'parcial'].includes(o.estado)) || (tab === 'recibidas' && o.estado === 'recibida'))
  const columns: Column<OrdenCompra>[] = [
    { key: 'numero', header: 'N°', render: (r) => <span className="font-mono text-xs font-medium">{r.numero}</span>, value: (r) => r.numero, sortable: true },
    { key: 'fecha', header: 'Fecha', render: (r) => fmtDate(r.fecha), value: (r) => r.fecha, sortable: true },
    { key: 'proveedor', header: 'Proveedor', render: (r) => prov(r.proveedorId)?.razonSocial, value: (r) => prov(r.proveedorId)?.razonSocial ?? '' },
    { key: 'entrega', header: 'Entrega est.', render: (r) => fmtDate(r.entregaEstimada) },
    { key: 'deposito', header: 'Depósito', render: (r) => s.depositos.find((d) => d.id === r.depositoId)?.nombre },
    { key: 'avance', header: 'Recibido', render: (r) => { const t = r.lineas.reduce((a, l) => a + l.cantidad, 0), rc = r.lineas.reduce((a, l) => a + l.recibido, 0); const p = t ? Math.round((rc / t) * 100) : 0; return <div className="flex items-center gap-2"><div className="h-1.5 w-16 rounded-full bg-slate-200"><div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${p}%` }} /></div><span className="text-xs tabular-nums text-slate-500">{p}%</span></div> } },
    { key: 'total', header: 'Total', render: (r) => fmtMoney(totales(r.lineas).total, sim), value: (r) => totales(r.lineas).total, sortable: true, align: 'right' },
    { key: 'estado', header: 'Estado', render: (r) => <EstadoBadge estado={r.estado} /> },
  ]
  const guardar = () => {
    if (!form.proveedorId || !lineas.length) return
    s.crearOrdenCompra({ fecha: today(), entregaEstimada: form.entrega, proveedorId: form.proveedorId, depositoId: form.depositoId, compradorId: s.usuarioActual!.id, lineas: lineas.map((l) => ({ ...l, recibido: 0 })) as LineaOC[], estado: 'borrador', notas: form.notas || undefined })
    setNuevo(false); setLineas([]); setForm({ proveedorId: '', depositoId: 'd01', entrega: addDays(today(), 7), notas: '' })
  }
  const abrirRecepcion = (o: OrdenCompra) => { setRecepcion(o); setRecCants(Object.fromEntries(o.lineas.map((l) => [l.productoId, l.cantidad - l.recibido]))) }
  const det = detalle ? s.ordenesCompra.find((o) => o.id === detalle.id) ?? detalle : null
  const pr = det ? prov(det.proveedorId) : undefined

  return (
    <div>
      <PageHeader title="Órdenes de compra" subtitle="Pedidos a proveedores con recepción parcial y generación automática de factura de compra" actions={<button className="btn-primary" onClick={() => setNuevo(true)}><Plus size={16} /> Nueva orden</button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'todas', label: 'Todas', count: s.ordenesCompra.length }, { value: 'abiertas', label: 'Abiertas', count: s.ordenesCompra.filter((o) => ['borrador', 'enviada', 'parcial'].includes(o.estado)).length }, { value: 'recibidas', label: 'Recibidas' }]} />
      <DataTable rows={rows} columns={columns} searchKeys={(r) => `${r.numero} ${prov(r.proveedorId)?.razonSocial ?? ''} ${r.estado}`} onRowClick={setDetalle} exportName="ordenes-compra" />

      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Nueva orden de compra" size="xl" footer={<><button className="btn-secondary" onClick={() => setNuevo(false)}>Cancelar</button><button className="btn-primary" onClick={guardar} disabled={!form.proveedorId || !lineas.length}>Crear orden</button></>}>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Field label="Proveedor"><Select value={form.proveedorId} onChange={(v) => setForm({ ...form, proveedorId: v })} placeholder="Seleccionar..." options={s.proveedores.filter((p) => p.activo).map((p) => ({ value: p.id, label: p.razonSocial }))} /></Field>
          <Field label="Depósito destino"><Select value={form.depositoId} onChange={(v) => setForm({ ...form, depositoId: v })} options={s.depositos.map((d) => ({ value: d.id, label: d.nombre }))} /></Field>
          <Field label="Entrega estimada"><input type="date" className="input" value={form.entrega} onChange={(e) => setForm({ ...form, entrega: e.target.value })} /></Field>
          <Field label="Notas" className="sm:col-span-3"><input className="input" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></Field>
        </div>
        <LineasEditor lineas={lineas} onChange={setLineas} modoCosto depositoId={form.depositoId} />
      </Modal>

      <Modal open={!!det} onClose={() => setDetalle(null)} title={`Orden ${det?.numero ?? ''}`} size="lg"
        footer={det && <>
          {det.estado === 'borrador' && <button className="btn-secondary" onClick={() => s.update('ordenesCompra', det.id, { estado: 'enviada' })}><Send size={15} /> Marcar enviada</button>}
          {['enviada', 'parcial'].includes(det.estado) && <button className="btn-primary" onClick={() => abrirRecepcion(det)}><PackageCheck size={15} /> Registrar recepción</button>}
          {['borrador', 'enviada'].includes(det.estado) && <button className="btn-danger" onClick={() => { s.update('ordenesCompra', det.id, { estado: 'cancelada' }); setDetalle(null) }}>Cancelar</button>}
        </>}>
        {det && pr && (
          <div>
            <div className="mb-3 grid gap-x-8 sm:grid-cols-2">
              <KV k="Estado" v={<EstadoBadge estado={det.estado} />} />
              <KV k="Comprador" v={s.usuarios.find((u) => u.id === det.compradorId)?.nombre} />
              <KV k="Depósito" v={s.depositos.find((d) => d.id === det.depositoId)?.nombre} />
              <KV k="Condición de pago" v={`${pr.diasPago} días`} />
            </div>
            <div className="table-wrap mb-4">
              <table className="table"><thead><tr><th>Producto</th><th className="text-right">Pedido</th><th className="text-right">Recibido</th><th className="text-right">Pendiente</th></tr></thead>
                <tbody>{det.lineas.map((l) => <tr key={l.productoId}><td>{l.descripcion}</td><td className="num">{l.cantidad}</td><td className="num text-emerald-700">{l.recibido}</td><td className="num text-amber-700">{l.cantidad - l.recibido}</td></tr>)}</tbody>
              </table>
            </div>
            <DocumentoPrint tipo="Orden de compra" numero={det.numero} fecha={det.fecha} vencimiento={det.entregaEstimada} tercero={{ nombre: pr.razonSocial, ruc: pr.ruc, direccion: pr.direccion, ciudad: pr.ciudad, telefono: pr.telefono, email: pr.email }} lineas={det.lineas} notas={det.notas} />
          </div>
        )}
      </Modal>

      <Modal open={!!recepcion} onClose={() => setRecepcion(null)} title={`Recepción de mercadería · ${recepcion?.numero}`} size="md"
        footer={<><button className="btn-secondary" onClick={() => setRecepcion(null)}>Cancelar</button><button className="btn-primary" onClick={() => { if (recepcion) { s.recibirOrdenCompra(recepcion.id, recCants); setRecepcion(null); setDetalle(null) } }}>Confirmar recepción</button></>}>
        {recepcion && (
          <div className="table-wrap">
            <table className="table"><thead><tr><th>Producto</th><th className="text-right">Pendiente</th><th className="w-32 text-right">A recibir</th></tr></thead>
              <tbody>{recepcion.lineas.map((l) => (
                <tr key={l.productoId}><td>{l.descripcion}</td><td className="num">{l.cantidad - l.recibido}</td>
                  <td className="num"><input type="number" min={0} max={l.cantidad - l.recibido} className="input py-1 text-right" value={recCants[l.productoId] ?? 0} onChange={(e) => setRecCants({ ...recCants, [l.productoId]: Math.min(l.cantidad - l.recibido, Math.max(0, Number(e.target.value))) })} /></td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  )
}
