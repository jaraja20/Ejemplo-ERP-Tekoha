import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, FileText, Users, Truck, Package, Wallet, BookOpen, UserCog, BarChart3, Settings,
  Bell, Search, LogOut, ChevronDown, Menu, X, CheckSquare, Store, type LucideIcon,
} from 'lucide-react'
import { useERP } from '@/store/erp'
import { DEMO_EFIMERA } from '@/lib/idbStorage'
import type { Rol } from '@/types'
import { cn, fmtDateTime } from '@/lib/utils'
import { Avatar, Toaster } from '@/components/ui'

interface NavItem { to: string; label: string; icon: LucideIcon; roles?: Rol[]; children?: { to: string; label: string }[] }

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ventas', label: 'Ventas', icon: ShoppingCart, roles: ['admin', 'ventas'], children: [
    { to: '/ventas/pos', label: 'Punto de venta' }, { to: '/ventas/pedidos', label: 'Pedidos' }, { to: '/ventas/presupuestos', label: 'Presupuestos' },
  ] },
  { to: '/facturacion', label: 'Facturación', icon: FileText, roles: ['admin', 'ventas', 'contabilidad'], children: [
    { to: '/facturacion/facturas', label: 'Facturas' }, { to: '/facturacion/cobros', label: 'Cobros' }, { to: '/facturacion/notas-credito', label: 'Notas de crédito' },
  ] },
  { to: '/clientes', label: 'Clientes / CRM', icon: Users, roles: ['admin', 'ventas'], children: [
    { to: '/clientes', label: 'Clientes' }, { to: '/clientes/crm', label: 'Oportunidades' },
  ] },
  { to: '/compras', label: 'Compras', icon: Truck, roles: ['admin', 'compras', 'contabilidad', 'almacen'], children: [
    { to: '/compras/ordenes', label: 'Órdenes de compra' }, { to: '/compras/facturas', label: 'Facturas de compra' }, { to: '/compras/pagos', label: 'Pagos' }, { to: '/compras/proveedores', label: 'Proveedores' },
  ] },
  { to: '/inventario', label: 'Inventario', icon: Package, roles: ['admin', 'compras', 'almacen', 'ventas'], children: [
    { to: '/inventario/productos', label: 'Productos' }, { to: '/inventario/stock', label: 'Stock por depósito' }, { to: '/inventario/movimientos', label: 'Movimientos' },
  ] },
  { to: '/finanzas', label: 'Finanzas', icon: Wallet, roles: ['admin', 'contabilidad'], children: [
    { to: '/finanzas/caja', label: 'Caja y bancos' }, { to: '/finanzas/cobrar', label: 'Cuentas por cobrar' }, { to: '/finanzas/pagar', label: 'Cuentas por pagar' }, { to: '/finanzas/flujo', label: 'Flujo de caja' },
  ] },
  { to: '/contabilidad', label: 'Contabilidad', icon: BookOpen, roles: ['admin', 'contabilidad'], children: [
    { to: '/contabilidad/asientos', label: 'Libro diario' }, { to: '/contabilidad/mayor', label: 'Libro mayor' }, { to: '/contabilidad/balance', label: 'Balance y resultados' }, { to: '/contabilidad/plan', label: 'Plan de cuentas' },
  ] },
  { to: '/rrhh', label: 'Recursos Humanos', icon: UserCog, roles: ['admin', 'rrhh'], children: [
    { to: '/rrhh/empleados', label: 'Empleados' }, { to: '/rrhh/asistencia', label: 'Asistencia' }, { to: '/rrhh/vacaciones', label: 'Vacaciones' }, { to: '/rrhh/liquidaciones', label: 'Liquidación de sueldos' },
  ] },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, roles: ['admin', 'ventas', 'contabilidad', 'compras'] },
  { to: '/tareas', label: 'Tareas', icon: CheckSquare },
  { to: '/config', label: 'Configuración', icon: Settings, roles: ['admin'] },
]

export function puedeVer(item: NavItem, rol: Rol) {
  return !item.roles || item.roles.includes(rol)
}

