import { useMemo, useState } from 'react'
import { useERP } from '@/store/erp'
import { PageHeader, StatCard, Select, Field, Avatar, Badge } from '@/components/ui'
import { fmtDate, today, cn, downloadCSV } from '@/lib/utils'
import { Download } from 'lucide-react'

const estadoStyle: Record<string, string> = {
  presente: 'bg-emerald-100 text-emerald-700', tarde: 'bg-amber-100 text-amber-700', ausente: 'bg-rose-100 text-rose-700',
  vacaciones: 'bg-sky-100 text-sky-700', licencia: 'bg-violet-100 text-violet-700', feriado: 'bg-slate-100 text-slate-500',
}
const abrev: Record<string, string> = { presente: 'P', tarde: 'T', ausente: 'A', vacaciones: 'V', licencia: 'L', feriado: 'F' }

export default function Asistencia() {
  const s = useERP()
  const [sucursal, setSucursal] = useState('')
  const fechas = useMemo(() => [...new Set(s.asistencias.map((a) => a.fecha))].sort().slice(-15), [s.asistencias])
  const empleados = s.empleados.filter((e) => e.estado !== 'baja' && (!sucursal || e.sucursalId === sucursal))

  const stats = useMemo(() => {
    const hoyA = s.asistencias.filter((a) => a.fecha === fechas.at(-1))
    const mes = s.asistencias.filter((a) => a.fecha.slice(0, 7) === today().slice(0, 7))
    return {
      presentes: hoyA.filter((a) => a.estado === 'presente').length,
      tardanzas: hoyA.filter((a) => a.estado === 'tarde').length,
      ausentes: hoyA.filter((a) => a.estado === 'ausente').length,
      tasaAsistencia: mes.length ? Math.round((mes.filter((a) => ['presente', 'tarde'].includes(a.estado)).length / mes.length) * 100) : 0,
      tardanzasMes: mes.filter((a) => a.estado === 'tarde').length,
    }
  }, [s.asistencias, fechas])

  const get = (empId: string, fecha: string) => s.asistencias.find((a) => a.empleadoId === empId && a.fecha === fecha)
  const exportar = () => downloadCSV('asistencia.csv', s.asistencias.map((a) => ({ Fecha: a.fecha, Empleado: `${s.empleados.find((e) => e.id === a.empleadoId)?.nombre} ${s.empleados.find((e) => e.id === a.empleadoId)?.apellido}`, Estado: a.estado, Entrada: a.entrada ?? '', Salida: a.salida ?? '' })))

  return (
    <div>
      <PageHeader title="Control de asistencia" subtitle="Registro diario de entradas, salidas y ausencias" actions={<><Select className="w-48" value={sucursal} onChange={setSucursal} placeholder="Todas las sucursales" options={s.sucursales.map((x) => ({ value: x.id, label: x.nombre }))} /><button className="btn-secondary" onClick={exportar}><Download size={15} /> Exportar</button></>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Presentes hoy" value={String(stats.presentes)} tone="green" />
        <StatCard label="Tardanzas hoy" value={String(stats.tardanzas)} tone="amber" />
        <StatCard label="Ausentes hoy" value={String(stats.ausentes)} tone="red" />
        <StatCard label="Tasa de asistencia (mes)" value={`${stats.tasaAsistencia}%`} tone="blue" />
        <StatCard label="Tardanzas del mes" value={String(stats.tardanzasMes)} />
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {Object.entries(abrev).map(([k, v]) => <span key={k} className={cn('rounded px-2 py-1 font-medium', estadoStyle[k])}>{v} = {k}</span>)}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th className="sticky left-0 bg-slate-50">Empleado</th>
              {fechas.map((f) => <th key={f} className="text-center">{f.slice(8)}/{f.slice(5, 7)}</th>)}
              <th className="text-center">% Asist.</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map((e) => {
              const regs = fechas.map((f) => get(e.id, f))
              const pres = regs.filter((r) => r && ['presente', 'tarde'].includes(r.estado)).length
              const pct = fechas.length ? Math.round((pres / fechas.length) * 100) : 0
              return (
                <tr key={e.id}>
                  <td className="sticky left-0 bg-white"><div className="flex items-center gap-2"><Avatar name={`${e.nombre} ${e.apellido}`} size="sm" /><div className="min-w-0"><div className="truncate text-sm font-medium text-slate-800">{e.nombre} {e.apellido}</div><div className="truncate text-[11px] text-slate-500">{s.cargos.find((c) => c.id === e.cargoId)?.nombre}</div></div></div></td>
                  {regs.map((r, i) => (
                    <td key={i} className="text-center">
                      {r ? <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold', estadoStyle[r.estado])} title={`${r.estado}${r.entrada ? ` · ${r.entrada}-${r.salida}` : ''}`}>{abrev[r.estado]}</span> : <span className="text-slate-200">·</span>}
                    </td>
                  ))}
                  <td className="text-center"><Badge color={pct >= 95 ? 'green' : pct >= 85 ? 'yellow' : 'red'}>{pct}%</Badge></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">Mostrando los últimos {fechas.length} días hábiles registrados hasta {fmtDate(fechas.at(-1))}.</p>
    </div>
  )
}
