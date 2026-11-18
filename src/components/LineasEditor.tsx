import { useMemo, useState } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
import type { LineaDocumento } from '@/types'
import { useERP, selectores } from '@/store/erp'
import { fmtMoney, lineaSubtotal, totales } from '@/lib/utils'

export function LineasEditor({ lineas, onChange, precioMayorista = false, modoCosto = false, depositoId }: {
  lineas: LineaDocumento[]
  onChange: (l: LineaDocumento[]) => void
  precioMayorista?: boolean
  modoCosto?: boolean
  depositoId?: string
}) {
  const productos = useERP((s) => s.productos)
  const empresa = useERP((s) => s.empresa)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const sugerencias = useMemo(() => {
    if (!q) return []
    const n = q.toLowerCase()
    return productos.filter((p) => p.activo && (p.nombre.toLowerCase().includes(n) || p.codigo.toLowerCase().includes(n))).slice(0, 8)
  }, [q, productos])

  const agregar = (id: string) => {
    const p = productos.find((x) => x.id === id)
    if (!p) return
    if (lineas.some((l) => l.productoId === id)) {
      onChange(lineas.map((l) => (l.productoId === id ? { ...l, cantidad: l.cantidad + 1 } : l)))
    } else {
      onChange([...lineas, { productoId: p.id, descripcion: p.nombre, cantidad: 1, precioUnitario: modoCosto ? Math.round(p.costo * (1 + p.iva / 100)) : precioMayorista ? p.precioMayorista : p.precio, descuento: 0, iva: p.iva }])
    }
    setQ('')
    setOpen(false)
  }
  const set = (i: number, patch: Partial<LineaDocumento>) => onChange(lineas.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const tot = totales(lineas)

  return (
    <div>
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder="Buscar producto por nombre o código y presionar Enter..." value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onKeyDown={(e) => { if (e.key === 'Enter' && sugerencias[0]) { e.preventDefault(); agregar(sugerencias[0].id) } }} />
        {open && sugerencias.length > 0 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            {sugerencias.map((p) => {
              const stock = depositoId ? p.stockPorDeposito[depositoId] ?? 0 : selectores.stockTotal(p)
              return (
                <button key={p.id} type="button" className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50" onMouseDown={() => agregar(p.id)}>
                  <span><span className="font-mono text-xs text-slate-400">{p.codigo}</span> {p.nombre}</span>
                  <span className="flex items-center gap-3 text-xs text-slate-500"><span className={stock <= p.stockMinimo ? 'text-rose-600' : ''}>Stock: {stock}</span><span className="font-medium text-slate-700">{fmtMoney(modoCosto ? Math.round(p.costo * (1 + p.iva / 100)) : precioMayorista ? p.precioMayorista : p.precio, empresa.simbolo)}</span></span>
                </button>
              )
            })}
          </div>
        )}
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Producto</th><th className="w-24 text-right">Cant.</th><th className="w-36 text-right">Precio unit.</th><th className="w-20 text-right">Desc. %</th><th className="w-16 text-right">IVA</th><th className="w-36 text-right">Subtotal</th><th className="w-10"></th></tr></thead>
          <tbody>
            {lineas.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-sm text-slate-400">Agregá productos con el buscador</td></tr>}
            {lineas.map((l, i) => (
              <tr key={l.productoId}>
                <td><div className="font-medium text-slate-800">{l.descripcion}</div></td>
                <td className="num"><input type="number" min={1} className="input py-1 text-right" value={l.cantidad} onChange={(e) => set(i, { cantidad: Math.max(1, Number(e.target.value)) })} /></td>
                <td className="num"><input type="number" min={0} step={100} className="input py-1 text-right" value={l.precioUnitario} onChange={(e) => set(i, { precioUnitario: Number(e.target.value) })} /></td>
                <td className="num"><input type="number" min={0} max={100} className="input py-1 text-right" value={l.descuento} onChange={(e) => set(i, { descuento: Number(e.target.value) })} /></td>
                <td className="num text-xs text-slate-500">{l.iva}%</td>
                <td className="num font-medium">{fmtMoney(lineaSubtotal(l), empresa.simbolo)}</td>
                <td><button type="button" className="btn-ghost btn-sm text-rose-500" onClick={() => onChange(lineas.filter((_, j) => j !== i))}><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex justify-end">
        <div className="w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between text-slate-500"><span>Subtotal bruto</span><span>{fmtMoney(tot.bruto, empresa.simbolo)}</span></div>
          {tot.descuento > 0 && <div className="flex justify-between text-slate-500"><span>Descuentos</span><span>- {fmtMoney(tot.descuento, empresa.simbolo)}</span></div>}
          <div className="flex justify-between text-slate-500"><span>IVA incluido</span><span>{fmtMoney(tot.iva, empresa.simbolo)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-bold text-slate-900"><span>Total</span><span>{fmtMoney(tot.total, empresa.simbolo)}</span></div>
        </div>
      </div>
      <button type="button" className="btn-ghost btn-sm mt-2 text-brand-600" onClick={() => setOpen(true)}><Plus size={14} /> Agregar producto</button>
    </div>
  )
}
