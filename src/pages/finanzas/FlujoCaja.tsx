import { useMemo, useState } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts'
import { useERP, selectores } from '@/store/erp'
import { PageHeader, StatCard, Select } from '@/components/ui'
import { fmtMoneyCompact, isoLocal, fmtMoney, mesLabel, sumBy, today, groupBy } from '@/lib/utils'

export default function FlujoCaja() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const [meses, setMeses] = useState('12')
  const n = Number(meses)

  const serie = useMemo(() => {
    const keys: string[] = []
    for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); keys.push(isoLocal(d).slice(0, 7)) }
    const base = sumBy(s.cuentasFinancieras, (c) => c.saldoInicial)
    const anteriores = s.movimientosCaja.filter((m) => m.fecha.slice(0, 7) < keys[0])
    let acumulado = base + sumBy(anteriores.filter((m) => m.tipo === 'ingreso'), (m) => m.monto) - sumBy(anteriores.filter((m) => m.tipo === 'egreso'), (m) => m.monto)
    return keys.map((k) => {
      const movs = s.movimientosCaja.filter((m) => m.fecha.slice(0, 7) === k)
      const ing = sumBy(movs.filter((m) => m.tipo === 'ingreso'), (m) => m.monto)
      const egr = sumBy(movs.filter((m) => m.tipo === 'egreso'), (m) => m.monto)
      acumulado += ing - egr
      return { mes: mesLabel(k + '-01'), ingresos: Math.round(ing), egresos: Math.round(egr), neto: Math.round(ing - egr), saldo: Math.round(acumulado) }
    })
  }, [s, n])

  const egresosPorCat = useMemo(() => {
    const desde = serie.length ? '' : ''
    const grupos = groupBy(s.movimientosCaja.filter((m) => m.tipo === 'egreso' && m.fecha >= `${new Date().getFullYear()}-01-01` + desde), (m) => m.categoria)
    const colors = ['#3f5ff5', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#0ea5e9', '#ec4899', '#22c55e', '#f97316', '#64748b', '#14b8a6']
    return Object.entries(grupos).map(([k, v], i) => ({ name: k, value: Math.round(sumBy(v, (m) => m.monto)), color: colors[i % colors.length] })).sort((a, b) => b.value - a.value)
  }, [s.movimientosCaja, serie])

  const ultimos = serie.slice(-3)
  const promedioNeto = ultimos.length ? sumBy(ultimos, (x) => x.neto) / ultimos.length : 0
  const saldoActual = sumBy(s.cuentasFinancieras, (c) => selectores.saldoCuenta(s, c.id))
  const runway = promedioNeto < 0 ? Math.floor(saldoActual / Math.abs(promedioNeto)) : null

  return (
    <div>
      <PageHeader title="Flujo de caja" subtitle="Ingresos, egresos y evolución del saldo consolidado" actions={<Select className="w-40" value={meses} onChange={setMeses} options={[{ value: '6', label: 'Últimos 6 meses' }, { value: '12', label: 'Últimos 12 meses' }, { value: '18', label: 'Últimos 18 meses' }]} />} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo consolidado actual" value={fmtMoneyCompact(saldoActual, sim)} tone="green" />
        <StatCard label="Ingresos del mes" value={fmtMoneyCompact(serie.at(-1)?.ingresos ?? 0, sim)} tone="blue" />
        <StatCard label="Egresos del mes" value={fmtMoneyCompact(serie.at(-1)?.egresos ?? 0, sim)} tone="red" />
        <StatCard label="Flujo neto promedio (3m)" value={fmtMoneyCompact(promedioNeto, sim)} tone={promedioNeto >= 0 ? 'green' : 'red'} hint={runway ? `Autonomía estimada: ${runway} meses` : 'Flujo operativo positivo'} />
      </div>

      <div className="card mb-4 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Ingresos vs egresos y saldo acumulado</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1e6)}M`} width={54} />
              <Tooltip formatter={(v: number) => fmtMoney(v, sim)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="egresos" name="Egresos" fill="#ef4444" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="saldo" name="Saldo acumulado" stroke="#3f5ff5" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Egresos por categoría · año actual</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={egresosPorCat} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                  {egresosPorCat.map((c) => <Cell key={c.name} fill={c.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtMoney(v, sim)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Detalle mensual</h3>
          <div className="max-h-72 overflow-y-auto">
            <table className="table">
              <thead><tr><th>Mes</th><th className="text-right">Ingresos</th><th className="text-right">Egresos</th><th className="text-right">Neto</th><th className="text-right">Saldo</th></tr></thead>
              <tbody>
                {[...serie].reverse().map((x) => (
                  <tr key={x.mes}>
                    <td className="font-medium">{x.mes}</td>
                    <td className="num text-emerald-700">{fmtMoney(x.ingresos, sim)}</td>
                    <td className="num text-rose-700">{fmtMoney(x.egresos, sim)}</td>
                    <td className={`num font-semibold ${x.neto >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{fmtMoney(x.neto, sim)}</td>
                    <td className="num">{fmtMoney(x.saldo, sim)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <span className="hidden">{today()}</span>
    </div>
  )
}
