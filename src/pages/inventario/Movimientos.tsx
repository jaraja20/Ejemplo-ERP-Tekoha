import { useState } from 'react'
import { useERP } from '@/store/erp'
import type { MovimientoStock, TipoMovimiento } from '@/types'
import { PageHeader, DataTable, EstadoBadge, Select, StatCard, type Column } from '@/components/ui'
import { fmtDate, fmtNum, sumBy, today } from '@/lib/utils'

export default function Movimientos() {
  const s = useERP()
  const [tipo, setTipo] = useState<'' | TipoMovimiento>('')
  const [dep, setDep] = useState('')
  const rows = s.movimientosStock.filter((m) => (!tipo || m.tipo === tipo) && (!dep || m.depositoId === dep))
  const mes = today().slice(0, 7)
  const delMes = s.movimientosStock.filter((m) => m.fecha.slice(0, 7) === mes)

  const columns: Column<MovimientoStock>[] = [
    { key: 'fecha', header: 'Fecha', render: (r) => fmtDate(r.fecha), value: (r) => r.fecha, sortable: true },
    { key: 'tipo', header: 'Tipo', render: (r) => <EstadoBadge estado={r.tipo} /> },
    { key: 'producto', header: 'Producto', render: (r) => { const p = s.productos.find((x) => x.id === r.productoId); return <div><div className="font-medium text-slate-800">{p?.nombre}</div><div className="font-mono text-xs text-slate-500">{p?.codigo}</div></div> }, value: (r) => s.productos.find((x) => x.id === r.productoId)?.nombre ?? '' },
    { key: 'deposito', header: 'Depósito', render: (r) => <span>{s.depositos.find((d) => d.id === r.depositoId)?.nombre}{r.depositoDestinoId && <span className="text-slate-400"> → {s.depositos.find((d) => d.id === r.depositoDestinoId)?.nombre}</span>}</span> },
    { key: 'cantidad', header: 'Cantidad', render: (r) => <span className={r.tipo === 'salida' || r.cantidad < 0 ? 'font-medium text-rose-600' : 'font-medium text-emerald-700'}>{r.tipo === 'salida' ? '-' : r.cantidad > 0 ? '+' : ''}{fmtNum(Math.abs(r.cantidad))}</span>, value: (r) => r.cantidad, sortable: true, align: 'right' },
    { key: 'motivo', header: 'Motivo' },
    { key: 'referencia', header: 'Referencia', render: (r) => <span className="font-mono text-xs text-slate-500">{r.referencia ?? '—'}</span> },
    { key: 'usuario', header: 'Usuario', render: (r) => s.usuarios.find((u) => u.id === r.usuarioId)?.nombre },
  ]

  return (
    <div>
      <PageHeader title="Movimientos de stock" subtitle="Kardex completo: entradas, salidas, ajustes y transferencias" />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Movimientos del mes" value={String(delMes.length)} />
        <StatCard label="Unidades ingresadas (mes)" value={fmtNum(sumBy(delMes.filter((m) => m.tipo === 'entrada'), (m) => m.cantidad))} tone="green" />
        <StatCard label="Unidades despachadas (mes)" value={fmtNum(sumBy(delMes.filter((m) => m.tipo === 'salida'), (m) => m.cantidad))} tone="red" />
        <StatCard label="Ajustes registrados" value={String(s.movimientosStock.filter((m) => m.tipo === 'ajuste').length)} tone="amber" />
      </div>
      <DataTable rows={rows} columns={columns} searchKeys={(r) => `${s.productos.find((p) => p.id === r.productoId)?.nombre ?? ''} ${r.motivo} ${r.referencia ?? ''}`} exportName="movimientos-stock" pageSize={20}
        toolbar={<><Select className="w-40" value={tipo} onChange={(v) => setTipo(v as TipoMovimiento)} placeholder="Todos los tipos" options={[{ value: 'entrada', label: 'Entradas' }, { value: 'salida', label: 'Salidas' }, { value: 'ajuste', label: 'Ajustes' }, { value: 'transferencia', label: 'Transferencias' }]} /><Select className="w-48" value={dep} onChange={setDep} placeholder="Todos los depósitos" options={s.depositos.map((d) => ({ value: d.id, label: d.nombre }))} /></>} />
    </div>
  )
}
