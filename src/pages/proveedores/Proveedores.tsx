import { useMemo, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { useERP, selectores } from '@/store/erp'
import type { Proveedor } from '@/types'
import { PageHeader, DataTable, Badge, Modal, Field, StatCard, Avatar, type Column } from '@/components/ui'
import { fmtMoneyCompact, fmtMoney, fmtDate, totales, today, uid, sumBy, nextNumero } from '@/lib/utils'

const vacio = (): Omit<Proveedor, 'id' | 'codigo' | 'creadoEn'> => ({ razonSocial: '', ruc: '', email: '', telefono: '', direccion: '', ciudad: 'Asunción', contacto: '', rubro: '', diasPago: 30, activo: true })

export default function Proveedores() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const [form, setForm] = useState<(Omit<Proveedor, 'id' | 'codigo' | 'creadoEn'> & { id?: string }) | null>(null)
  const [detalle, setDetalle] = useState<Proveedor | null>(null)

  const datos = useMemo(() => {
    const map: Record<string, { compras: number; saldo: number; ocs: number }> = {}
    s.proveedores.forEach((p) => (map[p.id] = { compras: 0, saldo: 0, ocs: 0 }))
    s.facturasCompra.forEach((f) => { if (!map[f.proveedorId]) return; map[f.proveedorId].compras += totales(f.lineas).total; if (f.estado !== 'pagada') map[f.proveedorId].saldo += selectores.saldoFacturaCompra(s, f) })
    s.ordenesCompra.forEach((o) => { if (map[o.proveedorId]) map[o.proveedorId].ocs++ })
    return map
  }, [s])

  const columns: Column<Proveedor>[] = [
    { key: 'codigo', header: 'Código', render: (r) => <span className="font-mono text-xs">{r.codigo}</span>, value: (r) => r.codigo, sortable: true },
    { key: 'razonSocial', header: 'Proveedor', render: (r) => <div className="flex items-center gap-2"><Avatar name={r.razonSocial} size="sm" /><div><div className="font-medium text-slate-800">{r.razonSocial}</div><div className="text-xs text-slate-500">{r.ruc}</div></div></div>, value: (r) => r.razonSocial, sortable: true },
    { key: 'rubro', header: 'Rubro', render: (r) => <Badge color="blue">{r.rubro}</Badge> },
    { key: 'contacto', header: 'Contacto', render: (r) => <div className="text-xs"><div>{r.contacto ?? '—'}</div><div className="text-slate-500">{r.telefono}</div></div> },
    { key: 'ciudad', header: 'Ciudad', value: (r) => r.ciudad, sortable: true },
    { key: 'diasPago', header: 'Cond. pago', render: (r) => `${r.diasPago} días`, align: 'center' },
    { key: 'ocs', header: 'Órdenes', render: (r) => datos[r.id]?.ocs ?? 0, value: (r) => datos[r.id]?.ocs ?? 0, sortable: true, align: 'center' },
    { key: 'compras', header: 'Comprado', render: (r) => fmtMoney(datos[r.id]?.compras ?? 0, sim), value: (r) => datos[r.id]?.compras ?? 0, sortable: true, align: 'right' },
    { key: 'saldo', header: 'Saldo a pagar', render: (r) => { const v = datos[r.id]?.saldo ?? 0; return <span className={v > 0 ? 'font-medium text-amber-700' : 'text-slate-400'}>{fmtMoney(v, sim)}</span> }, value: (r) => datos[r.id]?.saldo ?? 0, sortable: true, align: 'right' },
    { key: 'activo', header: 'Estado', render: (r) => <Badge color={r.activo ? 'green' : 'gray'}>{r.activo ? 'Activo' : 'Inactivo'}</Badge> },
    { key: 'acciones', header: '', render: (r) => <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setForm({ ...r }) }}><Pencil size={14} /></button> },
  ]
  const guardar = () => {
    if (!form || !form.razonSocial) return
    if (form.id) { const { id, ...rest } = form; s.update('proveedores', id, rest); s.toast('Proveedor actualizado') }
    else { s.add('proveedores', { ...form, id: uid('pv'), codigo: nextNumero(s.proveedores.map((p) => p.codigo), 'PRV-', 3), creadoEn: today() } as Proveedor); s.toast('Proveedor creado') }
    setForm(null)
  }

  return (
    <div>
      <PageHeader title="Proveedores" subtitle="Cartera de proveedores, condiciones de pago y saldos" actions={<button className="btn-primary" onClick={() => setForm(vacio())}><Plus size={16} /> Nuevo proveedor</button>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Proveedores activos" value={String(s.proveedores.filter((p) => p.activo).length)} />
        <StatCard label="Saldo total a pagar" value={fmtMoneyCompact(sumBy(Object.values(datos), (x) => x.saldo), sim)} tone="amber" />
        <StatCard label="Compras históricas" value={fmtMoneyCompact(sumBy(Object.values(datos), (x) => x.compras), sim)} tone="blue" />
      </div>
      <DataTable rows={s.proveedores} columns={columns} searchKeys={(r) => `${r.codigo} ${r.razonSocial} ${r.ruc} ${r.rubro} ${r.ciudad}`} onRowClick={setDetalle} exportName="proveedores" />

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar proveedor' : 'Nuevo proveedor'} footer={<><button className="btn-secondary" onClick={() => setForm(null)}>Cancelar</button><button className="btn-primary" onClick={guardar}>Guardar</button></>}>
        {form && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Razón social" className="sm:col-span-2"><input className="input" value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} /></Field>
            <Field label="RUC"><input className="input" value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} /></Field>
            <Field label="Rubro"><input className="input" value={form.rubro} onChange={(e) => setForm({ ...form, rubro: e.target.value })} /></Field>
            <Field label="Contacto"><input className="input" value={form.contacto ?? ''} onChange={(e) => setForm({ ...form, contacto: e.target.value })} /></Field>
            <Field label="Teléfono"><input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></Field>
            <Field label="Email"><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Días de pago"><input type="number" className="input" value={form.diasPago} onChange={(e) => setForm({ ...form, diasPago: Number(e.target.value) })} /></Field>
            <Field label="Dirección"><input className="input" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></Field>
            <Field label="Ciudad"><input className="input" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Proveedor activo</label>
          </div>
        )}
      </Modal>

      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={detalle?.razonSocial ?? ''} size="lg">
        {detalle && (
          <div>
            <div className="mb-4 grid gap-2 sm:grid-cols-2 text-sm">
              <div><span className="text-slate-500">RUC:</span> {detalle.ruc}</div>
              <div><span className="text-slate-500">Rubro:</span> {detalle.rubro}</div>
              <div><span className="text-slate-500">Contacto:</span> {detalle.contacto} · {detalle.telefono}</div>
              <div><span className="text-slate-500">Email:</span> {detalle.email}</div>
              <div><span className="text-slate-500">Dirección:</span> {detalle.direccion}, {detalle.ciudad}</div>
              <div><span className="text-slate-500">Condición de pago:</span> {detalle.diasPago} días</div>
            </div>
            <h3 className="mb-2 text-sm font-semibold">Productos que provee</h3>
            <div className="mb-4 flex flex-wrap gap-1">
              {s.productos.filter((p) => p.proveedorId === detalle.id).map((p) => <Badge key={p.id} color="gray">{p.nombre}</Badge>)}
            </div>
            <h3 className="mb-2 text-sm font-semibold">Últimas órdenes de compra</h3>
            <div className="table-wrap">
              <table className="table"><thead><tr><th>N°</th><th>Fecha</th><th className="text-right">Total</th><th>Estado</th></tr></thead>
                <tbody>{s.ordenesCompra.filter((o) => o.proveedorId === detalle.id).slice(0, 8).map((o) => <tr key={o.id}><td className="font-mono text-xs">{o.numero}</td><td>{fmtDate(o.fecha)}</td><td className="num">{fmtMoney(totales(o.lineas).total, sim)}</td><td className="capitalize">{o.estado}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
