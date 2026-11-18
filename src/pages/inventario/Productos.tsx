import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, AlertTriangle } from 'lucide-react'
import { useERP, selectores } from '@/store/erp'
import type { Producto } from '@/types'
import { PageHeader, DataTable, Badge, Modal, Field, Select, StatCard, Tabs, type Column } from '@/components/ui'
import { fmtMoneyCompact, fmtMoney, fmtNum, totales, today, uid, sumBy } from '@/lib/utils'

const vacio = (): Omit<Producto, 'id' | 'creadoEn'> => ({ codigo: '', codigoBarras: '', nombre: '', descripcion: '', categoriaId: 'c01', marcaId: 'm15', unidad: 'un', costo: 0, precio: 0, precioMayorista: 0, iva: 10, stockMinimo: 10, stockPorDeposito: { d01: 0, d02: 0, d03: 0 }, activo: true, proveedorId: '' })

export default function Productos() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const [params] = useSearchParams()
  const [tab, setTab] = useState<'todos' | 'bajo' | 'inactivos'>(params.get('filtro') === 'bajo' ? 'bajo' : 'todos')
  const [form, setForm] = useState<(Omit<Producto, 'id' | 'creadoEn'> & { id?: string }) | null>(null)
  const [detalle, setDetalle] = useState<Producto | null>(null)

  const vendidos = useMemo(() => {
    const map: Record<string, { q: number; monto: number }> = {}
    s.facturas.filter((f) => f.estado !== 'anulada').forEach((f) => f.lineas.forEach((l) => {
      map[l.productoId] ??= { q: 0, monto: 0 }
      map[l.productoId].q += l.cantidad
      map[l.productoId].monto += l.cantidad * l.precioUnitario * (1 - l.descuento / 100)
    }))
    return map
  }, [s.facturas])

  const bajos = s.productos.filter((p) => p.activo && p.stockPorDeposito.d01 < p.stockMinimo)
  const rows = s.productos.filter((p) => tab === 'todos' ? p.activo : tab === 'bajo' ? bajos.includes(p) : !p.activo)
  const valorInventario = sumBy(s.productos, (p) => selectores.stockTotal(p) * p.costo)

  const columns: Column<Producto>[] = [
    { key: 'codigo', header: 'Código', render: (r) => <span className="font-mono text-xs">{r.codigo}</span>, value: (r) => r.codigo, sortable: true },
    { key: 'nombre', header: 'Producto', render: (r) => <div><div className="font-medium text-slate-800">{r.nombre}</div><div className="text-xs text-slate-500">{s.marcas.find((m) => m.id === r.marcaId)?.nombre} · {r.unidad}</div></div>, value: (r) => r.nombre, sortable: true },
    { key: 'categoria', header: 'Categoría', render: (r) => { const c = s.categorias.find((x) => x.id === r.categoriaId); return <span className="badge" style={{ background: c?.color + '18', color: c?.color }}>{c?.nombre}</span> }, value: (r) => s.categorias.find((x) => x.id === r.categoriaId)?.nombre ?? '' },
    { key: 'costo', header: 'Costo', render: (r) => fmtMoney(r.costo, sim), value: (r) => r.costo, sortable: true, align: 'right' },
    { key: 'precio', header: 'P. venta', render: (r) => <div><div className="font-medium">{fmtMoney(r.precio, sim)}</div><div className="text-[11px] text-slate-500">may. {fmtMoney(r.precioMayorista, sim)}</div></div>, value: (r) => r.precio, sortable: true, align: 'right' },
    { key: 'margen', header: 'Margen', render: (r) => <Badge color={(r.precio - r.costo) / r.costo > 0.3 ? 'green' : 'yellow'}>{(((r.precio - r.costo) / r.costo) * 100).toFixed(0)}%</Badge>, value: (r) => (r.precio - r.costo) / r.costo, sortable: true, align: 'center' },
    { key: 'stock', header: 'Stock total', render: (r) => { const st = selectores.stockTotal(r); return <span className={r.stockPorDeposito.d01 < r.stockMinimo ? 'font-bold text-rose-600' : 'font-medium'}>{fmtNum(st)}</span> }, value: (r) => selectores.stockTotal(r), sortable: true, align: 'right' },
    { key: 'minimo', header: 'Mínimo', render: (r) => <span className="text-xs text-slate-500">{r.stockMinimo}</span>, align: 'right' },
    { key: 'vendido', header: 'Vendido (12m)', render: (r) => fmtNum(vendidos[r.id]?.q ?? 0), value: (r) => vendidos[r.id]?.q ?? 0, sortable: true, align: 'right' },
    { key: 'acciones', header: '', render: (r) => <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setForm({ ...r }) }}><Pencil size={14} /></button> },
  ]
  const guardar = () => {
    if (!form || !form.nombre) return
    if (form.id) { const { id, ...rest } = form; s.update('productos', id, rest); s.toast('Producto actualizado') }
    else { s.add('productos', { ...form, id: uid('pr'), creadoEn: today() } as Producto); s.toast('Producto creado') }
    setForm(null)
  }

  return (
    <div>
      <PageHeader title="Productos" subtitle="Catálogo maestro con costos, precios y niveles de stock" actions={<button className="btn-primary" onClick={() => setForm(vacio())}><Plus size={16} /> Nuevo producto</button>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Productos activos" value={String(s.productos.filter((p) => p.activo).length)} />
        <StatCard label="Valor del inventario (costo)" value={fmtMoneyCompact(valorInventario, sim)} tone="blue" />
        <StatCard label="Bajo stock mínimo" value={String(bajos.length)} tone="red" icon={<AlertTriangle size={20} />} />
        <StatCard label="Margen promedio" value={`${((sumBy(s.productos, (p) => (p.precio - p.costo) / p.costo) / s.productos.length) * 100).toFixed(1)}%`} tone="green" />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'todos', label: 'Activos', count: s.productos.filter((p) => p.activo).length }, { value: 'bajo', label: 'Bajo mínimo', count: bajos.length }, { value: 'inactivos', label: 'Inactivos' }]} />
      <DataTable rows={rows} columns={columns} searchKeys={(r) => `${r.codigo} ${r.nombre} ${r.codigoBarras ?? ''} ${s.categorias.find((c) => c.id === r.categoriaId)?.nombre ?? ''}`} onRowClick={setDetalle} exportName="productos" pageSize={20} rowClassName={(r) => r.stockPorDeposito.d01 < r.stockMinimo ? 'bg-rose-50/40' : ''} />

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar producto' : 'Nuevo producto'} footer={<><button className="btn-secondary" onClick={() => setForm(null)}>Cancelar</button><button className="btn-primary" onClick={guardar}>Guardar</button></>}>
        {form && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Código"><input className="input" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></Field>
            <Field label="Código de barras"><input className="input" value={form.codigoBarras ?? ''} onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })} /></Field>
            <Field label="Nombre" className="sm:col-span-2"><input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
            <Field label="Categoría"><Select value={form.categoriaId} onChange={(v) => setForm({ ...form, categoriaId: v })} options={s.categorias.map((c) => ({ value: c.id, label: c.nombre }))} /></Field>
            <Field label="Marca"><Select value={form.marcaId} onChange={(v) => setForm({ ...form, marcaId: v })} options={s.marcas.map((m) => ({ value: m.id, label: m.nombre }))} /></Field>
            <Field label="Unidad"><Select value={form.unidad} onChange={(v) => setForm({ ...form, unidad: v })} options={['un', 'kg', 'lt', 'pack', 'caja'].map((u) => ({ value: u, label: u }))} /></Field>
            <Field label="IVA"><Select value={String(form.iva)} onChange={(v) => setForm({ ...form, iva: Number(v) })} options={[{ value: '10', label: '10%' }, { value: '5', label: '5%' }, { value: '0', label: 'Exento' }]} /></Field>
            <Field label="Costo"><input type="number" className="input" value={form.costo} onChange={(e) => setForm({ ...form, costo: Number(e.target.value) })} /></Field>
            <Field label="Precio de venta"><input type="number" className="input" value={form.precio} onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })} /></Field>
            <Field label="Precio mayorista"><input type="number" className="input" value={form.precioMayorista} onChange={(e) => setForm({ ...form, precioMayorista: Number(e.target.value) })} /></Field>
            <Field label="Stock mínimo"><input type="number" className="input" value={form.stockMinimo} onChange={(e) => setForm({ ...form, stockMinimo: Number(e.target.value) })} /></Field>
            <Field label="Proveedor principal" className="sm:col-span-2"><Select value={form.proveedorId ?? ''} onChange={(v) => setForm({ ...form, proveedorId: v })} placeholder="Sin asignar" options={s.proveedores.map((p) => ({ value: p.id, label: p.razonSocial }))} /></Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Producto activo</label>
          </div>
        )}
      </Modal>

      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={detalle?.nombre ?? ''} size="md">
        {detalle && (
          <div>
            <div className="mb-4 grid gap-2 sm:grid-cols-2 text-sm">
              <div><span className="text-slate-500">Código:</span> <span className="font-mono">{detalle.codigo}</span></div>
              <div><span className="text-slate-500">Barras:</span> <span className="font-mono">{detalle.codigoBarras}</span></div>
              <div><span className="text-slate-500">Costo:</span> {fmtMoney(detalle.costo, sim)}</div>
              <div><span className="text-slate-500">Precio:</span> {fmtMoney(detalle.precio, sim)}</div>
              <div><span className="text-slate-500">Margen:</span> {(((detalle.precio - detalle.costo) / detalle.costo) * 100).toFixed(1)}%</div>
              <div><span className="text-slate-500">Proveedor:</span> {s.proveedores.find((p) => p.id === detalle.proveedorId)?.razonSocial ?? '—'}</div>
            </div>
            <h3 className="mb-2 text-sm font-semibold">Stock por depósito</h3>
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              {s.depositos.map((d) => (
                <div key={d.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs text-slate-500">{d.nombre}</div>
                  <div className={`text-xl font-bold ${(detalle.stockPorDeposito[d.id] ?? 0) < detalle.stockMinimo ? 'text-rose-600' : 'text-slate-900'}`}>{fmtNum(detalle.stockPorDeposito[d.id] ?? 0)}</div>
                </div>
              ))}
            </div>
            <h3 className="mb-2 text-sm font-semibold">Últimos movimientos</h3>
            <div className="table-wrap">
              <table className="table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Depósito</th><th>Motivo</th><th className="text-right">Cant.</th></tr></thead>
                <tbody>{s.movimientosStock.filter((m) => m.productoId === detalle.id).slice(0, 8).map((m) => <tr key={m.id}><td>{m.fecha}</td><td className="capitalize">{m.tipo}</td><td>{s.depositos.find((d) => d.id === m.depositoId)?.nombre}</td><td className="text-xs">{m.motivo}</td><td className="num">{m.cantidad}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="mt-3 text-xs text-slate-500">Vendido en 12 meses: <b>{fmtNum(vendidos[detalle.id]?.q ?? 0)}</b> unidades · {fmtMoney(vendidos[detalle.id]?.monto ?? 0, sim)}</div>
          </div>
        )}
      </Modal>
      <span className="hidden">{totales([]).total}</span>
    </div>
  )
}
