import type { LineaDocumento } from '@/types'
import { useERP } from '@/store/erp'
import { fmtMoney, fmtDate, lineaSubtotal, totales } from '@/lib/utils'
import { Printer } from 'lucide-react'

export function DocumentoPrint({ tipo, numero, fecha, vencimiento, timbrado, condicion, tercero, lineas, notas, extra, estado }: {
  tipo: string
  numero: string
  fecha: string
  vencimiento?: string
  timbrado?: string
  condicion?: string
  tercero: { nombre: string; ruc: string; direccion: string; ciudad?: string; telefono?: string; email?: string }
  lineas: LineaDocumento[]
  notas?: string
  extra?: { k: string; v: string }[]
  estado?: string
}) {
  const empresa = useERP((s) => s.empresa)
  const tot = totales(lineas)
  const iva10 = lineas.filter((l) => l.iva === 10).reduce((s, l) => s + lineaSubtotal(l), 0)
  const iva5 = lineas.filter((l) => l.iva === 5).reduce((s, l) => s + lineaSubtotal(l), 0)
  const exenta = lineas.filter((l) => l.iva === 0).reduce((s, l) => s + lineaSubtotal(l), 0)
  return (
    <div className="relative rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-800 print:border-0 print:p-0">
      {estado === 'anulada' && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="rotate-[-20deg] rounded border-4 border-rose-300 px-6 py-2 text-5xl font-black uppercase tracking-widest text-rose-300/70">Anulada</span></div>}
      <button className="btn-secondary btn-sm no-print absolute right-4 top-4" onClick={() => window.print()}><Printer size={14} /> Imprimir</button>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-lg font-black text-white">Ñ</div>
            <div>
              <div className="text-lg font-bold leading-tight text-slate-900">{empresa.razonSocial}</div>
              <div className="text-xs text-slate-500">{empresa.nombreFantasia}</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <div>{empresa.direccion}, {empresa.ciudad}</div>
            <div>Tel: {empresa.telefono} · {empresa.email}</div>
            <div>RUC: {empresa.ruc}</div>
          </div>
        </div>
        <div className="min-w-[220px] rounded-lg border border-slate-300 p-3 text-right">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tipo}</div>
          <div className="text-xl font-bold text-slate-900">{numero}</div>
          {timbrado && <div className="mt-1 text-[11px] text-slate-500">Timbrado N° {timbrado} · Válido hasta {fmtDate(empresa.vencimientoTimbrado)}</div>}
          <div className="mt-1 text-xs text-slate-600">Fecha: {fmtDate(fecha)}</div>
          {vencimiento && <div className="text-xs text-slate-600">Vencimiento: {fmtDate(vencimiento)}</div>}
          {condicion && <div className="text-xs text-slate-600">Condición: <span className="font-medium capitalize">{condicion}</span></div>}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cliente / Tercero</div>
          <div className="font-semibold text-slate-900">{tercero.nombre}</div>
          <div className="text-xs text-slate-600">RUC/CI: {tercero.ruc}</div>
          <div className="text-xs text-slate-600">{tercero.direccion}{tercero.ciudad ? `, ${tercero.ciudad}` : ''}</div>
          {tercero.telefono && <div className="text-xs text-slate-600">{tercero.telefono} · {tercero.email}</div>}
        </div>
        {extra && extra.length > 0 && (
          <div className="sm:text-right">
            {extra.map((e) => <div key={e.k} className="text-xs text-slate-600"><span className="text-slate-400">{e.k}:</span> {e.v}</div>)}
          </div>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-slate-300 text-[11px] uppercase tracking-wide text-slate-500">
            <th className="py-2 text-left">Descripción</th><th className="py-2 text-right">Cant.</th><th className="py-2 text-right">P. Unit.</th><th className="py-2 text-right">Desc.</th><th className="py-2 text-right">Exentas</th><th className="py-2 text-right">5%</th><th className="py-2 text-right">10%</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((l, i) => {
            const sub = lineaSubtotal(l)
            return (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-1.5">{l.descripcion}</td>
                <td className="py-1.5 text-right tabular-nums">{l.cantidad}</td>
                <td className="py-1.5 text-right tabular-nums">{fmtMoney(l.precioUnitario, '')}</td>
                <td className="py-1.5 text-right tabular-nums">{l.descuento ? `${l.descuento}%` : '—'}</td>
                <td className="py-1.5 text-right tabular-nums">{l.iva === 0 ? fmtMoney(sub, '') : ''}</td>
                <td className="py-1.5 text-right tabular-nums">{l.iva === 5 ? fmtMoney(sub, '') : ''}</td>
                <td className="py-1.5 text-right tabular-nums">{l.iva === 10 ? fmtMoney(sub, '') : ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="mt-4 flex flex-wrap justify-between gap-4">
        <div className="max-w-sm text-xs text-slate-500">
          {notas && <><div className="font-semibold text-slate-600">Observaciones</div><div>{notas}</div></>}
        </div>
        <div className="w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between text-slate-600"><span>Subtotal exentas</span><span>{fmtMoney(exenta, empresa.simbolo)}</span></div>
          <div className="flex justify-between text-slate-600"><span>Subtotal gravadas 5%</span><span>{fmtMoney(iva5, empresa.simbolo)}</span></div>
          <div className="flex justify-between text-slate-600"><span>Subtotal gravadas 10%</span><span>{fmtMoney(iva10, empresa.simbolo)}</span></div>
          <div className="flex justify-between border-t border-slate-300 pt-1 text-base font-bold text-slate-900"><span>TOTAL</span><span>{fmtMoney(tot.total, empresa.simbolo)}</span></div>
          <div className="flex justify-between text-xs text-slate-500"><span>Liquidación IVA (5%)</span><span>{fmtMoney(iva5 - iva5 / 1.05, empresa.simbolo)}</span></div>
          <div className="flex justify-between text-xs text-slate-500"><span>Liquidación IVA (10%)</span><span>{fmtMoney(iva10 - iva10 / 1.1, empresa.simbolo)}</span></div>
          <div className="flex justify-between text-xs font-medium text-slate-600"><span>Total IVA</span><span>{fmtMoney(tot.iva, empresa.simbolo)}</span></div>
        </div>
      </div>
      <div className="mt-6 border-t border-dashed border-slate-300 pt-3 text-center text-[10px] text-slate-400">Documento generado por Ñandutí ERP · {empresa.web}</div>
    </div>
  )
}
