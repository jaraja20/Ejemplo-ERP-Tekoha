import { useState } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { useERP } from '@/store/erp'
import type { Vacacion } from '@/types'
import { PageHeader, DataTable, EstadoBadge, Modal, Field, Select, StatCard, Avatar, type Column } from '@/components/ui'
import { fmtDate, daysBetween, today, uid, sumBy, addDays } from '@/lib/utils'

export default function Vacaciones() {
  const s = useERP()
  const [nuevo, setNuevo] = useState(false)
  const [form, setForm] = useState({ empleadoId: '', desde: today(), hasta: addDays(today(), 11), motivo: 'Vacaciones anuales' })
  const emp = (id: string) => s.empleados.find((e) => e.id === id)

  const columns: Column<Vacacion>[] = [
    { key: 'empleado', header: 'Empleado', render: (r) => { const e = emp(r.empleadoId); return <div className="flex items-center gap-2"><Avatar name={`${e?.nombre} ${e?.apellido}`} size="sm" /><div><div className="font-medium text-slate-800">{e?.nombre} {e?.apellido}</div><div className="text-xs text-slate-500">{s.cargos.find((c) => c.id === e?.cargoId)?.nombre}</div></div></div> }, value: (r) => emp(r.empleadoId)?.apellido ?? '' },
    { key: 'desde', header: 'Desde', render: (r) => fmtDate(r.desde), value: (r) => r.desde, sortable: true },
    { key: 'hasta', header: 'Hasta', render: (r) => fmtDate(r.hasta), value: (r) => r.hasta, sortable: true },
    { key: 'dias', header: 'Días', render: (r) => r.dias, value: (r) => r.dias, sortable: true, align: 'center' },
    { key: 'motivo', header: 'Motivo', render: (r) => r.motivo ?? '—' },
    { key: 'estado', header: 'Estado', render: (r) => <EstadoBadge estado={r.estado} /> },
    { key: 'acciones', header: '', render: (r) => r.estado === 'solicitada' ? (
      <div className="flex gap-1">
        <button className="btn-ghost btn-sm text-emerald-600" onClick={(e) => { e.stopPropagation(); s.update('vacaciones', r.id, { estado: 'aprobada' }); s.registrarLog('RRHH', 'Aprobó vacaciones', `${emp(r.empleadoId)?.nombre} ${r.dias} días`); s.toast('Vacaciones aprobadas') }}><Check size={15} /></button>
        <button className="btn-ghost btn-sm text-rose-600" onClick={(e) => { e.stopPropagation(); s.update('vacaciones', r.id, { estado: 'rechazada' }); s.toast('Solicitud rechazada', 'info') }}><X size={15} /></button>
      </div>
    ) : null },
  ]
  const guardar = () => {
    if (!form.empleadoId) return
    const dias = daysBetween(form.desde, form.hasta) + 1
    s.add('vacaciones', { id: uid('vc'), empleadoId: form.empleadoId, desde: form.desde, hasta: form.hasta, dias, estado: 'solicitada', motivo: form.motivo } as Vacacion)
    s.toast('Solicitud registrada')
    setNuevo(false)
  }
  const pendientes = s.vacaciones.filter((v) => v.estado === 'solicitada')
  const enCurso = s.vacaciones.filter((v) => v.estado === 'aprobada' && v.desde <= today() && v.hasta >= today())

  return (
    <div>
      <PageHeader title="Vacaciones y licencias" subtitle="Solicitudes, aprobaciones y calendario del equipo" actions={<button className="btn-primary" onClick={() => setNuevo(true)}><Plus size={16} /> Nueva solicitud</button>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Solicitudes pendientes" value={String(pendientes.length)} tone="amber" />
        <StatCard label="De vacaciones ahora" value={String(enCurso.length)} tone="blue" hint={enCurso.map((v) => emp(v.empleadoId)?.nombre).join(', ')} />
        <StatCard label="Días otorgados (año)" value={String(sumBy(s.vacaciones.filter((v) => v.estado === 'aprobada'), (v) => v.dias))} />
        <StatCard label="Empleados con derecho" value={String(s.empleados.filter((e) => e.estado !== 'baja' && daysBetween(e.fechaIngreso, today()) > 365).length)} tone="green" hint="Más de 1 año de antigüedad" />
      </div>
      <DataTable rows={s.vacaciones} columns={columns} searchKeys={(r) => `${emp(r.empleadoId)?.nombre} ${emp(r.empleadoId)?.apellido} ${r.estado}`} exportName="vacaciones" />

      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Nueva solicitud de vacaciones" size="sm" footer={<><button className="btn-secondary" onClick={() => setNuevo(false)}>Cancelar</button><button className="btn-primary" onClick={guardar}>Registrar solicitud</button></>}>
        <div className="grid gap-3">
          <Field label="Empleado"><Select value={form.empleadoId} onChange={(v) => setForm({ ...form, empleadoId: v })} placeholder="Seleccionar..." options={s.empleados.filter((e) => e.estado !== 'baja').map((e) => ({ value: e.id, label: `${e.nombre} ${e.apellido} — ${e.legajo}` }))} /></Field>
          <Field label="Desde"><input type="date" className="input" value={form.desde} onChange={(e) => setForm({ ...form, desde: e.target.value })} /></Field>
          <Field label="Hasta" hint={`Total: ${daysBetween(form.desde, form.hasta) + 1} días`}><input type="date" className="input" value={form.hasta} onChange={(e) => setForm({ ...form, hasta: e.target.value })} /></Field>
          <Field label="Motivo"><Select value={form.motivo} onChange={(v) => setForm({ ...form, motivo: v })} options={['Vacaciones anuales', 'Licencia médica', 'Licencia por maternidad/paternidad', 'Permiso especial', 'Viaje familiar'].map((m) => ({ value: m, label: m }))} /></Field>
        </div>
      </Modal>
    </div>
  )
}
