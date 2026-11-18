import { useState } from 'react'
import { Plus, ArrowRightCircle, Send } from 'lucide-react'
import { useERP } from '@/store/erp'
import type { Presupuesto, LineaDocumento } from '@/types'
import { PageHeader, DataTable, EstadoBadge, Modal, Field, Select, KV, type Column } from '@/components/ui'
import { LineasEditor } from '@/components/LineasEditor'
import { DocumentoPrint } from '@/components/DocumentoPrint'
import { fmtMoney, fmtDate, totales, today, addDays } from '@/lib/utils'

export default function Presupuestos() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const [nuevo, setNuevo] = useState(false)
  const [detalle, setDetalle] = useState<Presupuesto | null>(null)
  const [form, setForm] = useState({ clienteId: '', validez: 15, notas: '' })
  const [lineas, setLineas] = useState<LineaDocumento[]>([])
  const cliente = (id: string) => s.clientes.find((c) => c.id === id)

  const columns: Column<Presupuesto>[] = [
    { key: 'numero', header: 'N°', render: (r) => <span className="font-mono text-xs font-medium">{r.numero}</span>, value: (r) => r.numero, sortable: true },
    { key: 'fecha', header: 'Fecha', render: (r) => fmtDate(r.fecha), value: (r) => r.fecha, sortable: true },
    { key: 'validoHasta', header: 'Válido hasta', render: (r) => <span className={r.validoHasta < today() && r.estado === 'enviado' ? 'text-rose-600' : ''}>{fmtDate(r.validoHasta)}</span> },
    { key: 'cliente', header: 'Cliente', render: (r) => cliente(r.clienteId)?.razonSocial, value: (r) => cliente(r.clienteId)?.razonSocial ?? '' },
    { key: 'vendedor', header: 'Vendedor', render: (r) => s.usuarios.find((u) => u.id === r.vendedorId)?.nombre },
    { key: 'total', header: 'Total', render: (r) => fmtMoney(totales(r.lineas).total, sim), value: (r) => totales(r.lineas).total, sortable: true, align: 'right' },
    { key: 'estado', header: 'Estado', render: (r) => <EstadoBadge estado={r.estado} /> },
  ]
  const guardar = () => {
    if (!form.clienteId || !lineas.length) return
    s.crearPresupuesto({ fecha: today(), validoHasta: addDays(today(), form.validez), clienteId: form.clienteId, vendedorId: s.usuarioActual!.id, lineas, estado: 'borrador', notas: form.notas || undefined })
    setNuevo(false); setLineas([]); setForm({ clienteId: '', validez: 15, notas: '' })
  }
  const det = detalle ? s.presupuestos.find((p) => p.id === detalle.id) ?? detalle : null
  const cli = det ? cliente(det.clienteId) : undefined
  const tasaConversion = s.presupuestos.length ? Math.round((s.presupuestos.filter((p) => p.estado === 'aceptado').length / s.presupuestos.filter((p) => p.estado !== 'borrador' && p.estado !== 'enviado').length) * 100) : 0

  return (
    <div>
      <PageHeader title="Presupuestos" subtitle={`Cotizaciones enviadas a clientes · Tasa de conversión: ${tasaConversion}%`} actions={<button className="btn-primary" onClick={() => setNuevo(true)}><Plus size={16} /> Nuevo presupuesto</button>} />
      <DataTable rows={s.presupuestos} columns={columns} searchKeys={(r) => `${r.numero} ${cliente(r.clienteId)?.razonSocial ?? ''} ${r.estado}`} onRowClick={setDetalle} exportName="presupuestos" />

      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Nuevo presupuesto" size="xl" footer={<><button className="btn-secondary" onClick={() => setNuevo(false)}>Cancelar</button><button className="btn-primary" onClick={guardar} disabled={!form.clienteId || !lineas.length}>Guardar</button></>}>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Field label="Cliente" className="sm:col-span-2"><Select value={form.clienteId} onChange={(v) => setForm({ ...form, clienteId: v })} placeholder="Seleccionar cliente..." options={s.clientes.filter((c) => c.activo).map((c) => ({ value: c.id, label: c.razonSocial }))} /></Field>
          <Field label="Validez (días)"><input type="number" className="input" value={form.validez} onChange={(e) => setForm({ ...form, validez: Number(e.target.value) })} /></Field>
          <Field label="Notas" className="sm:col-span-3"><input className="input" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></Field>
        </div>
        <LineasEditor lineas={lineas} onChange={setLineas} precioMayorista={cliente(form.clienteId)?.segmento !== 'minorista'} />
      </Modal>

      <Modal open={!!det} onClose={() => setDetalle(null)} title={`Presupuesto ${det?.numero ?? ''}`} size="lg"
        footer={det && <>
          {det.estado === 'borrador' && <button className="btn-secondary" onClick={() => s.update('presupuestos', det.id, { estado: 'enviado' })}><Send size={15} /> Marcar enviado</button>}
          {['borrador', 'enviado'].includes(det.estado) && <button className="btn-danger" onClick={() => s.update('presupuestos', det.id, { estado: 'rechazado' })}>Rechazado</button>}
          {['borrador', 'enviado'].includes(det.estado) && <button className="btn-primary" onClick={() => { s.convertirPresupuesto(det.id); setDetalle(null) }}><ArrowRightCircle size={15} /> Aceptar y convertir en pedido</button>}
        </>}>
        {det && cli && (
          <div>
            <div className="mb-3 grid gap-x-8 sm:grid-cols-2">
              <KV k="Estado" v={<EstadoBadge estado={det.estado} />} />
              <KV k="Vendedor" v={s.usuarios.find((u) => u.id === det.vendedorId)?.nombre} />
            </div>
            <DocumentoPrint tipo="Presupuesto" numero={det.numero} fecha={det.fecha} vencimiento={det.validoHasta} tercero={{ nombre: cli.razonSocial, ruc: cli.ruc, direccion: cli.direccion, ciudad: cli.ciudad, telefono: cli.telefono, email: cli.email }} lineas={det.lineas} notas={det.notas} />
          </div>
        )}
      </Modal>
    </div>
  )
}
