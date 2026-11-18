import { useState } from 'react'
import { Plus, Check, Trash2, Clock } from 'lucide-react'
import { useERP } from '@/store/erp'
import type { Tarea } from '@/types'
import { PageHeader, StatCard, Modal, Field, Select, Badge, Avatar, EmptyState } from '@/components/ui'
import { fmtDate, today, uid, cn } from '@/lib/utils'

const columnas: { estado: Tarea['estado']; label: string }[] = [
  { estado: 'pendiente', label: 'Pendientes' }, { estado: 'en_progreso', label: 'En progreso' }, { estado: 'completada', label: 'Completadas' },
]

export default function Tareas() {
  const s = useERP()
  const [nuevo, setNuevo] = useState(false)
  const [filtroMio, setFiltroMio] = useState(false)
  const [form, setForm] = useState({ titulo: '', descripcion: '', asignadoId: s.usuarioActual?.id ?? 'u01', fechaLimite: today(), prioridad: 'media' as Tarea['prioridad'], modulo: 'Ventas' })

  const tareas = s.tareas.filter((t) => !filtroMio || t.asignadoId === s.usuarioActual?.id)
  const vencidas = tareas.filter((t) => t.estado !== 'completada' && t.fechaLimite < today())

  const guardar = () => {
    if (!form.titulo) return
    s.add('tareas', { ...form, id: uid('tk'), estado: 'pendiente' } as Tarea)
    s.toast('Tarea creada')
    setNuevo(false)
    setForm({ ...form, titulo: '', descripcion: '' })
  }

  return (
    <div>
      <PageHeader title="Tareas" subtitle="Pendientes del equipo por módulo y prioridad" actions={<><button className={cn('btn-sm rounded-lg border px-3', filtroMio ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600')} onClick={() => setFiltroMio(!filtroMio)}>Solo mis tareas</button><button className="btn-primary" onClick={() => setNuevo(true)}><Plus size={16} /> Nueva tarea</button></>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pendientes" value={String(tareas.filter((t) => t.estado === 'pendiente').length)} tone="amber" />
        <StatCard label="En progreso" value={String(tareas.filter((t) => t.estado === 'en_progreso').length)} tone="blue" />
        <StatCard label="Vencidas" value={String(vencidas.length)} tone="red" icon={<Clock size={20} />} />
        <StatCard label="Completadas" value={String(tareas.filter((t) => t.estado === 'completada').length)} tone="green" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {columnas.map((col) => {
          const items = tareas.filter((t) => t.estado === col.estado)
          return (
            <div key={col.estado} className="card p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-slate-800">{col.label}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((t) => {
                  const u = s.usuarios.find((x) => x.id === t.asignadoId)
                  const vencida = t.estado !== 'completada' && t.fechaLimite < today()
                  return (
                    <div key={t.id} className={cn('rounded-lg border p-3', vencida ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200')}>
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn('text-sm font-medium', t.estado === 'completada' ? 'text-slate-400 line-through' : 'text-slate-800')}>{t.titulo}</span>
                        <Badge color={t.prioridad === 'alta' ? 'red' : t.prioridad === 'media' ? 'yellow' : 'gray'}>{t.prioridad}</Badge>
                      </div>
                      {t.descripcion && <p className="mt-1 text-xs text-slate-500">{t.descripcion}</p>}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Avatar name={u?.nombre ?? '?'} size="sm" />
                          <span className="text-[11px] text-slate-500">{u?.nombre.split(' ')[0]}</span>
                        </div>
                        <span className={cn('text-[11px]', vencida ? 'font-medium text-rose-600' : 'text-slate-400')}>{fmtDate(t.fechaLimite)}</span>
                      </div>
                      <div className="mt-2 flex gap-1 border-t border-slate-100 pt-2">
                        {t.estado === 'pendiente' && <button className="btn-ghost btn-sm text-brand-600" onClick={() => s.update('tareas', t.id, { estado: 'en_progreso' })}>Iniciar</button>}
                        {t.estado === 'en_progreso' && <button className="btn-ghost btn-sm text-emerald-600" onClick={() => { s.update('tareas', t.id, { estado: 'completada' }); s.toast('Tarea completada') }}><Check size={13} /> Completar</button>}
                        {t.estado === 'completada' && <button className="btn-ghost btn-sm text-slate-500" onClick={() => s.update('tareas', t.id, { estado: 'pendiente' })}>Reabrir</button>}
                        <span className="ml-auto text-[10px] text-slate-400">{t.modulo}</span>
                        <button className="btn-ghost btn-sm text-rose-400" onClick={() => s.remove('tareas', t.id)}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  )
                })}
                {items.length === 0 && <EmptyState title="Sin tareas" />}
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Nueva tarea" size="sm" footer={<><button className="btn-secondary" onClick={() => setNuevo(false)}>Cancelar</button><button className="btn-primary" onClick={guardar}>Crear tarea</button></>}>
        <div className="grid gap-3">
          <Field label="Título"><input className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></Field>
          <Field label="Descripción"><textarea className="input" rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></Field>
          <Field label="Asignar a"><Select value={form.asignadoId} onChange={(v) => setForm({ ...form, asignadoId: v })} options={s.usuarios.filter((u) => u.activo).map((u) => ({ value: u.id, label: u.nombre }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prioridad"><Select value={form.prioridad} onChange={(v) => setForm({ ...form, prioridad: v as Tarea['prioridad'] })} options={[{ value: 'alta', label: 'Alta' }, { value: 'media', label: 'Media' }, { value: 'baja', label: 'Baja' }]} /></Field>
            <Field label="Fecha límite"><input type="date" className="input" value={form.fechaLimite} onChange={(e) => setForm({ ...form, fechaLimite: e.target.value })} /></Field>
          </div>
          <Field label="Módulo"><Select value={form.modulo} onChange={(v) => setForm({ ...form, modulo: v })} options={['Ventas', 'Compras', 'Inventario', 'Finanzas', 'Contabilidad', 'RRHH', 'Configuración'].map((m) => ({ value: m, label: m }))} /></Field>
        </div>
      </Modal>
    </div>
  )
}
