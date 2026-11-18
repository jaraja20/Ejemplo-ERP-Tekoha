import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil } from 'lucide-react'
import { useERP, selectores } from '@/store/erp'
import type { Cliente } from '@/types'
import { PageHeader, DataTable, Badge, Modal, Field, Select, StatCard, Avatar, type Column } from '@/components/ui'
import { fmtMoneyCompact, fmtMoney, totales, today, uid, sumBy, nextNumero } from '@/lib/utils'

const vacio = (): Omit<Cliente, 'id' | 'codigo' | 'creadoEn'> => ({ tipo: 'empresa', razonSocial: '', ruc: '', email: '', telefono: '', direccion: '', ciudad: 'Asunción', contacto: '', segmento: 'minorista', limiteCredito: 5000000, diasCredito: 0, activo: true, notas: '' })

export default function Clientes() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const navigate = useNavigate()
  const [form, setForm] = useState<(Omit<Cliente, 'id' | 'codigo' | 'creadoEn'> & { id?: string }) | null>(null)

  const saldos = useMemo(() => {
    const map: Record<string, { saldo: number; compras: number }> = {}
    s.clientes.forEach((c) => (map[c.id] = { saldo: 0, compras: 0 }))
    s.facturas.filter((f) => f.estado !== 'anulada').forEach((f) => {
      if (!map[f.clienteId]) return
      map[f.clienteId].compras += totales(f.lineas).total
      if (f.estado !== 'pagada') map[f.clienteId].saldo += selectores.saldoFactura(s, f)
    })
    return map
  }, [s])

  const columns: Column<Cliente>[] = [
    { key: 'codigo', header: 'Código', render: (r) => <span className="font-mono text-xs">{r.codigo}</span>, value: (r) => r.codigo, sortable: true },
    { key: 'razonSocial', header: 'Razón social', render: (r) => <div className="flex items-center gap-2"><Avatar name={r.razonSocial} size="sm" /><div><div className="font-medium text-slate-800">{r.razonSocial}</div><div className="text-xs text-slate-500">{r.ruc}</div></div></div>, value: (r) => r.razonSocial, sortable: true },
    { key: 'segmento', header: 'Segmento', render: (r) => <Badge color={r.segmento === 'corporativo' ? 'purple' : r.segmento === 'mayorista' ? 'blue' : 'gray'}>{r.segmento}</Badge> },
    { key: 'ciudad', header: 'Ciudad', value: (r) => r.ciudad, sortable: true },
    { key: 'contacto', header: 'Contacto', render: (r) => <div className="text-xs"><div>{r.contacto ?? '—'}</div><div className="text-slate-500">{r.telefono}</div></div> },
    { key: 'credito', header: 'Crédito', render: (r) => <div className="text-xs"><div>{fmtMoney(r.limiteCredito, sim)}</div><div className="text-slate-500">{r.diasCredito} días</div></div>, align: 'right' },
    { key: 'compras', header: 'Compras totales', render: (r) => fmtMoney(saldos[r.id]?.compras ?? 0, sim), value: (r) => saldos[r.id]?.compras ?? 0, sortable: true, align: 'right' },
    { key: 'saldo', header: 'Saldo deudor', render: (r) => { const v = saldos[r.id]?.saldo ?? 0; return <span className={v > r.limiteCredito ? 'font-bold text-rose-600' : v > 0 ? 'font-medium text-amber-700' : 'text-slate-400'}>{fmtMoney(v, sim)}</span> }, value: (r) => saldos[r.id]?.saldo ?? 0, sortable: true, align: 'right' },
    { key: 'activo', header: 'Estado', render: (r) => <Badge color={r.activo ? 'green' : 'gray'}>{r.activo ? 'Activo' : 'Inactivo'}</Badge> },
    { key: 'acciones', header: '', render: (r) => <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setForm({ ...r }) }}><Pencil size={14} /></button> },
  ]

  const guardar = () => {
    if (!form || !form.razonSocial) return
    if (form.id) {
      const { id, ...rest } = form
      s.update('clientes', id, rest)
      s.toast('Cliente actualizado')
    } else {
      s.add('clientes', { ...form, id: uid('cl'), codigo: nextNumero(s.clientes.map((c) => c.codigo), 'CLI-', 4), creadoEn: today() } as Cliente)
      s.toast('Cliente creado')
    }
    setForm(null)
  }

  return (
    <div>
      <PageHeader title="Clientes" subtitle="Cartera de clientes, límites de crédito y saldos" actions={<button className="btn-primary" onClick={() => setForm(vacio())}><Plus size={16} /> Nuevo cliente</button>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clientes activos" value={String(s.clientes.filter((c) => c.activo).length)} />
        <StatCard label="Mayoristas y corporativos" value={String(s.clientes.filter((c) => c.segmento !== 'minorista').length)} />
        <StatCard label="Saldo total a cobrar" value={fmtMoneyCompact(sumBy(Object.values(saldos), (x) => x.saldo), sim)} tone="amber" />
        <StatCard label="Clientes sobre límite" value={String(s.clientes.filter((c) => (saldos[c.id]?.saldo ?? 0) > c.limiteCredito).length)} tone="red" />
      </div>
      <DataTable rows={s.clientes} columns={columns} searchKeys={(r) => `${r.codigo} ${r.razonSocial} ${r.ruc} ${r.ciudad} ${r.contacto ?? ''}`} onRowClick={(r) => navigate(`/clientes/${r.id}`)} exportName="clientes" />

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar cliente' : 'Nuevo cliente'} footer={<><button className="btn-secondary" onClick={() => setForm(null)}>Cancelar</button><button className="btn-primary" onClick={guardar}>Guardar</button></>}>
        {form && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tipo"><Select value={form.tipo} onChange={(v) => setForm({ ...form, tipo: v as Cliente['tipo'] })} options={[{ value: 'empresa', label: 'Empresa' }, { value: 'persona', label: 'Persona física' }]} /></Field>
            <Field label="Segmento"><Select value={form.segmento} onChange={(v) => setForm({ ...form, segmento: v as Cliente['segmento'] })} options={[{ value: 'minorista', label: 'Minorista' }, { value: 'mayorista', label: 'Mayorista' }, { value: 'corporativo', label: 'Corporativo' }]} /></Field>
            <Field label="Razón social / Nombre" className="sm:col-span-2"><input className="input" value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} /></Field>
            <Field label="RUC / CI"><input className="input" value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} /></Field>
            <Field label="Contacto"><input className="input" value={form.contacto ?? ''} onChange={(e) => setForm({ ...form, contacto: e.target.value })} /></Field>
            <Field label="Email"><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Teléfono"><input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></Field>
            <Field label="Dirección"><input className="input" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></Field>
            <Field label="Ciudad"><input className="input" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} /></Field>
            <Field label="Límite de crédito"><input type="number" className="input" value={form.limiteCredito} onChange={(e) => setForm({ ...form, limiteCredito: Number(e.target.value) })} /></Field>
            <Field label="Días de crédito"><input type="number" className="input" value={form.diasCredito} onChange={(e) => setForm({ ...form, diasCredito: Number(e.target.value) })} /></Field>
            <Field label="Notas" className="sm:col-span-2"><textarea className="input" rows={2} value={form.notas ?? ''} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Cliente activo</label>
          </div>
        )}
      </Modal>
    </div>
  )
}