export function AppLayout() {
  const usuario = useERP((s) => s.usuarioActual)
  const empresa = useERP((s) => s.empresa)
  const logout = useERP((s) => s.logout)
  const notificaciones = useERP((s) => s.notificaciones)
  const marcarLeidas = useERP((s) => s.marcarNotificacionesLeidas)
  const navigate = useNavigate()
  const location = useLocation()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [mobile, setMobile] = useState(false)
  const [notiOpen, setNotiOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [q, setQ] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const notiRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!usuario) navigate('/login', { replace: true })
  }, [usuario, navigate])

  useEffect(() => {
    const seg = '/' + location.pathname.split('/')[1]
    setOpenGroups((g) => ({ ...g, [seg]: true }))
    setMobile(false)
  }, [location.pathname])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (notiRef.current && !notiRef.current.contains(e.target as Node)) { setNotiOpen(false); setUserOpen(false) } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const noLeidas = notificaciones.filter((n) => !n.leida).length
  const clientes = useERP((s) => s.clientes)
  const productos = useERP((s) => s.productos)
  const facturas = useERP((s) => s.facturas)
  const resultados = useMemo(() => {
    if (q.length < 2) return []
    const n = q.toLowerCase()
    const r: { label: string; sub: string; to: string }[] = []
    clientes.filter((c) => c.razonSocial.toLowerCase().includes(n) || c.ruc.includes(n)).slice(0, 4).forEach((c) => r.push({ label: c.razonSocial, sub: 'Cliente · ' + c.ruc, to: `/clientes/${c.id}` }))
    productos.filter((p) => p.nombre.toLowerCase().includes(n) || p.codigo.toLowerCase().includes(n)).slice(0, 4).forEach((p) => r.push({ label: p.nombre, sub: 'Producto · ' + p.codigo, to: `/inventario/productos?q=${encodeURIComponent(p.codigo)}` }))
    facturas.filter((f) => f.numero.includes(n)).slice(0, 3).forEach((f) => r.push({ label: f.numero, sub: 'Factura · ' + f.estado, to: `/facturacion/facturas?q=${encodeURIComponent(f.numero)}` }))
    return r
  }, [q, clientes, productos, facturas])

  if (!usuario) return null

  const Sidebar = (
    <aside className="flex h-full w-64 flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-lg font-black text-white">Ñ</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-white">Ñandutí ERP</div>
          <div className="truncate text-[11px] text-slate-400">{empresa.nombreFantasia}</div>
        </div>
        <button className="ml-auto text-slate-400 lg:hidden" onClick={() => setMobile(false)}><X size={18} /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {NAV.filter((i) => puedeVer(i, usuario.rol)).map((item) => {
          const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
          if (!item.children) {
            return (
              <NavLink key={item.to} to={item.to} className={cn('mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition', active ? 'bg-brand-600 text-white' : 'hover:bg-slate-800 hover:text-white')}>
                <item.icon size={17} /> {item.label}
              </NavLink>
            )
          }
          const open = openGroups[item.to] ?? active
          return (
            <div key={item.to} className="mb-0.5">
              <button className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition', active ? 'text-white' : 'hover:bg-slate-800 hover:text-white')} onClick={() => setOpenGroups((g) => ({ ...g, [item.to]: !open }))}>
                <item.icon size={17} /> {item.label}
                <ChevronDown size={14} className={cn('ml-auto transition', open && 'rotate-180')} />
              </button>
              {open && (
                <div className="ml-4 border-l border-slate-700 pl-3">
                  {item.children.map((c) => (
                    <NavLink key={c.to} to={c.to} end className={({ isActive }) => cn('block rounded-md px-2.5 py-1.5 text-[13px] transition', isActive ? 'bg-slate-800 font-medium text-white' : 'text-slate-400 hover:text-white')}>
                      {c.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
      <div className="border-t border-slate-800 p-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5"><Store size={12} /> {empresa.razonSocial}</div>
        <div className="mt-0.5">RUC {empresa.ruc}</div>
      </div>
    </aside>
  )

  return (
    <div className="flex h-full">
      <div className="hidden lg:block no-print">{Sidebar}</div>
      {mobile && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setMobile(false)} />
          <div className="absolute inset-y-0 left-0">{Sidebar}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {DEMO_EFIMERA && (
          <div className="no-print flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
            <span><b>Versión de demostración.</b> Podés probar todo: los cambios no se guardan y al recargar la página vuelve todo al estado original.</span>
            <button className="font-semibold underline" onClick={() => { useERP.getState().resetData(); useERP.getState().toast('Datos de demostración restaurados') }}>Restaurar ahora</button>
          </div>
        )}
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
          <button className="btn-ghost btn-sm lg:hidden" onClick={() => setMobile(true)}><Menu size={18} /></button>
          <div className="relative flex-1 max-w-lg">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Buscar clientes, productos, facturas..." value={q} onChange={(e) => { setQ(e.target.value); setSearchOpen(true) }} onFocus={() => setSearchOpen(true)} onBlur={() => setTimeout(() => setSearchOpen(false), 150)} />
            {searchOpen && resultados.length > 0 && (
              <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                {resultados.map((r) => (
                  <button key={r.to + r.label} className="flex w-full flex-col px-3 py-2 text-left hover:bg-slate-50" onMouseDown={() => { navigate(r.to); setQ('') }}>
                    <span className="text-sm font-medium text-slate-800">{r.label}</span>
                    <span className="text-xs text-slate-500">{r.sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1" ref={notiRef}>
            <div className="relative">
              <button className="btn-ghost btn-sm relative" onClick={() => { setNotiOpen((o) => !o); setUserOpen(false) }}>
                <Bell size={18} />
                {noLeidas > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{noLeidas}</span>}
              </button>
              {notiOpen && (
                <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                    <span className="text-sm font-semibold">Notificaciones</span>
                    <button className="text-xs text-brand-600 hover:underline" onClick={marcarLeidas}>Marcar todas leídas</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notificaciones.slice(0, 12).map((n) => (
                      <button key={n.id} className={cn('flex w-full gap-2.5 border-b border-slate-50 px-3 py-2.5 text-left hover:bg-slate-50', !n.leida && 'bg-brand-50/40')} onClick={() => { if (n.link) navigate(n.link); setNotiOpen(false) }}>
                        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.tipo === 'error' ? 'bg-rose-500' : n.tipo === 'warning' ? 'bg-amber-500' : n.tipo === 'success' ? 'bg-emerald-500' : 'bg-sky-500')} />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-slate-800">{n.titulo}</span>
                          <span className="block text-xs text-slate-500">{n.mensaje}</span>
                          <span className="block text-[10px] text-slate-400">{fmtDateTime(n.fecha)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100" onClick={() => { setUserOpen((o) => !o); setNotiOpen(false) }}>
                <Avatar name={usuario.nombre} size="sm" />
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-medium leading-tight text-slate-800">{usuario.nombre}</span>
                  <span className="block text-[11px] capitalize leading-tight text-slate-500">{usuario.rol}</span>
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              {userOpen && (
                <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                  <div className="px-3 py-2 text-xs text-slate-500">{usuario.email}</div>
                  <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50" onClick={() => { logout(); navigate('/login') }}><LogOut size={15} /> Cerrar sesión</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  )
}
