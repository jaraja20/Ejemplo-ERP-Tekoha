import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'
import { TrendingUp, Receipt, AlertTriangle, Package, Users, Wallet, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react'
import { useERP, selectores } from '@/store/erp'
import { StatCard, EstadoBadge, Avatar, PageHeader } from '@/components/ui'
import { fmtMoneyCompact, isoLocal, fmtMoney, fmtDate, totales, mesKey, mesLabel, today, sumBy, fmtDateTime } from '@/lib/utils'

export default function Dashboard() {
  const s = useERP()
  const navigate = useNavigate()
  const sim = s.empresa.simbolo
  const hoy = today()
  const mesActual = hoy.slice(0, 7)
  const d = new Date(); d.setMonth(d.getMonth() - 1)
  const mesAnterior = isoLocal(d).slice(0, 7)

  const stats = useMemo(() => {
    const validas = s.facturas.filter((f) => f.estado !== 'anulada')
    const ventasMes = sumBy(validas.filter((f) => mesKey(f.fecha) === mesActual), (f) => totales(f.lineas).total)
    // Se compara contra el mismo tramo del mes anterior: de lo contrario un mes en curso
    // siempre aparece cayendo frente a un mes anterior completo.
    const diaDelMes = Number(hoy.slice(8, 10))
    const ventasMesAnt = sumBy(validas.filter((f) => mesKey(f.fecha) === mesAnterior && Number(f.fecha.slice(8, 10)) <= diaDelMes), (f) => totales(f.lineas).total)
    const ventasHoy = sumBy(validas.filter((f) => f.fecha === hoy), (f) => totales(f.lineas).total)
    const porCobrar = sumBy(validas.filter((f) => ['pendiente', 'parcial', 'vencida'].includes(f.estado)), (f) => selectores.saldoFactura(s, f))
    const vencidas = validas.filter((f) => f.estado === 'vencida')
    const porPagar = sumBy(s.facturasCompra.filter((f) => f.estado !== 'pagada'), (f) => selectores.saldoFacturaCompra(s, f))
    const bajoStock = s.productos.filter((p) => p.activo && p.stockPorDeposito.d01 < p.stockMinimo)
    const saldoTotal = sumBy(s.cuentasFinancieras.filter((c) => c.activa), (c) => selectores.saldoCuenta(s, c.id))
    const pedidosAbiertos = s.pedidos.filter((p) => ['pendiente', 'confirmado', 'preparando', 'enviado'].includes(p.estado))
    const variacion = ventasMesAnt ? ((ventasMes - ventasMesAnt) / ventasMesAnt) * 100 : 0
    return { ventasMes, ventasMesAnt, ventasHoy, porCobrar, vencidas, porPagar, bajoStock, saldoTotal, pedidosAbiertos, variacion }
  }, [s, hoy, mesActual, mesAnterior])

  const serieMensual = useMemo(() => {
    const map: Record<string, { mes: string; ventas: number; compras: number }> = {}
    for (let i = 11; i >= 0; i--) {
      const dd = new Date(); dd.setDate(1); dd.setMonth(dd.getMonth() - i)
      const k = isoLocal(dd).slice(0, 7)
      map[k] = { mes: mesLabel(k + '-01'), ventas: 0, compras: 0 }
    }
    s.facturas.filter((f) => f.estado !== 'anulada').forEach((f) => { const k = mesKey(f.fecha); if (map[k]) map[k].ventas += totales(f.lineas).total })
    s.facturasCompra.forEach((f) => { const k = mesKey(f.fecha); if (map[k]) map[k].compras += totales(f.lineas).total })
    return Object.values(map)
  }, [s.facturas, s.facturasCompra])

  const porCategoria = useMemo(() => {
    const map: Record<string, number> = {}
    s.facturas.filter((f) => f.estado !== 'anulada' && mesKey(f.fecha) === mesActual).forEach((f) => f.lineas.forEach((l) => {
      const p = s.productos.find((x) => x.id === l.productoId)
      if (!p) return
      map[p.categoriaId] = (map[p.categoriaId] ?? 0) + l.cantidad * l.precioUnitario * (1 - l.descuento / 100)
    }))
    return s.categorias.map((c) => ({ name: c.nombre, value: Math.round(map[c.id] ?? 0), color: c.color })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value)
  }, [s, mesActual])

  const topClientes = useMemo(() => {
    const map: Record<string, number> = {}
    s.facturas.filter((f) => f.estado !== 'anulada' && f.fecha >= hoy.slice(0, 4) + '-01-01').forEach((f) => { map[f.clienteId] = (map[f.clienteId] ?? 0) + totales(f.lineas).total })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, v]) => ({ cliente: s.clientes.find((c) => c.id === id), total: v }))
  }, [s, hoy])

  const topProductos = useMemo(() => {
    const map: Record<string, number> = {}
    s.facturas.filter((f) => f.estado !== 'anulada' && mesKey(f.fecha) === mesActual).forEach((f) => f.lineas.forEach((l) => { map[l.productoId] = (map[l.productoId] ?? 0) + l.cantidad }))
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, q]) => ({ nombre: s.productos.find((p) => p.id === id)?.nombre.slice(0, 22) ?? id, cantidad: q }))
  }, [s, mesActual])

  const tareasPendientes = s.tareas.filter((t) => t.estado !== 'completada' && (t.asignadoId === s.usuarioActual?.id || s.usuarioActual?.rol === 'admin')).slice(0, 5)

  return (
    <div>
      <PageHeader title={`Hola, ${s.usuarioActual?.nombre.split(' ')[0]}`} subtitle={`Resumen general al ${fmtDate(hoy, "EEEE d 'de' MMMM yyyy")}`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ventas del mes" value={fmtMoneyCompact(stats.ventasMes, sim)} tone="blue" icon={<TrendingUp size={20} />}
          hint={<span className={stats.variacion >= 0 ? 'inline-flex items-center gap-0.5 text-emerald-600' : 'inline-flex items-center gap-0.5 text-rose-600'}>{stats.variacion >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(stats.variacion).toFixed(1)}% vs igual tramo del mes anterior</span>} />
        <StatCard label="Por cobrar" value={fmtMoneyCompact(stats.porCobrar, sim)} tone="amber" icon={<Receipt size={20} />} hint={`${stats.vencidas.length} facturas vencidas`} onClick={() => navigate('/finanzas/cobrar')} />
        <StatCard label="Disponible en caja y bancos" value={fmtMoneyCompact(stats.saldoTotal, sim)} tone="green" icon={<Wallet size={20} />} hint={`Por pagar a proveedores: ${fmtMoneyCompact(stats.porPagar, sim)}`} onClick={() => navigate('/finanzas/caja')} />
        <StatCard label="Alertas de stock" value={String(stats.bajoStock.length)} tone="red" icon={<AlertTriangle size={20} />} hint="productos bajo mínimo en Depósito Central" onClick={() => navigate('/inventario/productos?filtro=bajo')} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="card p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Ventas vs Compras · últimos 12 meses</h3>
            <span className="text-xs text-slate-500">Hoy: {fmtMoney(stats.ventasHoy, sim)}</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serieMensual} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3f5ff5" stopOpacity={0.35} /><stop offset="95%" stopColor="#3f5ff5" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1e6)}M`} width={54} />
                <Tooltip formatter={(v: number) => fmtMoney(v, sim)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Area type="monotone" dataKey="ventas" name="Ventas" stroke="#3f5ff5" fill="url(#gv)" strokeWidth={2} />
                <Area type="monotone" dataKey="compras" name="Compras" stroke="#f59e0b" fill="url(#gc)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Ventas por categoría · mes actual</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porCategoria} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {porCategoria.map((c) => <Cell key={c.name} fill={c.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtMoney(v, sim)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><Users size={15} className="text-brand-600" /> Top clientes del año</h3>
          <div className="space-y-2.5">
            {topClientes.map(({ cliente, total }, i) => cliente && (
              <button key={cliente.id} className="flex w-full items-center gap-2.5 text-left hover:opacity-80" onClick={() => navigate(`/clientes/${cliente.id}`)}>
                <span className="w-4 text-xs font-bold text-slate-400">{i + 1}</span>
                <Avatar name={cliente.razonSocial} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{cliente.razonSocial}</span>
                <span className="text-xs font-semibold tabular-nums text-slate-800">{fmtMoney(total, sim)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><Package size={15} className="text-brand-600" /> Productos más vendidos (unid.)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductos} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="cantidad" name="Unidades" fill="#3f5ff5" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><Clock size={15} className="text-brand-600" /> Pedidos en curso ({stats.pedidosAbiertos.length})</h3>
          <div className="space-y-2">
            {stats.pedidosAbiertos.slice(0, 6).map((p) => (
              <button key={p.id} className="flex w-full items-center justify-between text-left text-sm hover:opacity-80" onClick={() => navigate('/ventas/pedidos')}>
                <span className="min-w-0">
                  <span className="block font-medium text-slate-700">{p.numero}</span>
                  <span className="block truncate text-xs text-slate-500">{s.clientes.find((c) => c.id === p.clienteId)?.razonSocial}</span>
                </span>
                <EstadoBadge estado={p.estado} />
              </button>
            ))}
            {stats.pedidosAbiertos.length === 0 && <p className="text-xs text-slate-400">No hay pedidos en curso</p>}
          </div>
        </div>
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Mis tareas pendientes</h3>
          <div className="space-y-2">
            {tareasPendientes.map((t) => (
              <button key={t.id} className="flex w-full items-start gap-2 text-left text-sm hover:opacity-80" onClick={() => navigate('/tareas')}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.prioridad === 'alta' ? 'bg-rose-500' : t.prioridad === 'media' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                <span className="min-w-0">
                  <span className="block truncate text-slate-700">{t.titulo}</span>
                  <span className={`block text-xs ${t.fechaLimite < hoy ? 'text-rose-600' : 'text-slate-500'}`}>Vence {fmtDate(t.fechaLimite)} · {t.modulo}</span>
                </span>
              </button>
            ))}
            {tareasPendientes.length === 0 && <p className="text-xs text-slate-400">Sin tareas pendientes</p>}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Facturas vencidas con mayor saldo</h3>
          <table className="table">
            <thead><tr><th>Factura</th><th>Cliente</th><th>Venc.</th><th className="text-right">Saldo</th></tr></thead>
            <tbody>
              {stats.vencidas.map((f) => ({ f, saldo: selectores.saldoFactura(s, f) })).sort((a, b) => b.saldo - a.saldo).slice(0, 6).map(({ f, saldo }) => (
                <tr key={f.id} className="cursor-pointer" onClick={() => navigate(`/facturacion/facturas?q=${f.numero}`)}>
                  <td className="font-mono text-xs">{f.numero}</td>
                  <td className="truncate">{s.clientes.find((c) => c.id === f.clienteId)?.razonSocial}</td>
                  <td className="text-rose-600">{fmtDate(f.vencimiento)}</td>
                  <td className="num font-medium">{fmtMoney(saldo, sim)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Actividad reciente</h3>
          <div className="space-y-2.5">
            {s.log.slice(0, 7).map((l) => {
              const u = s.usuarios.find((x) => x.id === l.usuarioId)
              return (
                <div key={l.id} className="flex items-center gap-2.5 text-sm">
                  <Avatar name={u?.nombre ?? '?'} size="sm" />
                  <span className="min-w-0 flex-1 truncate"><span className="font-medium text-slate-700">{u?.nombre}</span> <span className="text-slate-500">{l.accion.toLowerCase()}</span> <span className="text-slate-400">{l.detalle}</span></span>
                  <span className="shrink-0 text-[11px] text-slate-400">{fmtDateTime(l.fecha)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
