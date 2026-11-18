import { useMemo } from 'react'
import { useERP } from '@/store/erp'
import type { Cobro } from '@/types'
import { PageHeader, DataTable, StatCard, Badge, type Column } from '@/components/ui'
import { fmtMoneyCompact, fmtMoney, fmtDate, today, sumBy } from '@/lib/utils'

export default function Cobros() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const mes = today().slice(0, 7)
  const resumen = useMemo(() => {
    const delMes = s.cobros.filter((c) => c.fecha.slice(0, 7) === mes)
    const porMedio: Record<string, number> = {}
    delMes.forEach((c) => (porMedio[c.medio] = (porMedio[c.medio] ?? 0) + c.monto))
    return { total: sumBy(delMes, (c) => c.monto), hoy: sumBy(s.cobros.filter((c) => c.fecha === today()), (c) => c.monto), porMedio, count: delMes.length }
  }, [s.cobros, mes])

  const columns: Column<Cobro>[] = [
    { key: 'numero', header: 'Recibo', render: (r) => <span className="font-mono text-xs font-medium">{r.numero}</span>, value: (r) => r.numero, sortable: true },
    { key: 'fecha', header: 'Fecha', render: (r) => fmtDate(r.fecha), value: (r) => r.fecha, sortable: true },
    { key: 'cliente', header: 'Cliente', render: (r) => s.clientes.find((c) => c.id === r.clienteId)?.razonSocial, value: (r) => s.clientes.find((c) => c.id === r.clienteId)?.razonSocial ?? '' },
    { key: 'factura', header: 'Factura', render: (r) => <span className="font-mono text-xs">{s.facturas.find((f) => f.id === r.facturaId)?.numero}</span> },
    { key: 'medio', header: 'Medio', render: (r) => <Badge color={r.medio === 'efectivo' ? 'green' : r.medio === 'transferencia' ? 'blue' : r.medio === 'cheque' ? 'purple' : 'gray'}>{r.medio}</Badge> },
    { key: 'cuenta', header: 'Cuenta', render: (r) => s.cuentasFinancieras.find((c) => c.id === r.cuentaId)?.nombre },
    { key: 'referencia', header: 'Referencia', render: (r) => <span className="text-xs text-slate-500">{r.referencia ?? '—'}</span> },
    { key: 'monto', header: 'Monto', render: (r) => <span className="font-medium text-emerald-700">{fmtMoney(r.monto, sim)}</span>, value: (r) => r.monto, sortable: true, align: 'right' },
    { key: 'usuario', header: 'Registró', render: (r) => s.usuarios.find((u) => u.id === r.usuarioId)?.nombre },
  ]

  return (
    <div>
      <PageHeader title="Cobros" subtitle="Recibos de cobranza aplicados a facturas de venta" />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cobrado este mes" value={fmtMoneyCompact(resumen.total, sim)} tone="green" hint={`${resumen.count} recibos`} />
        <StatCard label="Cobrado hoy" value={fmtMoneyCompact(resumen.hoy, sim)} tone="blue" />
        <StatCard label="Efectivo (mes)" value={fmtMoneyCompact(resumen.porMedio.efectivo ?? 0, sim)} />
        <StatCard label="Transferencias (mes)" value={fmtMoneyCompact(resumen.porMedio.transferencia ?? 0, sim)} />
      </div>
      <DataTable rows={s.cobros} columns={columns} searchKeys={(r) => `${r.numero} ${s.clientes.find((c) => c.id === r.clienteId)?.razonSocial ?? ''} ${r.medio} ${r.referencia ?? ''}`} exportName="cobros" />
    </div>
  )
}
