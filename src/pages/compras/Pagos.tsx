import { useMemo } from 'react'
import { useERP } from '@/store/erp'
import type { Pago } from '@/types'
import { PageHeader, DataTable, StatCard, Badge, type Column } from '@/components/ui'
import { fmtMoneyCompact, fmtMoney, fmtDate, today, sumBy } from '@/lib/utils'

export default function Pagos() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const mes = today().slice(0, 7)
  const resumen = useMemo(() => {
    const delMes = s.pagos.filter((p) => p.fecha.slice(0, 7) === mes)
    const porProveedor: Record<string, number> = {}
    s.pagos.forEach((p) => (porProveedor[p.proveedorId] = (porProveedor[p.proveedorId] ?? 0) + p.monto))
    const top = Object.entries(porProveedor).sort((a, b) => b[1] - a[1])[0]
    return { mes: sumBy(delMes, (p) => p.monto), count: delMes.length, top, total: sumBy(s.pagos, (p) => p.monto) }
  }, [s.pagos, mes])

  const columns: Column<Pago>[] = [
    { key: 'numero', header: 'Orden de pago', render: (r) => <span className="font-mono text-xs font-medium">{r.numero}</span>, value: (r) => r.numero, sortable: true },
    { key: 'fecha', header: 'Fecha', render: (r) => fmtDate(r.fecha), value: (r) => r.fecha, sortable: true },
    { key: 'proveedor', header: 'Proveedor', render: (r) => s.proveedores.find((p) => p.id === r.proveedorId)?.razonSocial, value: (r) => s.proveedores.find((p) => p.id === r.proveedorId)?.razonSocial ?? '' },
    { key: 'factura', header: 'Factura', render: (r) => <span className="font-mono text-xs">{s.facturasCompra.find((f) => f.id === r.facturaCompraId)?.numero}</span> },
    { key: 'medio', header: 'Medio', render: (r) => <Badge color={r.medio === 'transferencia' ? 'blue' : r.medio === 'cheque' ? 'purple' : 'green'}>{r.medio}</Badge> },
    { key: 'cuenta', header: 'Cuenta', render: (r) => s.cuentasFinancieras.find((c) => c.id === r.cuentaId)?.nombre },
    { key: 'referencia', header: 'Referencia', render: (r) => <span className="text-xs text-slate-500">{r.referencia ?? '—'}</span> },
    { key: 'monto', header: 'Monto', render: (r) => <span className="font-medium text-rose-700">{fmtMoney(r.monto, sim)}</span>, value: (r) => r.monto, sortable: true, align: 'right' },
  ]

  return (
    <div>
      <PageHeader title="Pagos a proveedores" subtitle="Órdenes de pago emitidas y aplicadas a facturas de compra" />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Pagado este mes" value={fmtMoneyCompact(resumen.mes, sim)} tone="red" hint={`${resumen.count} órdenes de pago`} />
        <StatCard label="Pagado histórico" value={fmtMoneyCompact(resumen.total, sim)} />
        <StatCard label="Mayor proveedor por volumen" value={s.proveedores.find((p) => p.id === resumen.top?.[0])?.razonSocial ?? '—'} hint={resumen.top ? fmtMoneyCompact(resumen.top[1], sim) : ''} />
      </div>
      <DataTable rows={s.pagos} columns={columns} searchKeys={(r) => `${r.numero} ${s.proveedores.find((p) => p.id === r.proveedorId)?.razonSocial ?? ''} ${r.referencia ?? ''}`} exportName="pagos" />
    </div>
  )
}
