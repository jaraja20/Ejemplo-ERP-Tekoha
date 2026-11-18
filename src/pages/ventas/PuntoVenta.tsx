import { useMemo, useState } from 'react'
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, Landmark, CheckCircle2 } from 'lucide-react'
import { useERP } from '@/store/erp'
import type { LineaDocumento, MedioPago } from '@/types'
import { PageHeader, Field, Select, Modal } from '@/components/ui'
import { DocumentoPrint } from '@/components/DocumentoPrint'
import { fmtMoney, totales, today, addDays, cn } from '@/lib/utils'

export default function PuntoVenta() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [carrito, setCarrito] = useState<LineaDocumento[]>([])
  const [clienteId, setClienteId] = useState('cl031')
  const [sucursalId, setSucursalId] = useState('s01')
  const [condicion, setCondicion] = useState<'contado' | 'credito'>('contado')
  const [medio, setMedio] = useState<MedioPago>('efectivo')
  const [ultima, setUltima] = useState<string | null>(null)
  const depositoId = sucursalId === 's02' ? 'd02' : sucursalId === 's03' ? 'd03' : 'd01'
  const cliente = s.clientes.find((c) => c.id === clienteId)

  const productos = useMemo(() => {
    const n = q.toLowerCase()
    return s.productos.filter((p) => p.activo && (!cat || p.categoriaId === cat) && (!n || p.nombre.toLowerCase().includes(n) || p.codigo.toLowerCase().includes(n) || p.codigoBarras?.includes(n)))
  }, [s.productos, q, cat])

  const agregar = (id: string) => {
    const p = s.productos.find((x) => x.id === id)!
    const precio = cliente?.segmento !== 'minorista' ? p.precioMayorista : p.precio
    setCarrito((c) => c.some((l) => l.productoId === id) ? c.map((l) => (l.productoId === id ? { ...l, cantidad: l.cantidad + 1 } : l)) : [...c, { productoId: id, descripcion: p.nombre, cantidad: 1, precioUnitario: precio, descuento: 0, iva: p.iva }])
  }
  const cambiar = (id: string, delta: number) => setCarrito((c) => c.map((l) => (l.productoId === id ? { ...l, cantidad: Math.max(1, l.cantidad + delta) } : l)))
  const tot = totales(carrito)

  const cobrar = () => {
    if (!carrito.length || !cliente) return
    const fecha = today()
    const f = s.crearFactura({ fecha, vencimiento: condicion === 'credito' ? addDays(fecha, cliente.diasCredito || 30) : fecha, clienteId, vendedorId: s.usuarioActual!.id, sucursalId, condicion, lineas: carrito, depositoId, notas: 'Venta por punto de venta' })
    if (condicion === 'contado') {
      const cuentaId = medio === 'efectivo' ? (sucursalId === 's02' ? 'cf02' : 'cf01') : medio === 'billetera' ? 'cf05' : 'cf03'
      s.registrarCobro({ fecha, clienteId, facturaId: f.id, monto: Math.round(tot.total), medio, cuentaId })
    }
    setUltima(f.id)
    setCarrito([])
  }
  const facturaUltima = s.facturas.find((f) => f.id === ultima)
  const medios: { v: MedioPago; l: string; i: React.ReactNode }[] = [
    { v: 'efectivo', l: 'Efectivo', i: <Banknote size={16} /> }, { v: 'tarjeta', l: 'Tarjeta', i: <CreditCard size={16} /> },
    { v: 'transferencia', l: 'Transferencia', i: <Landmark size={16} /> }, { v: 'billetera', l: 'Billetera', i: <Smartphone size={16} /> },
  ]

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col">
      <PageHeader title="Punto de venta" subtitle="Venta rápida con emisión de factura y cobro inmediato" />
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_400px]">
        <div className="flex min-h-0 flex-col">
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Buscar o escanear código de barras..." value={q} onChange={(e) => setQ(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && productos[0]) { agregar(productos[0].id); setQ('') } }} />
            </div>
            <div className="flex flex-wrap gap-1">
              <button className={cn('btn-sm rounded-full border px-3', !cat ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600')} onClick={() => setCat('')}>Todas</button>
              {s.categorias.map((c) => (
                <button key={c.id} className={cn('btn-sm rounded-full border px-3', cat === c.id ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600')} onClick={() => setCat(c.id)}>{c.nombre}</button>
              ))}
            </div>
          </div>
          <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-4">
            {productos.map((p) => {
              const stock = p.stockPorDeposito[depositoId] ?? 0
              const catg = s.categorias.find((c) => c.id === p.categoriaId)
              return (
                <button key={p.id} disabled={stock <= 0} className="card flex flex-col p-3 text-left transition hover:border-brand-400 hover:shadow disabled:opacity-40" onClick={() => agregar(p.id)}>
                  <div className="mb-2 flex h-14 items-center justify-center rounded-lg text-2xl font-black" style={{ background: catg?.color + '18', color: catg?.color }}>{p.nombre.slice(0, 1)}</div>
                  <div className="line-clamp-2 text-xs font-medium text-slate-800">{p.nombre}</div>
                  <div className="mt-auto flex items-end justify-between pt-1">
                    <span className="text-sm font-bold text-slate-900">{fmtMoney(cliente?.segmento !== 'minorista' ? p.precioMayorista : p.precio, sim)}</span>
                    <span className={cn('text-[10px]', stock <= p.stockMinimo ? 'text-rose-500' : 'text-slate-400')}>st: {stock}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        <div className="card flex min-h-0 flex-col">
          <div className="grid grid-cols-2 gap-2 border-b border-slate-200 p-3">
            <Field label="Cliente" className="col-span-2"><Select value={clienteId} onChange={setClienteId} options={s.clientes.filter((c) => c.activo).map((c) => ({ value: c.id, label: `${c.razonSocial} (${c.segmento})` }))} /></Field>
            <Field label="Sucursal"><Select value={sucursalId} onChange={setSucursalId} options={s.sucursales.map((x) => ({ value: x.id, label: x.nombre }))} /></Field>
            <Field label="Condición"><Select value={condicion} onChange={(v) => setCondicion(v as 'contado' | 'credito')} options={[{ value: 'contado', label: 'Contado' }, ...(cliente && cliente.diasCredito > 0 ? [{ value: 'credito', label: `Crédito ${cliente.diasCredito} días` }] : [])]} /></Field>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {carrito.length === 0 && <p className="py-10 text-center text-sm text-slate-400">El carrito está vacío</p>}
            {carrito.map((l) => (
              <div key={l.productoId} className="mb-2 flex items-center gap-2 rounded-lg border border-slate-100 p-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800">{l.descripcion}</div>
                  <div className="text-xs text-slate-500">{fmtMoney(l.precioUnitario, sim)} × {l.cantidad}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="btn-ghost btn-sm" onClick={() => cambiar(l.productoId, -1)}><Minus size={12} /></button>
                  <span className="w-6 text-center text-sm font-semibold">{l.cantidad}</span>
                  <button className="btn-ghost btn-sm" onClick={() => cambiar(l.productoId, 1)}><Plus size={12} /></button>
                  <button className="btn-ghost btn-sm text-rose-500" onClick={() => setCarrito((c) => c.filter((x) => x.productoId !== l.productoId))}><Trash2 size={12} /></button>
                </div>
                <div className="w-24 text-right text-sm font-semibold tabular-nums">{fmtMoney(l.cantidad * l.precioUnitario, sim)}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 p-3">
            <div className="mb-1 flex justify-between text-xs text-slate-500"><span>IVA incluido</span><span>{fmtMoney(tot.iva, sim)}</span></div>
            <div className="mb-3 flex justify-between text-lg font-bold text-slate-900"><span>Total</span><span>{fmtMoney(tot.total, sim)}</span></div>
            {condicion === 'contado' && (
              <div className="mb-3 grid grid-cols-4 gap-1">
                {medios.map((m) => (
                  <button key={m.v} className={cn('flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] font-medium', medio === m.v ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500')} onClick={() => setMedio(m.v)}>{m.i}{m.l}</button>
                ))}
              </div>
            )}
            <button className="btn-primary w-full py-3 text-base" disabled={!carrito.length} onClick={cobrar}><CheckCircle2 size={18} /> {condicion === 'contado' ? 'Cobrar y facturar' : 'Facturar a crédito'}</button>
          </div>
        </div>
      </div>
      <Modal open={!!facturaUltima} onClose={() => setUltima(null)} title="Factura emitida" size="lg" footer={<button className="btn-primary" onClick={() => setUltima(null)}>Nueva venta</button>}>
        {facturaUltima && (() => { const c = s.clientes.find((x) => x.id === facturaUltima.clienteId)!; return <DocumentoPrint tipo="Factura" numero={facturaUltima.numero} fecha={facturaUltima.fecha} vencimiento={facturaUltima.vencimiento} timbrado={facturaUltima.timbrado} condicion={facturaUltima.condicion} tercero={{ nombre: c.razonSocial, ruc: c.ruc, direccion: c.direccion, ciudad: c.ciudad, telefono: c.telefono, email: c.email }} lineas={facturaUltima.lineas} notas={facturaUltima.notas} /> })()}
      </Modal>
    </div>
  )
}
