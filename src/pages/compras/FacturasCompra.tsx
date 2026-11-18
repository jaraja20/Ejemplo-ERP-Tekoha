import { useMemo, useState } from 'react'
import { HandCoins } from 'lucide-react'
import { useERP, selectores } from '@/store/erp'
import type { FacturaCompra, MedioPago } from '@/types'
import { PageHeader, DataTable, EstadoBadge, Modal, Field, Select, Tabs, StatCard, KV, type Column } from '@/components/ui'
import { DocumentoPrint } from '@/components/DocumentoPrint'
import { fmtMoneyCompact, fmtMoney, fmtDate, totales, today, sumBy } from '@/lib/utils'

export default function FacturasCompra() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const [tab, setTab] = useState<'todas' | 'pendiente' | 'vencida' | 'pagada'>('todas')
  const [detalle, setDetalle] = useState<FacturaCompra | null>(null)
  const [pago, setPago] = useState<FacturaCompra | null>(null)
  const [pagoForm, setPagoForm] = useState({ monto: 0, medio: 'transferencia' as MedioPago, cuentaId: 'cf03', referencia: '' })
  const prov = (id: string) => s.proveedores.find((p) => p.id === id)

  const resumen = useMemo(() => ({
    pendiente: sumBy(s.facturasCompra.filter((f) => f.estado !== 'pagada'), (f) => selectores.saldoFacturaCompra(s, f)),
    vencido: sumBy(s.facturasCompra.filter((f) => f.estado === 'vencida'), (f) => selectores.saldoFacturaCompra(s, f)),
    mes: sumBy(s.facturasCompra.filter((f) => f.fecha.slice(0, 7) === today().slice(0, 7)), (f) => totales(f.lineas).total),
  }), [s])

  const rows = s.facturasCompra.filter((f) => tab === 'todas' || f.estado === tab || (tab === 'pendiente' && f.estado === 'parcial'))
  const columns: Column<FacturaCompra>[] = [
    { key: 'numero', header: 'N° Factura', render: (r) => <span className="font-mono text-xs font-medium">{r.numero}</span>, value: (r) => r.numero, sortable: true },
    { key: 'fecha', header: 'Fecha', render: (r) => fmtDate(r.fecha), value: (r) => r.fecha, sortable: true },
    { key: 'vencimiento', header: 'Vence', render: (r) => <span className={r.estado === 'vencida' ? 'font-medium text-rose-600' : ''}>{fmtDate(r.vencimiento)}</span>, value: (r) => r.vencimiento, sortable: true },
    { key: 'proveedor', header: 'Proveedor', render: (r) => prov(r.proveedorId)?.razonSocial, value: (r) => prov(r.proveedorId)?.razonSocial ?? '' },
    { key: 'oc', header: 'Orden', render: (r) => <span className="font-mono text-xs text-slate-500">{s.ordenesCompra.find((o) => o.id === r.ordenCompraId)?.numero ?? '—'}</span> },
    { key: 'total', header: 'Total', render: (r) => fmtMoney(totales(r.lineas).total, sim), value: (r) => totales(r.lineas).total, sortable: true, align: 'right' },
    { key: 'saldo', header: 'Saldo', render: (r) => { const v = selectores.saldoFacturaCompra(s, r); return <span className={v > 0 ? 'font-medium text-amber-700' : 'text-slate-400'}>{fmtMoney(v, sim)}</span> }, value: (r) => selectores.saldoFacturaCompra(s, r), sortable: true, align: 'right' },
    { key: 'estado', header: 'Estado', render: (r) => <EstadoBadge estado={r.estado} /> },
  ]
  const abrirPago = (f: FacturaCompra) => { setPago(f); setPagoForm({ monto: Math.round(selectores.saldoFacturaCompra(s, f)), medio: 'transferencia', cuentaId: 'cf03', referencia: '' }) }
  const det = detalle ? s.facturasCompra.find((f) => f.id === detalle.id) ?? detalle : null
  const pr = det ? prov(det.proveedorId) : undefined

  return (
    <div>
      <PageHeader title="Facturas de compra" subtitle="Documentos recibidos de proveedores y su estado de pago" />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Saldo a pagar" value={fmtMoneyCompact(resumen.pendiente, sim)} tone="amber" />
        <StatCard label="Vencido" value={fmtMoneyCompact(resumen.vencido, sim)} tone="red" />
        <StatCard label="Comprado este mes" value={fmtMoneyCompact(resumen.mes, sim)} tone="blue" />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'todas', label: 'Todas' }, { value: 'pendiente', label: 'Pendientes', count: s.facturasCompra.filter((f) => ['pendiente', 'parcial'].includes(f.estado)).length }, { value: 'vencida', label: 'Vencidas', count: s.facturasCompra.filter((f) => f.estado === 'vencida').length }, { value: 'pagada', label: 'Pagadas' }]} />
      <DataTable rows={rows} columns={columns} searchKeys={(r) => `${r.numero} ${prov(r.proveedorId)?.razonSocial ?? ''}`} onRowClick={setDetalle} exportName="facturas-compra" />

      <Modal open={!!det} onClose={() => setDetalle(null)} title={`Factura de compra ${det?.numero ?? ''}`} size="lg"
        footer={det && selectores.saldoFacturaCompra(s, det) > 0 && <button className="btn-primary" onClick={() => abrirPago(det)}><HandCoins size={15} /> Registrar pago</button>}>
        {det && pr && (
          <div>
            <div className="mb-3 grid gap-x-8 sm:grid-cols-2">
              <KV k="Estado" v={<EstadoBadge estado={det.estado} />} />
              <KV k="Saldo" v={<span className="font-bold">{fmtMoney(selectores.saldoFacturaCompra(s, det), sim)}</span>} />
            </div>
            {s.pagos.filter((p) => p.facturaCompraId === det.id).length > 0 && (
              <div className="mb-4 rounded-lg bg-slate-50 p-3">
                <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Pagos aplicados</div>
                {s.pagos.filter((p) => p.facturaCompraId === det.id).map((p) => <div key={p.id} className="flex justify-between text-sm"><span>{fmtDate(p.fecha)} · {p.numero} · <span className="capitalize">{p.medio}</span></span><span className="font-medium">{fmtMoney(p.monto, sim)}</span></div>)}
              </div>
            )}
            <DocumentoPrint tipo="Factura de compra" numero={det.numero} fecha={det.fecha} vencimiento={det.vencimiento} tercero={{ nombre: pr.razonSocial, ruc: pr.ruc, direccion: pr.direccion, ciudad: pr.ciudad, telefono: pr.telefono, email: pr.email }} lineas={det.lineas} />
          </div>
        )}
      </Modal>

      <Modal open={!!pago} onClose={() => setPago(null)} title={`Registrar pago · ${pago?.numero}`} size="sm" footer={<><button className="btn-secondary" onClick={() => setPago(null)}>Cancelar</button><button className="btn-primary" onClick={() => { if (pago && pagoForm.monto > 0) { s.registrarPago({ fecha: today(), proveedorId: pago.proveedorId, facturaCompraId: pago.id, monto: pagoForm.monto, medio: pagoForm.medio, cuentaId: pagoForm.cuentaId, referencia: pagoForm.referencia || undefined }); setPago(null); setDetalle(null) } }}>Confirmar pago</button></>}>
        <div className="grid gap-3">
          <Field label="Monto" hint={pago ? `Saldo: ${fmtMoney(selectores.saldoFacturaCompra(s, pago), sim)}` : ''}><input type="number" className="input" value={pagoForm.monto} onChange={(e) => setPagoForm({ ...pagoForm, monto: Number(e.target.value) })} /></Field>
          <Field label="Medio de pago"><Select value={pagoForm.medio} onChange={(v) => setPagoForm({ ...pagoForm, medio: v as MedioPago, cuentaId: v === 'efectivo' ? 'cf01' : 'cf03' })} options={['transferencia', 'cheque', 'efectivo', 'tarjeta'].map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))} /></Field>
          <Field label="Cuenta origen"><Select value={pagoForm.cuentaId} onChange={(v) => setPagoForm({ ...pagoForm, cuentaId: v })} options={s.cuentasFinancieras.filter((c) => c.activa).map((c) => ({ value: c.id, label: `${c.nombre} — ${fmtMoney(selectores.saldoCuenta(s, c.id), sim)}` }))} /></Field>
          <Field label="Referencia"><input className="input" value={pagoForm.referencia} onChange={(e) => setPagoForm({ ...pagoForm, referencia: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  )
}
