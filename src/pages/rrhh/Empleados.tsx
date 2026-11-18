import { useMemo, useState } from 'react'
import { Plus, Pencil, Cake } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useERP } from '@/store/erp'
import type { Empleado } from '@/types'
import { PageHeader, DataTable, EstadoBadge, Modal, Field, Select, StatCard, Avatar, Tabs, type Column } from '@/components/ui'
import { fmtMoneyCompact, fmtMoney, fmtDate, sumBy, uid, today, daysBetween, nextNumero } from '@/lib/utils'

const vacio = (): Omit<Empleado, 'id' | 'legajo'> => ({ nombre: '', apellido: '', ci: '', email: '', telefono: '', fechaNacimiento: '1990-01-01', fechaIngreso: today(), departamentoId: 'dp02', cargoId: 'cg03', sucursalId: 's01', salario: 4200000, estado: 'activo', ips: true, cuentaBancaria: '' })

export default function Empleados() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const [tab, setTab] = useState<'lista' | 'organigrama'>('lista')
  const [form, setForm] = useState<(Omit<Empleado, 'id' | 'legajo'> & { id?: string; legajo?: string }) | null>(null)
  const [detalle, setDetalle] = useState<Empleado | null>(null)

  const activos = s.empleados.filter((e) => e.estado !== 'baja')
  const nomina = sumBy(activos, (e) => e.salario)
  const porDepto = useMemo(() => s.departamentos.map((d) => ({ name: d.nombre, value: activos.filter((e) => e.departamentoId === d.id).length, masa: sumBy(activos.filter((e) => e.departamentoId === d.id), (e) => e.salario) })).filter((x) => x.value > 0), [s.departamentos, activos])
  const colors = ['#3f5ff5', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9']
  const antiguedad = useMemo(() => {
    const tramos = [{ t: '< 1 año', min: 0, max: 365 }, { t: '1-3 años', min: 365, max: 1095 }, { t: '3-5 años', min: 1095, max: 1825 }, { t: '+5 años', min: 1825, max: 99999 }]
    return tramos.map((x) => ({ tramo: x.t, cantidad: activos.filter((e) => { const d = daysBetween(e.fechaIngreso, today()); return d >= x.min && d < x.max }).length }))
  }, [activos])
  const cumples = activos.filter((e) => { const m = e.fechaNacimiento.slice(5, 7); return m === today().slice(5, 7) })

  const columns: Column<Empleado>[] = [
    { key: 'legajo', header: 'Legajo', render: (r) => <span className="font-mono text-xs">{r.legajo}</span>, value: (r) => r.legajo, sortable: true },
    { key: 'nombre', header: 'Empleado', render: (r) => <div className="flex items-center gap-2"><Avatar name={`${r.nombre} ${r.apellido}`} size="sm" /><div><div className="font-medium text-slate-800">{r.nombre} {r.apellido}</div><div className="text-xs text-slate-500">CI {r.ci}</div></div></div>, value: (r) => `${r.apellido} ${r.nombre}`, sortable: true },
    { key: 'cargo', header: 'Cargo', render: (r) => <div><div>{s.cargos.find((c) => c.id === r.cargoId)?.nombre}</div><div className="text-xs text-slate-500">{s.departamentos.find((d) => d.id === r.departamentoId)?.nombre}</div></div> },
    { key: 'sucursal', header: 'Sucursal', render: (r) => s.sucursales.find((x) => x.id === r.sucursalId)?.nombre },
    { key: 'ingreso', header: 'Ingreso', render: (r) => <div><div>{fmtDate(r.fechaIngreso)}</div><div className="text-xs text-slate-500">{(daysBetween(r.fechaIngreso, today()) / 365).toFixed(1)} años</div></div>, value: (r) => r.fechaIngreso, sortable: true },
    { key: 'salario', header: 'Salario', render: (r) => fmtMoney(r.salario, sim), value: (r) => r.salario, sortable: true, align: 'right' },
    { key: 'estado', header: 'Estado', render: (r) => <EstadoBadge estado={r.estado} /> },
    { key: 'acciones', header: '', render: (r) => <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setForm({ ...r }) }}><Pencil size={14} /></button> },
  ]
  const guardar = () => {
    if (!form || !form.nombre) return
    if (form.id) { const { id, legajo, ...rest } = form; s.update('empleados', id, rest); s.toast('Empleado actualizado') }
    else { s.add('empleados', { ...form, id: uid('e'), legajo: nextNumero(s.empleados.map((e) => e.legajo), 'LEG-', 3) } as Empleado); s.toast('Empleado dado de alta') }
    setForm(null)
  }

  return (
    <div>
      <PageHeader title="Empleados" subtitle="Legajos, estructura organizacional y masa salarial" actions={<button className="btn-primary" onClick={() => setForm(vacio())}><Plus size={16} /> Nuevo empleado</button>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Empleados activos" value={String(activos.filter((e) => e.estado === 'activo').length)} hint={`${s.empleados.filter((e) => e.estado === 'vacaciones').length} de vacaciones · ${s.empleados.filter((e) => e.estado === 'licencia').length} de licencia`} />
        <StatCard label="Masa salarial mensual" value={fmtMoneyCompact(nomina, sim)} tone="blue" />
        <StatCard label="Costo laboral con IPS (16.5%)" value={fmtMoneyCompact(nomina * 1.165, sim)} tone="amber" />
        <StatCard label="Cumpleaños este mes" value={String(cumples.length)} icon={<Cake size={20} />} tone="green" hint={cumples.slice(0, 2).map((e) => e.nombre).join(', ')} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'lista', label: 'Listado' }, { value: 'organigrama', label: 'Estructura y análisis' }]} />

      {tab === 'lista' && <DataTable rows={s.empleados} columns={columns} searchKeys={(r) => `${r.legajo} ${r.nombre} ${r.apellido} ${r.ci} ${s.cargos.find((c) => c.id === r.cargoId)?.nombre ?? ''}`} onRowClick={setDetalle} exportName="empleados" pageSize={20} />}

      {tab === 'organigrama' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Distribución por departamento</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={porDepto} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} label={(e) => `${e.name}: ${e.value}`} labelLine={false} style={{ fontSize: 10 }}>{porDepto.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} /></PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Antigüedad del personal</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={antiguedad}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="tramo" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} width={30} /><Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Bar dataKey="cantidad" name="Empleados" fill="#3f5ff5" radius={[4, 4, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card p-4 lg:col-span-2">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Departamentos y masa salarial</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {s.departamentos.map((d) => {
                const emps = activos.filter((e) => e.departamentoId === d.id)
                const resp = s.empleados.find((e) => e.id === d.responsableId)
                return (
                  <div key={d.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-800">{d.nombre}</span><span className="text-xs text-slate-500">{emps.length} pers.</span></div>
                    {resp && <div className="mt-1 flex items-center gap-2 text-xs text-slate-500"><Avatar name={`${resp.nombre} ${resp.apellido}`} size="sm" /> {resp.nombre} {resp.apellido}</div>}
                    <div className="mt-2 text-xs text-slate-600">Masa salarial: <b>{fmtMoney(sumBy(emps, (e) => e.salario), sim)}</b></div>
                    <div className="mt-2 flex flex-wrap gap-1">{emps.map((e) => <span key={e.id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{e.nombre} {e.apellido[0]}.</span>)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar empleado' : 'Nuevo empleado'} footer={<><button className="btn-secondary" onClick={() => setForm(null)}>Cancelar</button><button className="btn-primary" onClick={guardar}>Guardar</button></>}>
        {form && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre"><input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
            <Field label="Apellido"><input className="input" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} /></Field>
            <Field label="Cédula"><input className="input" value={form.ci} onChange={(e) => setForm({ ...form, ci: e.target.value })} /></Field>
            <Field label="Fecha de nacimiento"><input type="date" className="input" value={form.fechaNacimiento} onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })} /></Field>
            <Field label="Email"><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Teléfono"><input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></Field>
            <Field label="Departamento"><Select value={form.departamentoId} onChange={(v) => setForm({ ...form, departamentoId: v })} options={s.departamentos.map((d) => ({ value: d.id, label: d.nombre }))} /></Field>
            <Field label="Cargo"><Select value={form.cargoId} onChange={(v) => { const c = s.cargos.find((x) => x.id === v); setForm({ ...form, cargoId: v, departamentoId: c?.departamentoId ?? form.departamentoId, salario: c?.salarioBase ?? form.salario }) }} options={s.cargos.map((c) => ({ value: c.id, label: c.nombre }))} /></Field>
            <Field label="Sucursal"><Select value={form.sucursalId} onChange={(v) => setForm({ ...form, sucursalId: v })} options={s.sucursales.map((x) => ({ value: x.id, label: x.nombre }))} /></Field>
            <Field label="Fecha de ingreso"><input type="date" className="input" value={form.fechaIngreso} onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })} /></Field>
            <Field label="Salario mensual"><input type="number" className="input" value={form.salario} onChange={(e) => setForm({ ...form, salario: Number(e.target.value) })} /></Field>
            <Field label="Estado"><Select value={form.estado} onChange={(v) => setForm({ ...form, estado: v as Empleado['estado'] })} options={['activo', 'vacaciones', 'licencia', 'baja'].map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }))} /></Field>
            <Field label="Cuenta bancaria" className="sm:col-span-2"><input className="input" value={form.cuentaBancaria ?? ''} onChange={(e) => setForm({ ...form, cuentaBancaria: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.ips} onChange={(e) => setForm({ ...form, ips: e.target.checked })} /> Aporta al IPS</label>
          </div>
        )}
      </Modal>

      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={detalle ? `${detalle.nombre} ${detalle.apellido}` : ''} size="md">
        {detalle && (
          <div>
            <div className="mb-4 flex items-center gap-4">
              <Avatar name={`${detalle.nombre} ${detalle.apellido}`} size="lg" />
              <div>
                <div className="text-lg font-bold text-slate-900">{detalle.nombre} {detalle.apellido}</div>
                <div className="text-sm text-slate-500">{s.cargos.find((c) => c.id === detalle.cargoId)?.nombre} · {s.departamentos.find((d) => d.id === detalle.departamentoId)?.nombre}</div>
                <div className="mt-1"><EstadoBadge estado={detalle.estado} /></div>
              </div>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div><span className="text-slate-500">Legajo:</span> {detalle.legajo}</div>
              <div><span className="text-slate-500">Cédula:</span> {detalle.ci}</div>
              <div><span className="text-slate-500">Email:</span> {detalle.email}</div>
              <div><span className="text-slate-500">Teléfono:</span> {detalle.telefono}</div>
              <div><span className="text-slate-500">Ingreso:</span> {fmtDate(detalle.fechaIngreso)}</div>
              <div><span className="text-slate-500">Antigüedad:</span> {(daysBetween(detalle.fechaIngreso, today()) / 365).toFixed(1)} años</div>
              <div><span className="text-slate-500">Salario:</span> {fmtMoney(detalle.salario, sim)}</div>
              <div><span className="text-slate-500">IPS:</span> {detalle.ips ? 'Sí' : 'No'}</div>
              <div className="sm:col-span-2"><span className="text-slate-500">Cuenta bancaria:</span> {detalle.cuentaBancaria}</div>
            </div>
            <h3 className="mb-2 mt-4 text-sm font-semibold">Asistencia últimos 10 días</h3>
            <div className="flex flex-wrap gap-1">
              {s.asistencias.filter((a) => a.empleadoId === detalle.id).slice(-10).map((a) => (
                <div key={a.id} className={`rounded px-2 py-1 text-[10px] ${a.estado === 'presente' ? 'bg-emerald-100 text-emerald-700' : a.estado === 'tarde' ? 'bg-amber-100 text-amber-700' : a.estado === 'ausente' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                  {a.fecha.slice(5)} {a.entrada ?? a.estado}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
