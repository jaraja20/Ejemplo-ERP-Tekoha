import { useMemo, useState } from 'react'
import { Plus, Landmark, Banknote, Smartphone, ArrowLeftRight } from 'lucide-react'
import { useERP, selectores } from '@/store/erp'
import type { MovimientoCaja } from '@/types'
import { PageHeader, DataTable, StatCard, Modal, Field, Select, Badge, Tabs, type Column } from '@/components/ui'
import { fmtMoneyCompact, fmtMoney, fmtDate, sumBy, today } from '@/lib/utils'

const categoriasIngreso = ['Cobranza', 'Aporte de capital', 'Préstamo recibido', 'Venta de activos', 'Otros ingresos']
const categoriasEgreso = ['Pago a proveedores', 'Sueldos', 'Alquileres', 'Servicios', 'Logística', 'Marketing', 'Impuestos', 'Gastos bancarios', 'Oficina', 'Mantenimiento', 'Otros egresos']

export default function Caja() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const [cuenta, setCuenta] = useState('')
  const [tab, setTab] = useState<'todos' | 'ingreso' | 'egreso'>('todos')
  const [nuevo, setNuevo] = useState(false)
  const [form, setForm] = useState({ tipo: 'egreso' as MovimientoCaja['tipo'], cuentaId: 'cf01', cuentaDestinoId: 'cf03', categoria: 'Otros egresos', concepto: '', monto: 0, fecha: today() })

  const saldos = useMemo(() => s.cuentasFinancieras.map((c) => ({ c, saldo: selectores.saldoCuenta(s, c.id) })), [s])
  const rows = s.movimientosCaja.filter((m) => (!cuenta || m.cuentaId === cuenta || m.cuentaDestinoId === cuenta) && (tab === 'todos' || m.tipo === tab))
  const mes = today().slice(0, 7)
  const delMes = s.movimientosCaja.filter((m) => m.fecha.slice(0, 7) === mes)

  const columns: Column<MovimientoCaja>[] = [
    { key: 'fecha', header: 'Fecha', render: (r) => fmtDate(r.fecha), value: (r) => r.fecha, sortable: true },
    { key: 'cuenta', header: 'Cuenta', render: (r) => <span>{s.cuentasFinancieras.find((c) => c.id === r.cuentaId)?.nombre}{r.cuentaDestinoId && <span className="text-slate-400"> → {s.cuentasFinancieras.find((c) => c.id === r.cuentaDestinoId)?.nombre}</span>}</span> },
    { key: 'tipo', header: 'Tipo', render: (r) => <Badge color={r.tipo === 'ingreso' ? 'green' : r.tipo === 'egreso' ? 'red' : 'blue'}>{r.tipo}</Badge> },
    { key: 'categoria', header: 'Categoría', render: (r) => <span className="text-xs text-slate-600">{r.categoria}</span> },
    { key: 'concepto', header: 'Concepto', value: (r) => r.concepto },
    { key: 'referencia', header: 'Ref.', render: (r) => <span className="font-mono text-xs text-slate-400">{r.referencia ?? '—'}</span> },
    { key: 'monto', header: 'Monto', render: (r) => <span className={r.tipo === 'ingreso' ? 'font-medium text-emerald-700' : r.tipo === 'egreso' ? 'font-medium text-rose-700' : 'font-medium text-sky-700'}>{r.tipo === 'egreso' ? '-' : r.tipo === 'ingreso' ? '+' : ''} {fmtMoney(r.monto, sim)}</span>, value: (r) => r.monto, sortable: true, align: 'right' },
  ]
  const icon = (t: string) => t === 'caja' ? <Banknote size={20} /> : t === 'banco' ? <Landmark size={20} /> : <Smartphone size={20} />
  const guardar = () => {
    if (!form.concepto || form.monto <= 0) return
    s.registrarMovimientoCaja({ fecha: form.fecha, cuentaId: form.cuentaId, tipo: form.tipo, categoria: form.categoria, concepto: form.concepto, monto: form.monto, cuentaDestinoId: form.tipo === 'transferencia' ? form.cuentaDestinoId : undefined })
    setNuevo(false)
    setForm({ ...form, concepto: '', monto: 0 })
  }

  return (
    <div>
      <PageHeader title="Caja y bancos" subtitle="Saldos de cuentas y libro de movimientos" actions={<button className="btn-primary" onClick={() => setNuevo(true)}><Plus size={16} /> Registrar movimiento</button>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {saldos.map(({ c, saldo }) => (
          <StatCard key={c.id} label={c.nombre} value={fmtMoneyCompact(saldo, sim)} icon={icon(c.tipo)} tone={c.tipo === 'banco' ? 'blue' : c.tipo === 'caja' ? 'green' : 'amber'} hint={c.numero ? `Cta. ${c.numero}` : c.tipo} onClick={() => setCuenta(cuenta === c.id ? '' : c.id)} />
        ))}
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Saldo total disponible" value={fmtMoneyCompact(sumBy(saldos, (x) => x.saldo), sim)} tone="green" />
        <StatCard label="Ingresos del mes" value={fmtMoneyCompact(sumBy(delMes.filter((m) => m.tipo === 'ingreso'), (m) => m.monto), sim)} tone="blue" />
        <StatCard label="Egresos del mes" value={fmtMoneyCompact(sumBy(delMes.filter((m) => m.tipo === 'egreso'), (m) => m.monto), sim)} tone="red" />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'todos', label: 'Todos' }, { value: 'ingreso', label: 'Ingresos' }, { value: 'egreso', label: 'Egresos' }]} />
      <DataTable rows={rows} columns={columns} searchKeys={(r) => `${r.concepto} ${r.categoria} ${r.referencia ?? ''}`} exportName="movimientos-caja" pageSize={20}
        toolbar={<Select className="w-56" value={cuenta} onChange={setCuenta} placeholder="Todas las cuentas" options={s.cuentasFinancieras.map((c) => ({ value: c.id, label: c.nombre }))} />} />

      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Registrar movimiento de caja" size="sm" footer={<><button className="btn-secondary" onClick={() => setNuevo(false)}>Cancelar</button><button className="btn-primary" onClick={guardar}>Registrar</button></>}>
        <div className="grid gap-3">
          <Field label="Tipo"><Select value={form.tipo} onChange={(v) => setForm({ ...form, tipo: v as MovimientoCaja['tipo'], categoria: v === 'ingreso' ? categoriasIngreso[0] : v === 'egreso' ? categoriasEgreso[0] : 'Transferencia interna' })} options={[{ value: 'ingreso', label: 'Ingreso' }, { value: 'egreso', label: 'Egreso' }, { value: 'transferencia', label: 'Transferencia entre cuentas' }]} /></Field>
          <Field label={form.tipo === 'transferencia' ? 'Cuenta origen' : 'Cuenta'}><Select value={form.cuentaId} onChange={(v) => setForm({ ...form, cuentaId: v })} options={s.cuentasFinancieras.filter((c) => c.activa).map((c) => ({ value: c.id, label: `${c.nombre} — ${fmtMoney(selectores.saldoCuenta(s, c.id), sim)}` }))} /></Field>
          {form.tipo === 'transferencia' && <Field label="Cuenta destino"><Select value={form.cuentaDestinoId} onChange={(v) => setForm({ ...form, cuentaDestinoId: v })} options={s.cuentasFinancieras.filter((c) => c.activa).map((c) => ({ value: c.id, label: c.nombre }))} /></Field>}
          {form.tipo !== 'transferencia' && <Field label="Categoría"><Select value={form.categoria} onChange={(v) => setForm({ ...form, categoria: v })} options={(form.tipo === 'ingreso' ? categoriasIngreso : categoriasEgreso).map((c) => ({ value: c, label: c }))} /></Field>}
          <Field label="Concepto"><input className="input" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} /></Field>
          <Field label="Monto"><input type="number" className="input" value={form.monto} onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })} /></Field>
          <Field label="Fecha"><input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
        </div>
      </Modal>
      <span className="hidden"><ArrowLeftRight size={1} /></span>
    </div>
  )
}
