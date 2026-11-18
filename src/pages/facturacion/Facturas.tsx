import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Ban, HandCoins } from 'lucide-react'
import { useERP, selectores } from '@/store/erp'
import type { Factura, LineaDocumento, MedioPago, EstadoFactura } from '@/types'
import { PageHeader, DataTable, EstadoBadge, Modal, Field, Select, Tabs, KV, StatCard, ConfirmDialog, type Column } from '@/components/ui'
import { LineasEditor } from '@/components/LineasEditor'
import { DocumentoPrint } from '@/components/DocumentoPrint'
import { fmtMoneyCompact, fmtMoney, fmtDate, totales, today, addDays, sumBy } from '@/lib/utils'

export default function Facturas() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const [params] = useSearchParams()
  const q0 = params.get('q') ?? ''
  const [tab, setTab] = useState<'todas' | EstadoFactura>((params.get('estado') as EstadoFactura) || 'todas')
  const [nuevo, setNuevo] = useState(false)
  const [detalle, setDetalle] = useState<Factura | null>(null)
  const [cobro, setCobro] = useState<Factura | null>(null)
  const [anular, setAnular] = useState<Factura | null>(null)
  const [form, setForm] = useState({ clienteId: '', sucursalId: 's01', condicion: 'contado' as 'contado' | 'credito', notas: '' })
  const [lineas, setLineas] = useState<LineaDocumento[]>([])
  const [cobroForm, setCobroForm] = useState({ monto: 0, medio: 'transferencia' as MedioPago, cuentaId: 'cf03', referencia: '' })
  const cliente = (id: string) => s.clientes.find((c) => c.id === id)

  const rows = useMemo(() => s.facturas.filter((f) => (tab === 'todas' || f.estado === tab) && (!q0 || f.numero.includes(q0))), [s.facturas, tab, q0])
  const resumen = useMemo(() => {
    const validas = s.facturas.filter((f) => f.estado !== 'anulada')
    return {
      mes: sumBy(validas.filter((f) => f.fecha.slice(0, 7) === today().slice(0, 7)), (f) => totales(f.lineas).total),
      pendiente: sumBy(validas.filter((f) => ['pendiente', 'parcial'].includes(f.estado)), (f) => selectores.saldoFactura(s, f)),
      vencido: sumBy(validas.filter((f) => f.estado === 'vencida'), (f) => selectores.saldoFactura(s, f)),
      count: validas.length,
    }
  }, [s])

  const columns: Column<Factura>[] = [
    { key: 'numero', header: 'N° Factura', render: (r) => <span className="font-mono text-xs font-medium">{r.numero}</span>, value: (r) => r.numero, sortable: true },
    { key: 'fecha', header: 'Fecha', render: (r) => fmtDate(r.fecha), value: (r) => r.fecha, sortable: true },
    { key: 'vencimiento', header: 'Vence', render: (r) => <span className={r.estado === 'vencida' ? 'font-medium text-rose-600' : ''}>{fmtDate(r.vencimiento)}</span>, value: (r) => r.vencimiento, sortable: true },
    { key: 'cliente', header: 'Cliente', render: (r) => cliente(r.clienteId)?.razonSocial, value: (r) => cliente(r.clienteId)?.razonSocial ?? '' },
    { key: 'condicion', header: 'Cond.', render: (r) => <span className="capitalize">{r.condicion}</span> },
    { key: 'total', header: 'Total', render: (r) => fmtMoney(totales(r.lineas).total, sim), value: (r) => totales(r.lineas).total, sortable: true, align: 'right' },
    { key: 'saldo', header: 'Saldo', render: (r) => { const sal = r.estado === 'anulada' ? 0 : selectores.saldoFactura(s, r); return <span className={sal > 0 ? 'font-medium text-amber-700' : 'text-slate-400'}>{fmtMoney(sal, sim)}</span> }, value: (r) => selectores.saldoFactura(s, r), sortable: true, align: 'right' },
    { key: 'estado', header: 'Estado', render: (r) => <EstadoBadge estado={r.estado} /> },
  ]

  const guardar = () => {
    if (!form.clienteId || !lineas.length) return
    const c = cliente(form.clienteId)!
    const fecha = today()
    s.crearFactura({ fecha, vencimiento: form.condicion === 'credito' ? addDays(fecha, c.diasCredito || 30) : fecha, clienteId: form.clienteId, vendedorId: s.usuarioActual!.id, sucursalId: form.sucursalId, condicion: form.condicion, lineas, notas: form.notas || undefined, depositoId: form.sucursalId === 's02' ? 'd02' : form.sucursalId === 's03' ? 'd03' : 'd01' })
    setNuevo(false); setLineas([]); setForm({ clienteId: '', sucursalId: 's01', condicion: 'contado', notas: '' })
  }
  const abrirCobro = (f: Factura) => { setCobro(f); setCobroForm({ monto: Math.round(selectores.saldoFactura(s, f)), medio: 'transferencia', cuentaId: 'cf03', referencia: '' }) }
  const registrarCobro = () => {
    if (!cobro || cobroForm.monto <= 0) return
    s.registrarCobro({ fecha: today(), clienteId: cobro.clienteId, facturaId: cobro.id, monto: cobroForm.monto, medio: cobroForm.medio, cuentaId: cobroForm.cuentaId, referencia: cobroForm.referencia || undefined })
    setCobro(null); setDetalle(null)
  }
  const det = detalle ? s.facturas.find((f) => f.id === detalle.id) ?? detalle : null
  const cli = det ? cliente(det.clienteId) : undefined
  const cobrosDet = det ? s.cobros.filter((c) => c.facturaId === det.id) : []

  return (
    <div>
      <PageHeader title="Facturas de venta" subtitle="Emisión, seguimiento de cobros y anulaciones" actions={<button className="btn-primary" onClick={() => setNuevo(true)}><Plus size={16} /> Nueva factura</button>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Facturado este mes" value={fmtMoneyCompact(resumen.mes, sim)} tone="blue" />
        <StatCard label="Pendiente de cobro" value={fmtMoneyCompact(resumen.pendiente, sim)} tone="amber" />
        <StatCard label="Vencido" value={fmtMoneyCompact(resumen.vencido, sim)} tone="red" />
        <StatCard label="Facturas emitidas" value={String(resumen.count)} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'todas', label: 'Todas' }, { value: 'pendiente', label: 'Pendientes', count: s.facturas.filter((f) => f.estado === 'pendiente').length }, { value: 'parcial', label: 'Parciales', count: s.facturas.filter((f) => f.estado === 'parcial').length }, { value: 'vencida', label: 'Vencidas', count: s.facturas.filter((f) => f.estado === 'vencida').length }, { value: 'pagada', label: 'Pagadas' }, { value: 'anulada', label: 'Anuladas' }]} />
      <DataTable rows={rows} columns={columns} searchKeys={(r) => `${r.numero} ${cliente(r.clienteId)?.razonSocial ?? ''} ${r.estado}`} onRowClick={setDetalle} exportName="facturas" />

      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Nueva factura de venta" size="xl" footer={<><button className="btn-secondary" onClick={() => setNuevo(false)}>Cancelar</button><button className="btn-primary" onClick={guardar} disabled={!form.clienteId || !lineas.length}>Emitir factura</button></>}>
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          <Field label="Cliente" className="sm:col-span-2"><Select value={form.clienteId} onChange={(v) => setForm({ ...form, clienteId: v })} placeholder="Seleccionar..." options={s.clientes.filter((c) => c.activo).map((c) => ({ value: c.id, label: `${c.razonSocial} — ${c.ruc}` }))} /></Field>
          <Field label="Sucursal"><Select value={form.sucursalId} onChange={(v) => setForm({ ...form, sucursalId: v })} options={s.sucursales.map((x) => ({ value: x.id, label: x.nombre }))} /></Field>
          <Field label="Condición"><Select value={form.condicion} onChange={(v) => setForm({ ...form, condicion: v as 'contado' | 'credito' })} options={[{ value: 'contado', label: 'Contado' }, { value: 'credito', label: 'Crédito' }]} /></Field>
          <Field label="Observaciones" className="sm:col-span-4"><input className="input" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></Field>
        </div>
        <LineasEditor lineas={lineas} onChange={setLineas} precioMayorista={cliente(form.clienteId)?.segmento !== 'minorista'} depositoId={form.sucursalId === 's02' ? 'd02' : form.sucursalId === 's03' ? 'd03' : 'd01'} />
      </Modal>

      <Modal open={!!det} onClose={() => setDetalle(null)} title={`Factura ${det?.numero ?? ''}`} size="lg"
        footer={det && det.estado !== 'anulada' && <>
          <button className="btn-danger" onClick={() => setAnular(det)}><Ban size={15} /> Anular</button>
          {selectores.saldoFactura(s, det) > 0 && <button className="btn-primary" onClick={() => abrirCobro(det)}><HandCoins size={15} /> Registrar cobro</button>}
        </>}>
        {det && cli && (
          <div>
            <div className="mb-3 grid gap-x-8 sm:grid-cols-2">
              <KV k="Estado" v={<EstadoBadge estado={det.estado} />} />
              <KV k="Saldo pendiente" v={<span className="font-bold">{fmtMoney(det.estado === 'anulada' ? 0 : selectores.saldoFactura(s, det), sim)}</span>} />
              <KV k="Vendedor" v={s.usuarios.find((u) => u.id === det.vendedorId)?.nombre} />
              <KV k="Pedido origen" v={det.pedidoId ? s.pedidos.find((p) => p.id === det.pedidoId)?.numero : '—'} />
            </div>
            {cobrosDet.length > 0 && (
              <div className="mb-4 rounded-lg bg-slate-50 p-3">
                <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Cobros aplicados</div>
                {cobrosDet.map((c) => <div key={c.id} className="flex justify-between text-sm"><span>{fmtDate(c.fecha)} · {c.numero} · <span className="capitalize">{c.medio}</span> {c.referencia && <span className="text-slate-400">({c.referencia})</span>}</span><span className="font-medium">{fmtMoney(c.monto, sim)}</span></div>)}
              </div>
            )}
            <DocumentoPrint tipo="Factura" numero={det.numero} fecha={det.fecha} vencimiento={det.vencimiento} timbrado={det.timbrado} condicion={det.condicion} estado={det.estado} tercero={{ nombre: cli.razonSocial, ruc: cli.ruc, direccion: cli.direccion, ciudad: cli.ciudad, telefono: cli.telefono, email: cli.email }} lineas={det.lineas} notas={det.notas} extra={[{ k: 'Vendedor', v: s.usuarios.find((u) => u.id === det.vendedorId)?.nombre ?? '' }, { k: 'Sucursal', v: s.sucursales.find((x) => x.id === det.sucursalId)?.nombre ?? '' }]} />
          </div>
        )}
      </Modal>

      <Modal open={!!cobro} onClose={() => setCobro(null)} title={`Registrar cobro · ${cobro?.numero}`} size="sm" footer={<><button className="btn-secondary" onClick={() => setCobro(null)}>Cancelar</button><button className="btn-primary" onClick={registrarCobro}>Confirmar cobro</button></>}>
        <div className="grid gap-3">
          <Field label="Monto" hint={cobro ? `Saldo: ${fmtMoney(selectores.saldoFactura(s, cobro), sim)}` : ''}><input type="number" className="input" value={cobroForm.monto} onChange={(e) => setCobroForm({ ...cobroForm, monto: Number(e.target.value) })} /></Field>
          <Field label="Medio de pago"><Select value={cobroForm.medio} onChange={(v) => setCobroForm({ ...cobroForm, medio: v as MedioPago, cuentaId: v === 'efectivo' ? 'cf01' : v === 'billetera' ? 'cf05' : 'cf03' })} options={['efectivo', 'transferencia', 'tarjeta', 'cheque', 'billetera'].map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))} /></Field>
          <Field label="Cuenta destino"><Select value={cobroForm.cuentaId} onChange={(v) => setCobroForm({ ...cobroForm, cuentaId: v })} options={s.cuentasFinancieras.filter((c) => c.activa).map((c) => ({ value: c.id, label: c.nombre }))} /></Field>
          <Field label="Referencia"><input className="input" placeholder="N° transferencia, cheque..." value={cobroForm.referencia} onChange={(e) => setCobroForm({ ...cobroForm, referencia: e.target.value })} /></Field>
        </div>
      </Modal>
      <ConfirmDialog open={!!anular} onClose={() => setAnular(null)} onConfirm={() => { if (anular) { s.anularFactura(anular.id); setDetalle(null) } }} title="Anular factura" message={`¿Anular la factura ${anular?.numero}? El stock de los productos se repondrá al depósito.`} danger />
    </div>
  )
}
