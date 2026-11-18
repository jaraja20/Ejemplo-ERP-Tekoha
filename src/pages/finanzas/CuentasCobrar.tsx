import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { useERP, selectores } from '@/store/erp'
import { PageHeader, StatCard, DataTable, Badge, type Column } from '@/components/ui'
import { fmtMoneyCompact, fmtMoney, fmtDate, daysBetween, today, sumBy } from '@/lib/utils'
import type { Factura } from '@/types'

interface Fila { id: string; factura: Factura; cliente: string; saldo: number; dias: number; tramo: string }

const tramos = ['Por vencer', '1-30 días', '31-60 días', '61-90 días', '+90 días']

export default function CuentasCobrar() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const navigate = useNavigate()
  const hoy = today()

  const filas = useMemo<Fila[]>(() => s.facturas
    .filter((f) => f.estado !== 'anulada' && f.estado !== 'pagada')
    .map((f) => {
      const saldo = selectores.saldoFactura(s, f)
      const dias = daysBetween(f.vencimiento, hoy)
      const tramo = dias <= 0 ? 'Por vencer' : dias <= 30 ? '1-30 días' : dias <= 60 ? '31-60 días' : dias <= 90 ? '61-90 días' : '+90 días'
      return { id: f.id, factura: f, cliente: s.clientes.find((c) => c.id === f.clienteId)?.razonSocial ?? '', saldo, dias, tramo }
    })
    .filter((x) => x.saldo > 1), [s, hoy])

  const antiguedad = tramos.map((t) => ({ tramo: t, monto: Math.round(sumBy(filas.filter((f) => f.tramo === t), (f) => f.saldo)), cantidad: filas.filter((f) => f.tramo === t).length }))
  const porCliente = useMemo(() => {
    const map: Record<string, number> = {}
    filas.forEach((f) => (map[f.factura.clienteId] = (map[f.factura.clienteId] ?? 0) + f.saldo))
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [filas])

  const columns: Column<Fila>[] = [
    { key: 'numero', header: 'Factura', render: (r) => <span className="font-mono text-xs font-medium">{r.factura.numero}</span>, value: (r) => r.factura.numero, sortable: true },
    { key: 'cliente', header: 'Cliente', value: (r) => r.cliente, sortable: true },
    { key: 'fecha', header: 'Emisión', render: (r) => fmtDate(r.factura.fecha), value: (r) => r.factura.fecha, sortable: true },
    { key: 'vencimiento', header: 'Vencimiento', render: (r) => fmtDate(r.factura.vencimiento), value: (r) => r.factura.vencimiento, sortable: true },
    { key: 'dias', header: 'Días vencido', render: (r) => r.dias > 0 ? <span className="font-medium text-rose-600">{r.dias}</span> : <span className="text-slate-400">{Math.abs(r.dias)} por vencer</span>, value: (r) => r.dias, sortable: true, align: 'right' },
    { key: 'tramo', header: 'Antigüedad', render: (r) => <Badge color={r.tramo === 'Por vencer' ? 'gray' : r.tramo === '1-30 días' ? 'yellow' : r.tramo === '31-60 días' ? 'orange' : 'red'}>{r.tramo}</Badge> },
    { key: 'saldo', header: 'Saldo', render: (r) => <span className="font-semibold">{fmtMoney(r.saldo, sim)}</span>, value: (r) => r.saldo, sortable: true, align: 'right' },
  ]

  return (
    <div>
      <PageHeader title="Cuentas por cobrar" subtitle="Antigüedad de saldos y exposición por cliente" />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total por cobrar" value={fmtMoneyCompact(sumBy(filas, (f) => f.saldo), sim)} tone="amber" hint={`${filas.length} facturas abiertas`} />
        <StatCard label="Vencido" value={fmtMoneyCompact(sumBy(filas.filter((f) => f.dias > 0), (f) => f.saldo), sim)} tone="red" />
        <StatCard label="Vencido +60 días" value={fmtMoneyCompact(sumBy(filas.filter((f) => f.dias > 60), (f) => f.saldo), sim)} tone="red" />
        <StatCard label="Por vencer" value={fmtMoneyCompact(sumBy(filas.filter((f) => f.dias <= 0), (f) => f.saldo), sim)} tone="blue" />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Antigüedad de saldos</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={antiguedad}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="tramo" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1e6)}M`} width={54} />
                <Tooltip formatter={(v: number) => fmtMoney(v, sim)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="monto" name="Saldo" radius={[4, 4, 0, 0]}>
                  {antiguedad.map((a, i) => <Cell key={a.tramo} fill={['#94a3b8', '#fbbf24', '#f97316', '#ef4444', '#991b1b'][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1 text-center">
            {antiguedad.map((a) => <div key={a.tramo}><div className="text-[10px] text-slate-500">{a.tramo}</div><div className="text-xs font-bold">{a.cantidad}</div></div>)}
          </div>
        </div>
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Mayor exposición por cliente</h3>
          <div className="space-y-2">
            {porCliente.map(([cid, monto]) => {
              const c = s.clientes.find((x) => x.id === cid)!
              const pct = (monto / (c.limiteCredito || 1)) * 100
              return (
                <button key={cid} className="w-full text-left" onClick={() => navigate(`/clientes/${cid}`)}>
                  <div className="flex items-center justify-between text-sm"><span className="truncate text-slate-700">{c.razonSocial}</span><span className="font-semibold tabular-nums">{fmtMoney(monto, sim)}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className={`h-1.5 rounded-full ${pct > 100 ? 'bg-rose-500' : pct > 70 ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                  <div className="mt-0.5 text-[10px] text-slate-400">{pct.toFixed(0)}% del límite de crédito ({fmtMoney(c.limiteCredito, sim)})</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <DataTable rows={filas} columns={columns} searchKeys={(r) => `${r.factura.numero} ${r.cliente}`} exportName="cuentas-por-cobrar" pageSize={20} onRowClick={(r) => navigate(`/facturacion/facturas?q=${r.factura.numero}`)} rowClassName={(r) => r.dias > 60 ? 'bg-rose-50/40' : ''} />
    </div>
  )
}
