import { useMemo, useState } from 'react'
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar } from 'recharts'
import { Download } from 'lucide-react'
import { useERP, selectores } from '@/store/erp'
import { PageHeader, Tabs, StatCard, Field, Select } from '@/components/ui'
import { fmtMoneyCompact, isoLocal, fmtMoney, fmtNum, totales, mesLabel, mesKey, sumBy, today, downloadCSV, groupBy } from '@/lib/utils'

export default function Reportes() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const año = new Date().getFullYear()
  const [tab, setTab] = useState<'ventas' | 'compras' | 'inventario' | 'rentabilidad' | 'clientes'>('ventas')
  const [desde, setDesde] = useState(`${año}-01-01`)
  const [hasta, setHasta] = useState(today())

  const facturas = useMemo(() => s.facturas.filter((f) => f.estado !== 'anulada' && f.fecha >= desde && f.fecha <= hasta), [s.facturas, desde, hasta])
  const compras = useMemo(() => s.facturasCompra.filter((f) => f.fecha >= desde && f.fecha <= hasta), [s.facturasCompra, desde, hasta])

  const ventasMes = useMemo(() => {
    const map: Record<string, { ventas: number; costo: number; unidades: number; docs: number }> = {}
    facturas.forEach((f) => {
      const k = mesKey(f.fecha)
      map[k] ??= { ventas: 0, costo: 0, unidades: 0, docs: 0 }
      map[k].ventas += totales(f.lineas).total
      map[k].docs++
      f.lineas.forEach((l) => { map[k].unidades += l.cantidad; map[k].costo += l.cantidad * (s.productos.find((p) => p.id === l.productoId)?.costo ?? 0) })
    })
    return Object.entries(map).sort().map(([k, v]) => ({ mes: mesLabel(k + '-01'), ventas: Math.round(v.ventas), costo: Math.round(v.costo), margen: Math.round(v.ventas - v.costo), unidades: v.unidades, docs: v.docs, ticket: Math.round(v.ventas / v.docs) }))
  }, [facturas, s.productos])

  const porVendedor = useMemo(() => {
    const g = groupBy(facturas, (f) => f.vendedorId)
    return Object.entries(g).map(([id, fs]) => ({ nombre: s.usuarios.find((u) => u.id === id)?.nombre ?? id, total: Math.round(sumBy(fs, (f) => totales(f.lineas).total)), docs: fs.length })).sort((a, b) => b.total - a.total)
  }, [facturas, s.usuarios])

  const porSucursal = useMemo(() => {
    const g = groupBy(facturas, (f) => f.sucursalId)
    const colors = ['#3f5ff5', '#10b981', '#f59e0b']
    return Object.entries(g).map(([id, fs], i) => ({ name: s.sucursales.find((x) => x.id === id)?.nombre ?? id, value: Math.round(sumBy(fs, (f) => totales(f.lineas).total)), color: colors[i % 3] }))
  }, [facturas, s.sucursales])

  const porCategoria = useMemo(() => {
    const map: Record<string, { venta: number; costo: number; unid: number }> = {}
    facturas.forEach((f) => f.lineas.forEach((l) => {
      const p = s.productos.find((x) => x.id === l.productoId)
      if (!p) return
      map[p.categoriaId] ??= { venta: 0, costo: 0, unid: 0 }
      map[p.categoriaId].venta += l.cantidad * l.precioUnitario * (1 - l.descuento / 100)
      map[p.categoriaId].costo += l.cantidad * p.costo
      map[p.categoriaId].unid += l.cantidad
    }))
    return s.categorias.map((c) => ({ categoria: c.nombre, color: c.color, ...map[c.id], margen: (map[c.id]?.venta ?? 0) - (map[c.id]?.costo ?? 0) })).filter((x) => x.venta).sort((a, b) => b.venta - a.venta)
  }, [facturas, s.productos, s.categorias])

  const rankingProductos = useMemo(() => {
    const map: Record<string, { unid: number; venta: number; costo: number }> = {}
    facturas.forEach((f) => f.lineas.forEach((l) => {
      const p = s.productos.find((x) => x.id === l.productoId)
      map[l.productoId] ??= { unid: 0, venta: 0, costo: 0 }
      map[l.productoId].unid += l.cantidad
      map[l.productoId].venta += l.cantidad * l.precioUnitario * (1 - l.descuento / 100)
      map[l.productoId].costo += l.cantidad * (p?.costo ?? 0)
    }))
    return Object.entries(map).map(([id, v]) => { const p = s.productos.find((x) => x.id === id); return { id, nombre: p?.nombre ?? id, codigo: p?.codigo ?? '', categoria: s.categorias.find((c) => c.id === p?.categoriaId)?.nombre ?? '', ...v, margen: v.venta - v.costo, pct: v.venta ? ((v.venta - v.costo) / v.venta) * 100 : 0 } }).sort((a, b) => b.venta - a.venta)
  }, [facturas, s.productos, s.categorias])

  const rotacion = useMemo(() => rankingProductos.slice(0, 40).map((r) => {
    const p = s.productos.find((x) => x.id === r.id)!
    const stock = selectores.stockTotal(p)
    const meses = Math.max(1, ventasMes.length)
    const rot = stock ? (r.unid / meses) / stock : 0
    return { ...r, stock, rotacion: rot, diasStock: r.unid ? Math.round((stock / (r.unid / (meses * 30))) ) : 999 }
  }), [rankingProductos, s.productos, ventasMes.length])

  const clientesTop = useMemo(() => {
    const g = groupBy(facturas, (f) => f.clienteId)
    return Object.entries(g).map(([id, fs]) => {
      const c = s.clientes.find((x) => x.id === id)
      const total = sumBy(fs, (f) => totales(f.lineas).total)
      return { id, nombre: c?.razonSocial ?? id, segmento: c?.segmento ?? '', total: Math.round(total), docs: fs.length, ticket: Math.round(total / fs.length), saldo: Math.round(sumBy(fs.filter((f) => f.estado !== 'pagada'), (f) => selectores.saldoFactura(s, f))) }
    }).sort((a, b) => b.total - a.total)
  }, [facturas, s])

  const totalVentas = sumBy(ventasMes, (m) => m.ventas)
  const totalCosto = sumBy(ventasMes, (m) => m.costo)
  const totalCompras = sumBy(compras, (f) => totales(f.lineas).total)
  const margenPct = totalVentas ? ((totalVentas - totalCosto) / totalVentas) * 100 : 0

  const abc = useMemo(() => {
    let acum = 0
    const total = sumBy(rankingProductos, (r) => r.venta)
    return rankingProductos.map((r) => { acum += r.venta; const pct = (acum / total) * 100; return { ...r, acumPct: pct, clase: pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C' } })
  }, [rankingProductos])
  const abcResumen = ['A', 'B', 'C'].map((c) => ({ clase: c, productos: abc.filter((x) => x.clase === c).length, venta: Math.round(sumBy(abc.filter((x) => x.clase === c), (x) => x.venta)), fill: c === 'A' ? '#10b981' : c === 'B' ? '#f59e0b' : '#94a3b8' }))

  return (
    <div>
      <PageHeader title="Reportes y análisis" subtitle="Indicadores de ventas, compras, inventario y rentabilidad" />
      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-4">
        <Field label="Desde"><input type="date" className="input" value={desde} onChange={(e) => setDesde(e.target.value)} /></Field>
        <Field label="Hasta"><input type="date" className="input" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Field>
        <Field label="Período rápido"><Select value="" onChange={(v) => { const d = new Date(); if (v === 'mes') { setDesde(today().slice(0, 7) + '-01'); setHasta(today()) } else if (v === 'trim') { d.setMonth(d.getMonth() - 3); setDesde(isoLocal(d)); setHasta(today()) } else if (v === 'año') { setDesde(`${año}-01-01`); setHasta(today()) } else if (v === '12m') { d.setMonth(d.getMonth() - 12); setDesde(isoLocal(d)); setHasta(today()) } }} placeholder="Elegir período..." options={[{ value: 'mes', label: 'Mes actual' }, { value: 'trim', label: 'Últimos 3 meses' }, { value: 'año', label: 'Año actual' }, { value: '12m', label: 'Últimos 12 meses' }]} /></Field>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Ventas del período" value={fmtMoneyCompact(totalVentas, sim)} tone="blue" hint={`${facturas.length} facturas`} />
        <StatCard label="Costo de mercadería" value={fmtMoneyCompact(totalCosto, sim)} tone="amber" />
        <StatCard label="Margen bruto" value={fmtMoneyCompact(totalVentas - totalCosto, sim)} tone="green" hint={`${margenPct.toFixed(1)}% sobre ventas`} />
        <StatCard label="Compras del período" value={fmtMoneyCompact(totalCompras, sim)} tone="red" />
        <StatCard label="Ticket promedio" value={fmtMoneyCompact(facturas.length ? totalVentas / facturas.length : 0, sim)} />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'ventas', label: 'Ventas' }, { value: 'compras', label: 'Compras' }, { value: 'inventario', label: 'Inventario y ABC' }, { value: 'rentabilidad', label: 'Rentabilidad' }, { value: 'clientes', label: 'Clientes' }]} />

      {tab === 'ventas' && (
        <div className="grid gap-4">
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Ventas, costo y margen por mes</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ventasMes}>
                  <defs><linearGradient id="r1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3f5ff5" stopOpacity={0.3} /><stop offset="95%" stopColor="#3f5ff5" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1e6)}M`} width={54} />
                  <Tooltip formatter={(v: number) => fmtMoney(v, sim)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="ventas" name="Ventas" stroke="#3f5ff5" fill="url(#r1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="margen" name="Margen bruto" stroke="#10b981" fill="none" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Por sucursal</h3>
              <div className="h-52"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={porSucursal} dataKey="value" nameKey="name" innerRadius={40} outerRadius={72}>{porSucursal.map((c) => <Cell key={c.name} fill={c.color} />)}</Pie><Tooltip formatter={(v: number) => fmtMoney(v, sim)} contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} /></PieChart></ResponsiveContainer></div>
            </div>
            <div className="card p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Por vendedor</h3>
              <div className="space-y-2">
                {porVendedor.map((v) => (
                  <div key={v.nombre}>
                    <div className="flex justify-between text-sm"><span className="text-slate-700">{v.nombre}</span><span className="font-semibold tabular-nums">{fmtMoney(v.total, sim)}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(v.total / (porVendedor[0]?.total || 1)) * 100}%` }} /></div>
                    <div className="text-[10px] text-slate-400">{v.docs} facturas · ticket {fmtMoney(v.total / v.docs, sim)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Ticket promedio mensual</h3>
              <div className="h-52"><ResponsiveContainer width="100%" height="100%"><LineChart data={ventasMes}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1e6)}M`} width={54} /><Tooltip formatter={(v: number) => fmtMoney(v, sim)} contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Line type="monotone" dataKey="ticket" name="Ticket promedio" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} /></LineChart></ResponsiveContainer></div>
            </div>
          </div>
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-800">Detalle mensual</h3><button className="btn-secondary btn-sm" onClick={() => downloadCSV('ventas-mensual.csv', ventasMes)}><Download size={13} /> CSV</button></div>
            <table className="table"><thead><tr><th>Mes</th><th className="text-right">Facturas</th><th className="text-right">Unidades</th><th className="text-right">Ventas</th><th className="text-right">Costo</th><th className="text-right">Margen</th><th className="text-right">% Margen</th><th className="text-right">Ticket prom.</th></tr></thead>
              <tbody>{ventasMes.map((m) => <tr key={m.mes}><td className="font-medium">{m.mes}</td><td className="num">{m.docs}</td><td className="num">{fmtNum(m.unidades)}</td><td className="num">{fmtMoney(m.ventas, sim)}</td><td className="num">{fmtMoney(m.costo, sim)}</td><td className="num text-emerald-700">{fmtMoney(m.margen, sim)}</td><td className="num">{((m.margen / m.ventas) * 100).toFixed(1)}%</td><td className="num">{fmtMoney(m.ticket, sim)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'compras' && (
        <div className="grid gap-4">
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Compras por proveedor</h3>
            <table className="table"><thead><tr><th>Proveedor</th><th>Rubro</th><th className="text-right">Facturas</th><th className="text-right">Total comprado</th><th className="text-right">% del total</th><th className="text-right">Saldo pendiente</th></tr></thead>
              <tbody>
                {Object.entries(groupBy(compras, (f) => f.proveedorId)).map(([id, fs]) => {
                  const p = s.proveedores.find((x) => x.id === id)
                  const total = sumBy(fs, (f) => totales(f.lineas).total)
                  return <tr key={id}><td className="font-medium">{p?.razonSocial}</td><td className="text-xs text-slate-500">{p?.rubro}</td><td className="num">{fs.length}</td><td className="num">{fmtMoney(total, sim)}</td><td className="num">{((total / totalCompras) * 100).toFixed(1)}%</td><td className="num text-amber-700">{fmtMoney(sumBy(fs.filter((f) => f.estado !== 'pagada'), (f) => selectores.saldoFacturaCompra(s, f)), sim)}</td></tr>
                }).sort((a, b) => 0)}
              </tbody>
            </table>
          </div>
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Evolución de compras</h3>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={Object.entries(groupBy(compras, (f) => mesKey(f.fecha))).sort().map(([k, fs]) => ({ mes: mesLabel(k + '-01'), total: Math.round(sumBy(fs, (f) => totales(f.lineas).total)) }))}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1e6)}M`} width={54} /><Tooltip formatter={(v: number) => fmtMoney(v, sim)} contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Bar dataKey="total" name="Compras" fill="#f59e0b" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
          </div>
        </div>
      )}

      {tab === 'inventario' && (
        <div className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Clasificación ABC</h3>
              <div className="h-52"><ResponsiveContainer width="100%" height="100%"><RadialBarChart innerRadius="30%" outerRadius="100%" data={abcResumen} startAngle={90} endAngle={-270}><RadialBar dataKey="venta" background /><Tooltip formatter={(v: number) => fmtMoney(v, sim)} contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} /></RadialBarChart></ResponsiveContainer></div>
              <div className="mt-2 space-y-1 text-xs">
                {abcResumen.map((a) => <div key={a.clase} className="flex justify-between"><span>Clase {a.clase} ({a.productos} productos)</span><span className="font-semibold">{fmtMoney(a.venta, sim)}</span></div>)}
              </div>
            </div>
            <div className="card p-4 lg:col-span-2">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Rotación y cobertura de stock</h3>
              <div className="max-h-72 overflow-y-auto">
                <table className="table"><thead><tr><th>Producto</th><th className="text-right">Vendido</th><th className="text-right">Stock</th><th className="text-right">Días de cobertura</th><th>Señal</th></tr></thead>
                  <tbody>{rotacion.slice(0, 20).map((r) => <tr key={r.id}><td className="truncate">{r.nombre}</td><td className="num">{fmtNum(r.unid)}</td><td className="num">{fmtNum(r.stock)}</td><td className="num">{r.diasStock > 500 ? '—' : r.diasStock}</td><td>{r.diasStock < 15 ? <span className="badge bg-rose-50 text-rose-700">Reponer ya</span> : r.diasStock > 120 ? <span className="badge bg-amber-50 text-amber-700">Sobre-stock</span> : <span className="badge bg-emerald-50 text-emerald-700">Óptimo</span>}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-800">Ranking completo de productos</h3><button className="btn-secondary btn-sm" onClick={() => downloadCSV('ranking-productos.csv', abc.map((r) => ({ Codigo: r.codigo, Producto: r.nombre, Categoria: r.categoria, Unidades: r.unid, Venta: Math.round(r.venta), Margen: Math.round(r.margen), Clase: r.clase })))}><Download size={13} /> CSV</button></div>
            <div className="max-h-96 overflow-y-auto">
              <table className="table"><thead><tr><th>#</th><th>Código</th><th>Producto</th><th>Categoría</th><th className="text-right">Unid.</th><th className="text-right">Venta</th><th className="text-right">Margen</th><th className="text-right">%</th><th>ABC</th></tr></thead>
                <tbody>{abc.map((r, i) => <tr key={r.id}><td className="text-xs text-slate-400">{i + 1}</td><td className="font-mono text-xs">{r.codigo}</td><td>{r.nombre}</td><td className="text-xs text-slate-500">{r.categoria}</td><td className="num">{fmtNum(r.unid)}</td><td className="num">{fmtMoney(r.venta, sim)}</td><td className="num text-emerald-700">{fmtMoney(r.margen, sim)}</td><td className="num">{r.pct.toFixed(0)}%</td><td><span className={`badge ${r.clase === 'A' ? 'bg-emerald-50 text-emerald-700' : r.clase === 'B' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{r.clase}</span></td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'rentabilidad' && (
        <div className="grid gap-4">
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Margen por categoría</h3>
            <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={porCategoria}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="categoria" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1e6)}M`} width={54} /><Tooltip formatter={(v: number) => fmtMoney(v, sim)} contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="venta" name="Venta" fill="#3f5ff5" radius={[4, 4, 0, 0]} /><Bar dataKey="margen" name="Margen" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
          </div>
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Detalle por categoría</h3>
            <table className="table"><thead><tr><th>Categoría</th><th className="text-right">Unidades</th><th className="text-right">Venta</th><th className="text-right">Costo</th><th className="text-right">Margen</th><th className="text-right">% Margen</th><th className="text-right">% de la venta total</th></tr></thead>
              <tbody>{porCategoria.map((c) => <tr key={c.categoria}><td><span className="badge" style={{ background: c.color + '18', color: c.color }}>{c.categoria}</span></td><td className="num">{fmtNum(c.unid ?? 0)}</td><td className="num">{fmtMoney(c.venta ?? 0, sim)}</td><td className="num">{fmtMoney(c.costo ?? 0, sim)}</td><td className="num text-emerald-700">{fmtMoney(c.margen, sim)}</td><td className="num">{c.venta ? ((c.margen / c.venta) * 100).toFixed(1) : 0}%</td><td className="num">{totalVentas ? (((c.venta ?? 0) / totalVentas) * 100).toFixed(1) : 0}%</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'clientes' && (
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-800">Ranking de clientes del período</h3><button className="btn-secondary btn-sm" onClick={() => downloadCSV('ranking-clientes.csv', clientesTop)}><Download size={13} /> CSV</button></div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="table"><thead><tr><th>#</th><th>Cliente</th><th>Segmento</th><th className="text-right">Facturas</th><th className="text-right">Total comprado</th><th className="text-right">Ticket promedio</th><th className="text-right">% acumulado</th><th className="text-right">Saldo pendiente</th></tr></thead>
              <tbody>
                {(() => { let acum = 0; return clientesTop.map((c, i) => { acum += c.total; return (
                  <tr key={c.id}><td className="text-xs text-slate-400">{i + 1}</td><td className="font-medium">{c.nombre}</td><td className="text-xs capitalize text-slate-500">{c.segmento}</td><td className="num">{c.docs}</td><td className="num">{fmtMoney(c.total, sim)}</td><td className="num">{fmtMoney(c.ticket, sim)}</td><td className="num">{((acum / totalVentas) * 100).toFixed(1)}%</td><td className="num text-amber-700">{c.saldo ? fmtMoney(c.saldo, sim) : '—'}</td></tr>
                ) }) })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
