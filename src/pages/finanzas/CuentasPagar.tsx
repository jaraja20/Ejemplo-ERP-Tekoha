import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { useERP, selectores } from '@/store/erp'
import { PageHeader, StatCard, DataTable, Badge, type Column } from '@/components/ui'
import { fmtMoneyCompact, fmtMoney, fmtDate, daysBetween, today, sumBy, addDays } from '@/lib/utils'
import type { FacturaCompra } from '@/types'

interface Fila { id: string; f: FacturaCompra; proveedor: string; saldo: number; dias: number; tramo: string }
const tramos = ['Por vencer', '1-30 días', '31-60 días', '+60 días']

export default function CuentasPagar() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const navigate = useNavigate()
  const hoy = today()

  const filas = useMemo<Fila[]>(() => s.facturasCompra.filter((f) => f.estado !== 'pagada').map((f) => {
    const saldo = selectores.saldoFacturaCompra(s, f)
    const dias = daysBetween(f.vencimiento, hoy)
    const tramo = dias <= 0 ? 'Por vencer' : dias <= 30 ? '1-30 días' : dias <= 60 ? '31-60 días' : '+60 días'
    return { id: f.id, f, proveedor: s.proveedores.find((p) => p.id === f.proveedorId)?.razonSocial ?? '', saldo, dias, tramo }
  }).filter((x) => x.saldo > 1), [s, hoy])

  const antiguedad = tramos.map((t) => ({ tramo: t, monto: Math.round(sumBy(filas.filter((f) => f.tramo === t), (f) => f.saldo)) }))
  const proyeccion = useMemo(() => {
    const sem = [0, 1, 2, 3].map((i) => ({ semana: `Sem ${i + 1}`, monto: 0, desde: addDays(hoy, i * 7), hasta: addDays(hoy, (i + 1) * 7) }))
    filas.forEach((f) => { const idx = sem.findIndex((x) => f.f.vencimiento >= x.desde && f.f.vencimiento < x.hasta); if (idx >= 0) sem[idx].monto += f.saldo })
    return sem.map((x) => ({ semana: x.semana, monto: Math.round(x.monto) }))
  }, [filas, hoy])

  const columns: Column<Fila>[] = [
    { key: 'numero', header: 'Factura', render: (r) => <span className="font-mono text-xs font-medium">{r.f.numero}</span>, value: (r) => r.f.numero, sortable: true },
    { key: 'proveedor', header: 'Proveedor', value: (r) => r.proveedor, sortable: true },
    { key: 'fecha', header: 'Emisión', render: (r) => fmtDate(r.f.fecha), value: (r) => r.f.fecha, sortable: true },
    { key: 'vencimiento', header: 'Vencimiento', render: (r) => fmtDate(r.f.vencimiento), value: (r) => r.f.vencimiento, sortable: true },
    { key: 'dias', header: 'Días', render: (r) => r.dias > 0 ? <span className="font-medium text-rose-600">{r.dias} vencido</span> : <span className="text-slate-400">{Math.abs(r.dias)} por vencer</span>, value: (r) => r.dias, sortable: true, align: 'right' },
    { key: 'tramo', header: 'Antigüedad', render: (r) => <Badge color={r.tramo === 'Por vencer' ? 'gray' : r.tramo === '1-30 días' ? 'yellow' : r.tramo === '31-60 días' ? 'orange' : 'red'}>{r.tramo}</Badge> },
    { key: 'saldo', header: 'Saldo', render: (r) => <span className="font-semibold">{fmtMoney(r.saldo, sim)}</span>, value: (r) => r.saldo, sortable: true, align: 'right' },
  ]

  return (
    <div>
      <PageHeader title="Cuentas por pagar" subtitle="Obligaciones con proveedores y proyección de pagos" />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total por pagar" value={fmtMoneyCompact(sumBy(filas, (f) => f.saldo), sim)} tone="amber" hint={`${filas.length} facturas abiertas`} />
        <StatCard label="Vencido" value={fmtMoneyCompact(sumBy(filas.filter((f) => f.dias > 0), (f) => f.saldo), sim)} tone="red" />
        <StatCard label="Vence en 7 días" value={fmtMoneyCompact(sumBy(filas.filter((f) => f.dias <= 0 && f.f.vencimiento <= addDays(hoy, 7)), (f) => f.saldo), sim)} tone="blue" />
        <StatCard label="Disponible en bancos" value={fmtMoneyCompact(sumBy(s.cuentasFinancieras.filter((c) => c.tipo === 'banco'), (c) => selectores.saldoCuenta(s, c.id)), sim)} tone="green" />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Antigüedad de deuda</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={antiguedad}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="tramo" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1e6)}M`} width={54} />
                <Tooltip formatter={(v: number) => fmtMoney(v, sim)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="monto" name="Saldo" radius={[4, 4, 0, 0]}>{antiguedad.map((a, i) => <Cell key={a.tramo} fill={['#94a3b8', '#fbbf24', '#f97316', '#ef4444'][i]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Proyección de pagos · próximas 4 semanas</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={proyeccion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1e6)}M`} width={54} />
                <Tooltip formatter={(v: number) => fmtMoney(v, sim)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="monto" name="A pagar" fill="#3f5ff5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <DataTable rows={filas} columns={columns} searchKeys={(r) => `${r.f.numero} ${r.proveedor}`} exportName="cuentas-por-pagar" pageSize={20} onRowClick={() => navigate('/compras/facturas')} rowClassName={(r) => r.dias > 30 ? 'bg-rose-50/40' : ''} />
    </div>
  )
}
