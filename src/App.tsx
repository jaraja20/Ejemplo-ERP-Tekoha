import { Routes, Route, Navigate } from 'react-router-dom'
import { useHydrated } from '@/store/erp'
import { AppLayout } from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import PuntoVenta from '@/pages/ventas/PuntoVenta'
import Pedidos from '@/pages/ventas/Pedidos'
import Presupuestos from '@/pages/ventas/Presupuestos'
import Facturas from '@/pages/facturacion/Facturas'
import Cobros from '@/pages/facturacion/Cobros'
import NotasCredito from '@/pages/facturacion/NotasCredito'
import Clientes from '@/pages/clientes/Clientes'
import ClienteDetalle from '@/pages/clientes/ClienteDetalle'
import CRM from '@/pages/clientes/CRM'
import OrdenesCompra from '@/pages/compras/OrdenesCompra'
import FacturasCompra from '@/pages/compras/FacturasCompra'
import Pagos from '@/pages/compras/Pagos'
import Proveedores from '@/pages/proveedores/Proveedores'
import Productos from '@/pages/inventario/Productos'
import Stock from '@/pages/inventario/Stock'
import Movimientos from '@/pages/inventario/Movimientos'
import Caja from '@/pages/finanzas/Caja'
import CuentasCobrar from '@/pages/finanzas/CuentasCobrar'
import CuentasPagar from '@/pages/finanzas/CuentasPagar'
import FlujoCaja from '@/pages/finanzas/FlujoCaja'
import Asientos from '@/pages/contabilidad/Asientos'
import Mayor from '@/pages/contabilidad/Mayor'
import Balance from '@/pages/contabilidad/Balance'
import PlanCuentas from '@/pages/contabilidad/PlanCuentas'
import Empleados from '@/pages/rrhh/Empleados'
import Asistencia from '@/pages/rrhh/Asistencia'
import Vacaciones from '@/pages/rrhh/Vacaciones'
import Liquidaciones from '@/pages/rrhh/Liquidaciones'
import Reportes from '@/pages/reportes/Reportes'
import Tareas from '@/pages/Tareas'
import Configuracion from '@/pages/config/Configuracion'

export default function App() {
  const hydrated = useHydrated()
  if (!hydrated) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-brand-600 text-2xl font-black text-white">Ñ</div>
        <p className="text-sm text-slate-500">Cargando Ñandutí ERP...</p>
      </div>
    )
  }
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/ventas" element={<Navigate to="/ventas/pedidos" replace />} />
        <Route path="/ventas/pos" element={<PuntoVenta />} />
        <Route path="/ventas/pedidos" element={<Pedidos />} />
        <Route path="/ventas/presupuestos" element={<Presupuestos />} />
        <Route path="/facturacion" element={<Navigate to="/facturacion/facturas" replace />} />
        <Route path="/facturacion/facturas" element={<Facturas />} />
        <Route path="/facturacion/cobros" element={<Cobros />} />
        <Route path="/facturacion/notas-credito" element={<NotasCredito />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/crm" element={<CRM />} />
        <Route path="/clientes/:id" element={<ClienteDetalle />} />
        <Route path="/compras" element={<Navigate to="/compras/ordenes" replace />} />
        <Route path="/compras/ordenes" element={<OrdenesCompra />} />
        <Route path="/compras/facturas" element={<FacturasCompra />} />
        <Route path="/compras/pagos" element={<Pagos />} />
        <Route path="/compras/proveedores" element={<Proveedores />} />
        <Route path="/inventario" element={<Navigate to="/inventario/productos" replace />} />
        <Route path="/inventario/productos" element={<Productos />} />
        <Route path="/inventario/stock" element={<Stock />} />
        <Route path="/inventario/movimientos" element={<Movimientos />} />
        <Route path="/finanzas" element={<Navigate to="/finanzas/caja" replace />} />
        <Route path="/finanzas/caja" element={<Caja />} />
        <Route path="/finanzas/cobrar" element={<CuentasCobrar />} />
        <Route path="/finanzas/pagar" element={<CuentasPagar />} />
        <Route path="/finanzas/flujo" element={<FlujoCaja />} />
        <Route path="/contabilidad" element={<Navigate to="/contabilidad/asientos" replace />} />
        <Route path="/contabilidad/asientos" element={<Asientos />} />
        <Route path="/contabilidad/mayor" element={<Mayor />} />
        <Route path="/contabilidad/balance" element={<Balance />} />
        <Route path="/contabilidad/plan" element={<PlanCuentas />} />
        <Route path="/rrhh" element={<Navigate to="/rrhh/empleados" replace />} />
        <Route path="/rrhh/empleados" element={<Empleados />} />
        <Route path="/rrhh/asistencia" element={<Asistencia />} />
        <Route path="/rrhh/vacaciones" element={<Vacaciones />} />
        <Route path="/rrhh/liquidaciones" element={<Liquidaciones />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/tareas" element={<Tareas />} />
        <Route path="/config" element={<Configuracion />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
