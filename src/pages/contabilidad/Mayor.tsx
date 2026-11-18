import { useMemo, useState } from 'react'
import { useERP } from '@/store/erp'
import { PageHeader, Select, Field, StatCard, EmptyState } from '@/components/ui'
import { fmtMoneyCompact, fmtMoney, fmtDate, sumBy, today, downloadCSV } from '@/lib/utils'
import { Download } from 'lucide-react'

export default function Mayor() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const imputables = s.planCuentas.filter((c) => c.imputable)
  const [cuentaId, setCuentaId] = useState('pc_1.1.03')
  const año = new Date().getFullYear()
  const [desde, setDesde] = useState(`${año}-01-01`)
  const [hasta, setHasta] = useState(today())

  const cuenta = s.planCuentas.find((c) => c.id === cuentaId)
  const datos = useMemo(() => {
    const movs: { fecha: string; numero: number; concepto: string; debe: number; haber: number }[] = []
    let saldoAnterior = 0
    s.asientos.forEach((a) => {
      a.lineas.filter((l) => l.cuentaId === cuentaId).forEach((l) => {
        if (a.fecha < desde) saldoAnterior += l.debe - l.haber
        else if (a.fecha <= hasta) movs.push({ fecha: a.fecha, numero: a.numero, concepto: a.concepto, debe: l.debe, haber: l.haber })
      })
    })
    movs.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.numero - b.numero)
    let acum = saldoAnterior
    const filas = movs.map((m) => { acum += m.debe - m.haber; return { ...m, saldo: acum } })
    return { saldoAnterior, filas, totalDebe: sumBy(movs, (m) => m.debe), totalHaber: sumBy(movs, (m) => m.haber), saldoFinal: acum }
  }, [s.asientos, cuentaId, desde, hasta])

  const naturaleza = cuenta && ['activo', 'egreso'].includes(cuenta.tipo) ? 'deudora' : 'acreedora'
  const exportar = () => downloadCSV(`mayor-${cuenta?.codigo}.csv`, datos.filas.map((f) => ({ Fecha: f.fecha, Asiento: f.numero, Concepto: f.concepto, Debe: f.debe, Haber: f.haber, Saldo: f.saldo })))

  return (
    <div>
      <PageHeader title="Libro mayor" subtitle="Movimientos y saldo acumulado por cuenta contable" actions={<button className="btn-secondary" onClick={exportar}><Download size={15} /> Exportar CSV</button>} />
      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-4">
        <Field label="Cuenta" className="sm:col-span-2"><Select value={cuentaId} onChange={setCuentaId} options={imputables.map((c) => ({ value: c.id, label: `${c.codigo} — ${c.nombre}` }))} /></Field>
        <Field label="Desde"><input type="date" className="input" value={desde} onChange={(e) => setDesde(e.target.value)} /></Field>
        <Field label="Hasta"><input type="date" className="input" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Field>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo anterior" value={fmtMoneyCompact(Math.abs(datos.saldoAnterior), sim)} hint={`Cuenta de naturaleza ${naturaleza}`} />
        <StatCard label="Total debe del período" value={fmtMoneyCompact(datos.totalDebe, sim)} tone="blue" />
        <StatCard label="Total haber del período" value={fmtMoneyCompact(datos.totalHaber, sim)} tone="amber" />
        <StatCard label="Saldo final" value={fmtMoneyCompact(Math.abs(datos.saldoFinal), sim)} tone={datos.saldoFinal >= 0 ? 'green' : 'red'} hint={datos.saldoFinal >= 0 ? 'Deudor' : 'Acreedor'} />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Fecha</th><th>Asiento</th><th>Concepto</th><th className="text-right">Debe</th><th className="text-right">Haber</th><th className="text-right">Saldo</th></tr></thead>
          <tbody>
            <tr className="bg-slate-50"><td colSpan={5} className="font-medium">Saldo anterior al {fmtDate(desde)}</td><td className="num font-bold">{fmtMoney(datos.saldoAnterior, sim)}</td></tr>
            {datos.filas.map((f, i) => (
              <tr key={i}><td>{fmtDate(f.fecha)}</td><td className="font-mono text-xs">{f.numero}</td><td className="max-w-md truncate">{f.concepto}</td><td className="num">{f.debe ? fmtMoney(f.debe, sim) : ''}</td><td className="num">{f.haber ? fmtMoney(f.haber, sim) : ''}</td><td className="num font-medium">{fmtMoney(f.saldo, sim)}</td></tr>
            ))}
            {datos.filas.length === 0 && <tr><td colSpan={6}><EmptyState title="Sin movimientos en el período seleccionado" /></td></tr>}
            <tr className="bg-slate-100 font-bold"><td colSpan={3}>Totales del período</td><td className="num">{fmtMoney(datos.totalDebe, sim)}</td><td className="num">{fmtMoney(datos.totalHaber, sim)}</td><td className="num">{fmtMoney(datos.saldoFinal, sim)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
