import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useERP } from '@/store/erp'
import type { CuentaContable, TipoCuentaContable } from '@/types'
import { PageHeader, Badge, Modal, Field, Select, StatCard } from '@/components/ui'
import { fmtMoneyCompact, fmtMoney, sumBy, uid, cn } from '@/lib/utils'

const tipoColor: Record<TipoCuentaContable, 'blue' | 'orange' | 'purple' | 'green' | 'red'> = { activo: 'blue', pasivo: 'orange', patrimonio: 'purple', ingreso: 'green', egreso: 'red' }

export default function PlanCuentas() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const [nuevo, setNuevo] = useState(false)
  const [form, setForm] = useState({ codigo: '', nombre: '', tipo: 'activo' as TipoCuentaContable, imputable: true })

  const saldos = useMemo(() => {
    const map: Record<string, number> = {}
    s.asientos.forEach((a) => a.lineas.forEach((l) => {
      const c = s.planCuentas.find((x) => x.id === l.cuentaId)
      if (!c) return
      map[l.cuentaId] = (map[l.cuentaId] ?? 0) + (['activo', 'egreso'].includes(c.tipo) ? l.debe - l.haber : l.haber - l.debe)
    }))
    return map
  }, [s.asientos, s.planCuentas])

  const nivel = (c: CuentaContable) => c.codigo.split('.').length - 1
  const guardar = () => {
    if (!form.codigo || !form.nombre) return
    s.add('planCuentas', { ...form, id: uid('pc') } as CuentaContable)
    s.toast('Cuenta creada')
    setNuevo(false)
    setForm({ codigo: '', nombre: '', tipo: 'activo', imputable: true })
  }
  const totalPorTipo = (t: TipoCuentaContable) => sumBy(s.planCuentas.filter((c) => c.tipo === t && c.imputable), (c) => saldos[c.id] ?? 0)

  return (
    <div>
      <PageHeader title="Plan de cuentas" subtitle="Estructura contable jerárquica con saldos acumulados" actions={<button className="btn-primary" onClick={() => setNuevo(true)}><Plus size={16} /> Nueva cuenta</button>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(['activo', 'pasivo', 'patrimonio', 'ingreso', 'egreso'] as TipoCuentaContable[]).map((t) => (
          <StatCard key={t} label={t[0].toUpperCase() + t.slice(1)} value={fmtMoneyCompact(totalPorTipo(t), sim)} hint={`${s.planCuentas.filter((c) => c.tipo === t).length} cuentas`} />
        ))}
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th className="text-center">Imputable</th><th className="text-right">Saldo acumulado</th></tr></thead>
          <tbody>
            {s.planCuentas.map((c) => (
              <tr key={c.id} className={cn(!c.imputable && 'bg-slate-50/70 font-semibold')}>
                <td className="font-mono text-xs">{c.codigo}</td>
                <td style={{ paddingLeft: `${16 + nivel(c) * 20}px` }} className={cn(!c.imputable && 'uppercase tracking-wide text-slate-700')}>{c.nombre}</td>
                <td><Badge color={tipoColor[c.tipo]}>{c.tipo}</Badge></td>
                <td className="text-center text-xs">{c.imputable ? 'Sí' : 'No'}</td>
                <td className="num">{c.imputable && saldos[c.id] ? fmtMoney(saldos[c.id], sim) : <span className="text-slate-300">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Nueva cuenta contable" size="sm" footer={<><button className="btn-secondary" onClick={() => setNuevo(false)}>Cancelar</button><button className="btn-primary" onClick={guardar}>Crear cuenta</button></>}>
        <div className="grid gap-3">
          <Field label="Código" hint="Ej: 5.1.12"><input className="input" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></Field>
          <Field label="Nombre"><input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
          <Field label="Tipo"><Select value={form.tipo} onChange={(v) => setForm({ ...form, tipo: v as TipoCuentaContable })} options={['activo', 'pasivo', 'patrimonio', 'ingreso', 'egreso'].map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }))} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.imputable} onChange={(e) => setForm({ ...form, imputable: e.target.checked })} /> Cuenta imputable (acepta asientos)</label>
        </div>
      </Modal>
    </div>
  )
}
