import { useState } from 'react'
import { Plus, CheckCircle2, Printer, Banknote } from 'lucide-react'
import { useERP } from '@/store/erp'
import type { Liquidacion } from '@/types'
import { PageHeader, DataTable, EstadoBadge, Modal, StatCard, Field, Alert, type Column } from '@/components/ui'
import { fmtMoneyCompact, fmtMoney, fmtDate, sumBy, today, mesLabel } from '@/lib/utils'

export default function Liquidaciones() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const [detalle, setDetalle] = useState<Liquidacion | null>(null)
  const [nuevo, setNuevo] = useState(false)
  const [periodo, setPeriodo] = useState(today().slice(0, 7))
  const emp = (id: string) => s.empleados.find((e) => e.id === id)

  const tot = (l: Liquidacion) => ({
    bruto: sumBy(l.lineas, (x) => x.salarioBase + x.horasExtra + x.bonificaciones),
    ips: sumBy(l.lineas, (x) => x.ips),
    desc: sumBy(l.lineas, (x) => x.descuentos),
    neto: sumBy(l.lineas, (x) => x.neto),
  })

  const columns: Column<Liquidacion>[] = [
    { key: 'periodo', header: 'Período', render: (r) => <span className="font-medium">{mesLabel(r.periodo + '-01')}</span>, value: (r) => r.periodo, sortable: true },
    { key: 'fecha', header: 'Fecha de pago', render: (r) => fmtDate(r.fecha), value: (r) => r.fecha, sortable: true },
    { key: 'empleados', header: 'Empleados', render: (r) => r.lineas.length, align: 'center' },
    { key: 'bruto', header: 'Total bruto', render: (r) => fmtMoney(tot(r).bruto, sim), value: (r) => tot(r).bruto, sortable: true, align: 'right' },
    { key: 'ips', header: 'IPS (9%)', render: (r) => fmtMoney(tot(r).ips, sim), align: 'right' },
    { key: 'neto', header: 'Total neto', render: (r) => <span className="font-semibold">{fmtMoney(tot(r).neto, sim)}</span>, value: (r) => tot(r).neto, sortable: true, align: 'right' },
    { key: 'estado', header: 'Estado', render: (r) => <EstadoBadge estado={r.estado} /> },
  ]

  const ultima = s.liquidaciones[0]
  const promedio = s.liquidaciones.length ? sumBy(s.liquidaciones, (l) => tot(l).neto) / s.liquidaciones.length : 0

  return (
    <div>
      <PageHeader title="Liquidación de sueldos" subtitle="Nómina mensual con aportes al IPS y generación automática de asientos" actions={<button className="btn-primary" onClick={() => setNuevo(true)}><Plus size={16} /> Generar liquidación</button>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Última nómina" value={ultima ? fmtMoneyCompact(tot(ultima).neto, sim) : "—"} tone="blue" hint={ultima ? `${mesLabel(ultima.periodo + '-01')} · ${ultima.estado}` : ''} />
        <StatCard label="Promedio mensual" value={fmtMoneyCompact(promedio, sim)} />
        <StatCard label="Aporte patronal estimado (16.5%)" value={fmtMoneyCompact(ultima ? tot(ultima).bruto * 0.165 : 0, sim)} tone="amber" />
        <StatCard label="Liquidaciones registradas" value={String(s.liquidaciones.length)} />
      </div>
      <DataTable rows={s.liquidaciones} columns={columns} onRowClick={setDetalle} exportName="liquidaciones" />

      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Generar nueva liquidación" size="sm" footer={<><button className="btn-secondary" onClick={() => setNuevo(false)}>Cancelar</button><button className="btn-primary" onClick={() => { s.generarLiquidacion(periodo); setNuevo(false) }}>Generar</button></>}>
        <Field label="Período (año-mes)"><input type="month" className="input" value={periodo} onChange={(e) => setPeriodo(e.target.value)} /></Field>
        <div className="mt-3"><Alert tipo="info">Se generará una liquidación en borrador con todos los empleados activos, calculando el aporte del 9% al IPS sobre el salario base.</Alert></div>
      </Modal>

      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={detalle ? `Liquidación ${mesLabel(detalle.periodo + '-01')}` : ''} size="xl"
        footer={detalle && <>
          <button className="btn-secondary no-print" onClick={() => window.print()}><Printer size={15} /> Imprimir planilla</button>
          {detalle.estado === 'borrador' && <button className="btn-primary" onClick={() => { s.cambiarEstadoLiquidacion(detalle.id, 'aprobada'); setDetalle(null) }}><CheckCircle2 size={15} /> Aprobar</button>}
          {detalle.estado === 'aprobada' && <button className="btn-primary" onClick={() => { s.cambiarEstadoLiquidacion(detalle.id, 'pagada'); setDetalle(null) }}><Banknote size={15} /> Marcar como pagada</button>}
        </>}>
        {detalle && (() => {
          const t = tot(detalle)
          return (
            <div>
              <div className="mb-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">Total bruto</div><div className="text-lg font-bold">{fmtMoney(t.bruto, sim)}</div></div>
                <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">IPS obrero (9%)</div><div className="text-lg font-bold text-rose-700">{fmtMoney(t.ips, sim)}</div></div>
                <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">Otros descuentos</div><div className="text-lg font-bold text-rose-700">{fmtMoney(t.desc, sim)}</div></div>
                <div className="rounded-lg bg-emerald-50 p-3"><div className="text-xs text-emerald-600">Neto a pagar</div><div className="text-lg font-bold text-emerald-800">{fmtMoney(t.neto, sim)}</div></div>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Legajo</th><th>Empleado</th><th>Cargo</th><th className="text-right">Salario base</th><th className="text-right">Horas extra</th><th className="text-right">Bonific.</th><th className="text-right">Descuentos</th><th className="text-right">IPS 9%</th><th className="text-right">Neto</th></tr></thead>
                  <tbody>
                    {detalle.lineas.map((l) => {
                      const e = emp(l.empleadoId)
                      return (
                        <tr key={l.empleadoId}>
                          <td className="font-mono text-xs">{e?.legajo}</td>
                          <td className="font-medium">{e?.nombre} {e?.apellido}</td>
                          <td className="text-xs text-slate-500">{s.cargos.find((c) => c.id === e?.cargoId)?.nombre}</td>
                          <td className="num">{fmtMoney(l.salarioBase, sim)}</td>
                          <td className="num">{l.horasExtra ? fmtMoney(l.horasExtra, sim) : '—'}</td>
                          <td className="num">{l.bonificaciones ? fmtMoney(l.bonificaciones, sim) : '—'}</td>
                          <td className="num text-rose-700">{l.descuentos ? fmtMoney(l.descuentos, sim) : '—'}</td>
                          <td className="num text-rose-700">{fmtMoney(l.ips, sim)}</td>
                          <td className="num font-semibold">{fmtMoney(l.neto, sim)}</td>
                        </tr>
                      )
                    })}
                    <tr className="bg-slate-100 font-bold"><td colSpan={3}>Totales</td><td className="num">{fmtMoney(sumBy(detalle.lineas, (l) => l.salarioBase), sim)}</td><td className="num">{fmtMoney(sumBy(detalle.lineas, (l) => l.horasExtra), sim)}</td><td className="num">{fmtMoney(sumBy(detalle.lineas, (l) => l.bonificaciones), sim)}</td><td className="num">{fmtMoney(t.desc, sim)}</td><td className="num">{fmtMoney(t.ips, sim)}</td><td className="num">{fmtMoney(t.neto, sim)}</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-500">Aporte patronal IPS (16.5%): <b>{fmtMoney(t.bruto * 0.165, sim)}</b> · Costo laboral total: <b>{fmtMoney(t.bruto * 1.165, sim)}</b></p>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
