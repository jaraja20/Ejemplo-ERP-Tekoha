import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useERP } from '@/store/erp'
import type { Asiento, LineaAsiento } from '@/types'
import { PageHeader, DataTable, Modal, Field, Select, Badge, StatCard, Alert, type Column } from '@/components/ui'
import { fmtMoneyCompact, fmtMoney, fmtDate, sumBy, today } from '@/lib/utils'

export default function Asientos() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const [nuevo, setNuevo] = useState(false)
  const [detalle, setDetalle] = useState<Asiento | null>(null)
  const [origen, setOrigen] = useState('')
  const [form, setForm] = useState({ fecha: today(), concepto: '' })
  const [lineas, setLineas] = useState<LineaAsiento[]>([{ cuentaId: '', debe: 0, haber: 0 }, { cuentaId: '', debe: 0, haber: 0 }])

  const imputables = s.planCuentas.filter((c) => c.imputable)
  const cuentaLabel = (id: string) => { const c = s.planCuentas.find((x) => x.id === id); return c ? `${c.codigo} — ${c.nombre}` : id }
  const rows = s.asientos.filter((a) => !origen || a.origen === origen).slice().reverse()
  const totalDebe = sumBy(lineas, (l) => l.debe)
  const totalHaber = sumBy(lineas, (l) => l.haber)
  const balanceado = Math.abs(totalDebe - totalHaber) < 1 && totalDebe > 0

  const mes = today().slice(0, 7)
  const stats = useMemo(() => ({
    total: s.asientos.length,
    mes: s.asientos.filter((a) => a.fecha.slice(0, 7) === mes).length,
    movimiento: sumBy(s.asientos.filter((a) => a.fecha.slice(0, 7) === mes), (a) => sumBy(a.lineas, (l) => l.debe)),
  }), [s.asientos, mes])

  const columns: Column<Asiento>[] = [
    { key: 'numero', header: 'N°', render: (r) => <span className="font-mono text-xs font-medium">{r.numero}</span>, value: (r) => r.numero, sortable: true },
    { key: 'fecha', header: 'Fecha', render: (r) => fmtDate(r.fecha), value: (r) => r.fecha, sortable: true },
    { key: 'concepto', header: 'Concepto', value: (r) => r.concepto },
    { key: 'origen', header: 'Origen', render: (r) => <Badge color={r.origen === 'manual' ? 'gray' : r.origen === 'venta' ? 'green' : r.origen === 'compra' ? 'blue' : r.origen === 'sueldos' ? 'purple' : 'indigo'}>{r.origen}</Badge> },
    { key: 'lineas', header: 'Líneas', render: (r) => r.lineas.length, align: 'center' },
    { key: 'importe', header: 'Importe', render: (r) => fmtMoney(sumBy(r.lineas, (l) => l.debe), sim), value: (r) => sumBy(r.lineas, (l) => l.debe), sortable: true, align: 'right' },
  ]

  const guardar = () => {
    if (!balanceado || !form.concepto) return
    s.crearAsiento({ fecha: form.fecha, concepto: form.concepto, origen: 'manual', lineas: lineas.filter((l) => l.cuentaId && (l.debe || l.haber)) })
    setNuevo(false)
    setLineas([{ cuentaId: '', debe: 0, haber: 0 }, { cuentaId: '', debe: 0, haber: 0 }])
    setForm({ fecha: today(), concepto: '' })
  }
  const setL = (i: number, patch: Partial<LineaAsiento>) => setLineas(lineas.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  return (
    <div>
      <PageHeader title="Libro diario" subtitle="Asientos contables generados automáticamente por ventas, compras, cobros, pagos y sueldos" actions={<button className="btn-primary" onClick={() => setNuevo(true)}><Plus size={16} /> Asiento manual</button>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Asientos registrados" value={String(stats.total)} />
        <StatCard label="Asientos del mes" value={String(stats.mes)} tone="blue" />
        <StatCard label="Movimiento del mes (debe)" value={fmtMoneyCompact(stats.movimiento, sim)} tone="green" />
      </div>
      <DataTable rows={rows} columns={columns} searchKeys={(r) => `${r.numero} ${r.concepto} ${r.referencia ?? ''}`} onRowClick={setDetalle} exportName="libro-diario" pageSize={20}
        toolbar={<Select className="w-44" value={origen} onChange={setOrigen} placeholder="Todos los orígenes" options={['manual', 'venta', 'compra', 'cobro', 'pago', 'sueldos', 'apertura'].map((o) => ({ value: o, label: o[0].toUpperCase() + o.slice(1) }))} />} />

      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={`Asiento N° ${detalle?.numero ?? ''}`} size="md">
        {detalle && (
          <div>
            <div className="mb-3 text-sm"><div className="font-semibold text-slate-800">{detalle.concepto}</div><div className="text-slate-500">{fmtDate(detalle.fecha)} · Origen: {detalle.origen} {detalle.referencia && `· Ref. ${detalle.referencia}`}</div></div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Cuenta</th><th className="text-right">Debe</th><th className="text-right">Haber</th></tr></thead>
                <tbody>
                  {detalle.lineas.map((l, i) => (
                    <tr key={i}><td className="text-sm">{cuentaLabel(l.cuentaId)}</td><td className="num">{l.debe ? fmtMoney(l.debe, sim) : ''}</td><td className="num">{l.haber ? fmtMoney(l.haber, sim) : ''}</td></tr>
                  ))}
                  <tr className="bg-slate-50 font-bold"><td>Totales</td><td className="num">{fmtMoney(sumBy(detalle.lineas, (l) => l.debe), sim)}</td><td className="num">{fmtMoney(sumBy(detalle.lineas, (l) => l.haber), sim)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Nuevo asiento manual" size="lg" footer={<><button className="btn-secondary" onClick={() => setNuevo(false)}>Cancelar</button><button className="btn-primary" onClick={guardar} disabled={!balanceado}>Registrar asiento</button></>}>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Field label="Fecha"><input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
          <Field label="Concepto" className="sm:col-span-2"><input className="input" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} placeholder="Ej: Depreciación mensual de rodados" /></Field>
        </div>
        <div className="table-wrap mb-3">
          <table className="table">
            <thead><tr><th>Cuenta</th><th className="w-40 text-right">Debe</th><th className="w-40 text-right">Haber</th><th className="w-10"></th></tr></thead>
            <tbody>
              {lineas.map((l, i) => (
                <tr key={i}>
                  <td><Select value={l.cuentaId} onChange={(v) => setL(i, { cuentaId: v })} placeholder="Seleccionar cuenta..." options={imputables.map((c) => ({ value: c.id, label: `${c.codigo} — ${c.nombre}` }))} /></td>
                  <td><input type="number" className="input py-1 text-right" value={l.debe || ''} onChange={(e) => setL(i, { debe: Number(e.target.value), haber: 0 })} /></td>
                  <td><input type="number" className="input py-1 text-right" value={l.haber || ''} onChange={(e) => setL(i, { haber: Number(e.target.value), debe: 0 })} /></td>
                  <td><button className="btn-ghost btn-sm text-rose-500" onClick={() => setLineas(lineas.filter((_, j) => j !== i))}><Trash2 size={13} /></button></td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold"><td>Totales</td><td className="num">{fmtMoney(totalDebe, sim)}</td><td className="num">{fmtMoney(totalHaber, sim)}</td><td></td></tr>
            </tbody>
          </table>
        </div>
        <button className="btn-secondary btn-sm mb-3" onClick={() => setLineas([...lineas, { cuentaId: '', debe: 0, haber: 0 }])}><Plus size={14} /> Agregar línea</button>
        {!balanceado && <Alert tipo="warning">El asiento debe estar balanceado: la suma del debe debe igualar la del haber. Diferencia actual: {fmtMoney(Math.abs(totalDebe - totalHaber), sim)}</Alert>}
        {balanceado && <Alert tipo="success">Asiento balanceado y listo para registrar.</Alert>}
      </Modal>
    </div>
  )
}
