import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useERP } from '@/store/erp'
import type { NotaCredito, LineaDocumento } from '@/types'
import { PageHeader, DataTable, Modal, Field, Select, type Column } from '@/components/ui'
import { DocumentoPrint } from '@/components/DocumentoPrint'
import { fmtMoney, fmtDate, totales, today, lineaSubtotal } from '@/lib/utils'

export default function NotasCredito() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const [nuevo, setNuevo] = useState(false)
  const [detalle, setDetalle] = useState<NotaCredito | null>(null)
  const [facturaId, setFacturaId] = useState('')
  const [motivo, setMotivo] = useState('Devolución de mercadería')
  const [cants, setCants] = useState<Record<string, number>>({})
  const factura = s.facturas.find((f) => f.id === facturaId)
  const cliente = (id: string) => s.clientes.find((c) => c.id === id)

  const columns: Column<NotaCredito>[] = [
    { key: 'numero', header: 'N°', render: (r) => <span className="font-mono text-xs font-medium">{r.numero}</span>, value: (r) => r.numero, sortable: true },
    { key: 'fecha', header: 'Fecha', render: (r) => fmtDate(r.fecha), value: (r) => r.fecha, sortable: true },
    { key: 'factura', header: 'Factura afectada', render: (r) => <span className="font-mono text-xs">{s.facturas.find((f) => f.id === r.facturaId)?.numero}</span> },
    { key: 'cliente', header: 'Cliente', render: (r) => cliente(r.clienteId)?.razonSocial, value: (r) => cliente(r.clienteId)?.razonSocial ?? '' },
    { key: 'motivo', header: 'Motivo' },
    { key: 'total', header: 'Total', render: (r) => <span className="font-medium text-rose-700">- {fmtMoney(totales(r.lineas).total, sim)}</span>, value: (r) => totales(r.lineas).total, sortable: true, align: 'right' },
  ]
  const lineasNC: LineaDocumento[] = factura ? factura.lineas.filter((l) => (cants[l.productoId] ?? 0) > 0).map((l) => ({ ...l, cantidad: cants[l.productoId] })) : []
  const guardar = () => {
    if (!factura || !lineasNC.length) return
    s.crearNotaCredito({ fecha: today(), facturaId: factura.id, clienteId: factura.clienteId, motivo, lineas: lineasNC })
    setNuevo(false); setFacturaId(''); setCants({})
  }
  const cli = detalle ? cliente(detalle.clienteId) : undefined

  return (
    <div>
      <PageHeader title="Notas de crédito" subtitle="Devoluciones y ajustes sobre facturas emitidas" actions={<button className="btn-primary" onClick={() => setNuevo(true)}><Plus size={16} /> Nueva nota de crédito</button>} />
      <DataTable rows={s.notasCredito} columns={columns} searchKeys={(r) => `${r.numero} ${cliente(r.clienteId)?.razonSocial ?? ''} ${r.motivo}`} onRowClick={setDetalle} exportName="notas-credito" />

      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Nueva nota de crédito" size="lg" footer={<><button className="btn-secondary" onClick={() => setNuevo(false)}>Cancelar</button><button className="btn-primary" onClick={guardar} disabled={!lineasNC.length}>Emitir</button></>}>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <Field label="Factura de referencia"><Select value={facturaId} onChange={(v) => { setFacturaId(v); setCants({}) }} placeholder="Seleccionar factura..." options={s.facturas.filter((f) => f.estado !== 'anulada').slice(0, 200).map((f) => ({ value: f.id, label: `${f.numero} · ${cliente(f.clienteId)?.razonSocial} · ${fmtMoney(totales(f.lineas).total, sim)}` }))} /></Field>
          <Field label="Motivo"><Select value={motivo} onChange={setMotivo} options={['Devolución de mercadería', 'Producto dañado', 'Producto vencido', 'Diferencia de precio', 'Descuento comercial', 'Error de facturación'].map((m) => ({ value: m, label: m }))} /></Field>
        </div>
        {factura && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Producto</th><th className="text-right">Facturado</th><th className="text-right">Precio</th><th className="w-32 text-right">Cant. a devolver</th><th className="text-right">Importe</th></tr></thead>
              <tbody>
                {factura.lineas.map((l) => (
                  <tr key={l.productoId}>
                    <td>{l.descripcion}</td>
                    <td className="num">{l.cantidad}</td>
                    <td className="num">{fmtMoney(l.precioUnitario, sim)}</td>
                    <td className="num"><input type="number" min={0} max={l.cantidad} className="input py-1 text-right" value={cants[l.productoId] ?? 0} onChange={(e) => setCants({ ...cants, [l.productoId]: Math.min(l.cantidad, Math.max(0, Number(e.target.value))) })} /></td>
                    <td className="num font-medium">{fmtMoney(lineaSubtotal({ ...l, cantidad: cants[l.productoId] ?? 0 }), sim)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {lineasNC.length > 0 && <div className="mt-3 text-right text-base font-bold">Total nota de crédito: {fmtMoney(totales(lineasNC).total, sim)}</div>}
      </Modal>

      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={`Nota de crédito ${detalle?.numero ?? ''}`} size="lg">
        {detalle && cli && <DocumentoPrint tipo="Nota de crédito" numero={detalle.numero} fecha={detalle.fecha} timbrado={s.empresa.timbrado} tercero={{ nombre: cli.razonSocial, ruc: cli.ruc, direccion: cli.direccion, ciudad: cli.ciudad, telefono: cli.telefono, email: cli.email }} lineas={detalle.lineas} notas={`Motivo: ${detalle.motivo}`} extra={[{ k: 'Factura afectada', v: s.facturas.find((f) => f.id === detalle.facturaId)?.numero ?? '' }]} />}
      </Modal>
    </div>
  )
}
