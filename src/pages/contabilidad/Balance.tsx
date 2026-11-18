import { useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { useERP } from '@/store/erp'
import { PageHeader, Tabs, StatCard, Field, Alert } from '@/components/ui'
import { fmtMoneyCompact, fmtMoney, sumBy, today } from '@/lib/utils'
import type { TipoCuentaContable } from '@/types'

export default function Balance() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const año = new Date().getFullYear()
  const [tab, setTab] = useState<'situacion' | 'resultados' | 'sumas'>('situacion')
  const [desde, setDesde] = useState(`${año}-01-01`)
  const [hasta, setHasta] = useState(today())

  /**
   * El balance general muestra saldos ACUMULADOS desde el inicio de las operaciones
   * hasta la fecha de corte: es una foto patrimonial, no un flujo. El estado de
   * resultados, en cambio, sí corresponde al rango desde/hasta elegido.
   */
  const acumular = (filtro: (fecha: string) => boolean) => {
    const map: Record<string, { debe: number; haber: number }> = {}
    s.planCuentas.forEach((c) => (map[c.id] = { debe: 0, haber: 0 }))
    s.asientos.filter((a) => filtro(a.fecha)).forEach((a) => a.lineas.forEach((l) => {
      if (!map[l.cuentaId]) map[l.cuentaId] = { debe: 0, haber: 0 }
      map[l.cuentaId].debe += l.debe
      map[l.cuentaId].haber += l.haber
    }))
    return map
  }
  const saldosAcumulados = useMemo(() => acumular((f) => f <= hasta), [s.asientos, s.planCuentas, hasta])
  const saldosPeriodo = useMemo(() => acumular((f) => f >= desde && f <= hasta), [s.asientos, s.planCuentas, desde, hasta])

  const hacerSaldo = (mapa: Record<string, { debe: number; haber: number }>) => (id: string) => {
    const c = s.planCuentas.find((x) => x.id === id)
    const m = mapa[id] ?? { debe: 0, haber: 0 }
    if (!c) return 0
    return ['activo', 'egreso'].includes(c.tipo) ? m.debe - m.haber : m.haber - m.debe
  }
  const porTipo = (t: TipoCuentaContable, mapa: Record<string, { debe: number; haber: number }>) => {
    const fn = hacerSaldo(mapa)
    return s.planCuentas.filter((c) => c.imputable && c.tipo === t).map((c) => ({ c, saldo: fn(c.id) })).filter((x) => Math.abs(x.saldo) > 0.5)
  }

  // Balance general: acumulado
  const activo = porTipo('activo', saldosAcumulados)
  const pasivo = porTipo('pasivo', saldosAcumulados)
  const patrimonio = porTipo('patrimonio', saldosAcumulados)
  const totalActivo = sumBy(activo, (x) => x.saldo)
  const totalPasivo = sumBy(pasivo, (x) => x.saldo)
  const totalPatrimonio = sumBy(patrimonio, (x) => x.saldo)
  const resultadoAcumulado = sumBy(porTipo('ingreso', saldosAcumulados), (x) => x.saldo) - sumBy(porTipo('egreso', saldosAcumulados), (x) => x.saldo)

  // Estado de resultados: solo el período seleccionado
  const ingresos = porTipo('ingreso', saldosPeriodo)
  const egresos = porTipo('egreso', saldosPeriodo)
  const totalIngresos = sumBy(ingresos, (x) => x.saldo)
  const totalEgresos = sumBy(egresos, (x) => x.saldo)
  const resultado = totalIngresos - totalEgresos
  const descuadre = totalActivo - (totalPasivo + totalPatrimonio + resultadoAcumulado)
  const saldos = saldosPeriodo

  const Seccion = ({ titulo, items, total }: { titulo: string; items: { c: { codigo: string; nombre: string }; saldo: number }[]; total: number }) => (
    <div className="mb-4">
      <h4 className="mb-1 border-b border-slate-300 pb-1 text-xs font-bold uppercase tracking-wide text-slate-600">{titulo}</h4>
      {items.map((x) => (
        <div key={x.c.codigo} className="flex justify-between py-1 text-sm">
          <span className="text-slate-700"><span className="mr-2 font-mono text-xs text-slate-400">{x.c.codigo}</span>{x.c.nombre}</span>
          <span className="tabular-nums">{fmtMoney(x.saldo, sim)}</span>
        </div>
      ))}
      <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-sm font-bold">
        <span>Total {titulo.toLowerCase()}</span><span className="tabular-nums">{fmtMoney(total, sim)}</span>
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader title="Estados contables" subtitle={`Balance general y estado de resultados de ${s.empresa.razonSocial}`} actions={<button className="btn-secondary no-print" onClick={() => window.print()}><Printer size={15} /> Imprimir</button>} />
      <div className="card mb-5 grid gap-3 p-4 no-print sm:grid-cols-4">
        <Field label="Desde"><input type="date" className="input" value={desde} onChange={(e) => setDesde(e.target.value)} /></Field>
        <Field label="Hasta"><input type="date" className="input" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Field>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total activo" value={fmtMoneyCompact(totalActivo, sim)} tone="blue" />
        <StatCard label="Total pasivo" value={fmtMoneyCompact(totalPasivo, sim)} tone="amber" />
        <StatCard label="Patrimonio neto" value={fmtMoneyCompact(totalPatrimonio + resultado, sim)} tone="green" />
        <StatCard label="Resultado del período" value={fmtMoneyCompact(resultado, sim)} tone={resultado >= 0 ? 'green' : 'red'} hint={`Margen: ${totalIngresos ? ((resultado / totalIngresos) * 100).toFixed(1) : 0}%`} />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'situacion', label: 'Balance general' }, { value: 'resultados', label: 'Estado de resultados' }, { value: 'sumas', label: 'Balance de sumas y saldos' }]} />

      {tab === 'situacion' && (
        <div className="card p-6">
          <div className="mb-4 text-center">
            <h2 className="text-lg font-bold text-slate-900">{s.empresa.razonSocial}</h2>
            <p className="text-sm text-slate-500">Balance general al {hasta} · Expresado en guaraníes</p>
          </div>
          {Math.abs(descuadre) > 1 && <Alert tipo="info">Diferencia de cuadre en el período seleccionado: {fmtMoney(descuadre, sim)}. Se debe a asientos previos al rango de fechas elegido; ampliá el rango desde el asiento de apertura para cuadrar.</Alert>}
          <div className="mt-4 grid gap-8 md:grid-cols-2">
            <div>
              <Seccion titulo="ACTIVO" items={activo} total={totalActivo} />
            </div>
            <div>
              <Seccion titulo="PASIVO" items={pasivo} total={totalPasivo} />
              <Seccion titulo="PATRIMONIO NETO" items={patrimonio} total={totalPatrimonio} />
              <div className="flex justify-between py-1 text-sm"><span className="text-slate-700">Resultado del ejercicio</span><span className="tabular-nums">{fmtMoney(resultado, sim)}</span></div>
              <div className="mt-2 flex justify-between border-t-2 border-slate-800 pt-2 text-base font-bold"><span>TOTAL PASIVO + PATRIMONIO</span><span className="tabular-nums">{fmtMoney(totalPasivo + totalPatrimonio + resultado, sim)}</span></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'resultados' && (
        <div className="card p-6">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-slate-900">{s.empresa.razonSocial}</h2>
            <p className="text-sm text-slate-500">Estado de resultados del {desde} al {hasta}</p>
          </div>
          <div className="mx-auto max-w-2xl">
            <Seccion titulo="INGRESOS" items={ingresos} total={totalIngresos} />
            <Seccion titulo="EGRESOS" items={egresos} total={totalEgresos} />
            <div className={`mt-4 flex justify-between rounded-lg px-4 py-3 text-base font-bold ${resultado >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              <span>{resultado >= 0 ? 'UTILIDAD DEL EJERCICIO' : 'PÉRDIDA DEL EJERCICIO'}</span>
              <span className="tabular-nums">{fmtMoney(Math.abs(resultado), sim)}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">Margen bruto</div><div className="font-bold">{totalIngresos ? (((totalIngresos - (egresos.find((e) => e.c.codigo === '5.1.01')?.saldo ?? 0)) / totalIngresos) * 100).toFixed(1) : 0}%</div></div>
              <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">Margen neto</div><div className="font-bold">{totalIngresos ? ((resultado / totalIngresos) * 100).toFixed(1) : 0}%</div></div>
              <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">Gastos / ingresos</div><div className="font-bold">{totalIngresos ? ((totalEgresos / totalIngresos) * 100).toFixed(1) : 0}%</div></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'sumas' && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Código</th><th>Cuenta</th><th>Tipo</th><th className="text-right">Debe</th><th className="text-right">Haber</th><th className="text-right">Saldo deudor</th><th className="text-right">Saldo acreedor</th></tr></thead>
            <tbody>
              {s.planCuentas.filter((c) => c.imputable && (saldos[c.id]?.debe || saldos[c.id]?.haber)).map((c) => {
                const m = saldos[c.id]
                const dif = m.debe - m.haber
                return (
                  <tr key={c.id}>
                    <td className="font-mono text-xs">{c.codigo}</td><td>{c.nombre}</td><td className="capitalize text-xs text-slate-500">{c.tipo}</td>
                    <td className="num">{fmtMoney(m.debe, sim)}</td><td className="num">{fmtMoney(m.haber, sim)}</td>
                    <td className="num">{dif > 0 ? fmtMoney(dif, sim) : ''}</td><td className="num">{dif < 0 ? fmtMoney(-dif, sim) : ''}</td>
                  </tr>
                )
              })}
              <tr className="bg-slate-100 font-bold">
                <td colSpan={3}>Totales</td>
                <td className="num">{fmtMoney(sumBy(Object.values(saldos), (m) => m.debe), sim)}</td>
                <td className="num">{fmtMoney(sumBy(Object.values(saldos), (m) => m.haber), sim)}</td>
                <td className="num">{fmtMoney(sumBy(Object.values(saldos).filter((m) => m.debe - m.haber > 0), (m) => m.debe - m.haber), sim)}</td>
                <td className="num">{fmtMoney(sumBy(Object.values(saldos).filter((m) => m.haber - m.debe > 0), (m) => m.haber - m.debe), sim)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
