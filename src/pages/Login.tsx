import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, ShieldCheck, ShoppingCart, Wallet, Package, UserCog, Truck } from 'lucide-react'
import { useERP } from '@/store/erp'

const demoUsers = [
  { email: 'admin@nanduti.com.py', pass: 'admin123', rol: 'Administrador', icon: ShieldCheck, desc: 'Acceso total a todos los módulos' },
  { email: 'ventas@nanduti.com.py', pass: 'ventas123', rol: 'Ventas', icon: ShoppingCart, desc: 'POS, pedidos, facturación y CRM' },
  { email: 'contabilidad@nanduti.com.py', pass: 'conta123', rol: 'Contabilidad', icon: Wallet, desc: 'Finanzas, contabilidad y compras' },
  { email: 'compras@nanduti.com.py', pass: 'compras123', rol: 'Compras', icon: Truck, desc: 'Órdenes de compra y proveedores' },
  { email: 'deposito@nanduti.com.py', pass: 'deposito123', rol: 'Depósito', icon: Package, desc: 'Inventario y recepciones' },
  { email: 'rrhh@nanduti.com.py', pass: 'rrhh123', rol: 'RRHH', icon: UserCog, desc: 'Empleados, asistencia y sueldos' },
]

export default function Login() {
  const login = useERP((s) => s.login)
  const empresa = useERP((s) => s.empresa)
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@nanduti.com.py')
  const [pass, setPass] = useState('admin123')
  const [error, setError] = useState('')

  const submit = (e?: React.FormEvent, em = email, pw = pass) => {
    e?.preventDefault()
    if (login(em, pw)) navigate('/', { replace: true })
    else setError('Credenciales inválidas o usuario inactivo')
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 p-4">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="card p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-2xl font-black text-white">Ñ</div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Ñandutí ERP</h1>
              <p className="text-sm text-slate-500">{empresa.razonSocial}</p>
            </div>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input className="input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button className="btn-primary w-full" type="submit"><LogIn size={16} /> Ingresar</button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-400">Sistema de demostración · Datos ficticios · Los cambios no se guardan</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-white backdrop-blur">
          <h2 className="text-base font-semibold">Usuarios de demostración</h2>
          <p className="mb-4 mt-1 text-sm text-slate-300">Cada rol ve solo los módulos que le corresponden. Hacé clic para ingresar directamente.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {demoUsers.map((u) => (
              <button key={u.email} onClick={() => submit(undefined, u.email, u.pass)} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left transition hover:border-brand-400 hover:bg-white/10">
                <u.icon size={18} className="mt-0.5 shrink-0 text-brand-300" />
                <span>
                  <span className="block text-sm font-semibold">{u.rol}</span>
                  <span className="block text-xs text-slate-300">{u.desc}</span>
                  <span className="mt-1 block font-mono text-[10px] text-slate-400">{u.email} / {u.pass}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-brand-500/20 p-3 text-xs text-brand-100">
            <strong>Módulos incluidos:</strong> Dashboard, Punto de venta, Pedidos, Presupuestos, Facturación, Cobros, Notas de crédito, Clientes y CRM, Compras, Proveedores, Inventario multi-depósito, Caja y bancos, Cuentas por cobrar/pagar, Flujo de caja, Contabilidad (diario, mayor, balance), RRHH (empleados, asistencia, vacaciones, sueldos), Reportes, Tareas y Configuración.
          </div>
        </div>
      </div>
    </div>
  )
}
