import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type * as T from '@/types'
import { seedData } from '@/data/seed'
import { uid, nowISO, today, totales, nextNumero, addDays } from '@/lib/utils'
import { idbStorage } from '@/lib/idbStorage'

type Collections = {
  [K in keyof T.ERPData]: T.ERPData[K] extends (infer U)[] ? U : never
}
type ListKey = { [K in keyof T.ERPData]: T.ERPData[K] extends unknown[] ? K : never }[keyof T.ERPData]

export interface ERPState extends T.ERPData {
  version: number
  usuarioActual: Usuario | null
  toasts: Toast[]

  // auth
  login: (email: string, password: string) => boolean
  logout: () => void

  // genéricos
  add: <K extends ListKey>(key: K, item: Collections[K]) => void
  update: <K extends ListKey>(key: K, id: string, patch: Partial<Collections[K]>) => void
  remove: <K extends ListKey>(key: K, id: string) => void
  setEmpresa: (patch: Partial<T.Empresa>) => void
  resetData: () => void
  registrarLog: (modulo: string, accion: string, detalle: string) => void
  notify: (n: Omit<T.Notificacion, 'id' | 'fecha' | 'leida'>) => void
  marcarNotificacionesLeidas: () => void
  toast: (msg: string, tipo?: Toast['tipo']) => void
  dismissToast: (id: string) => void

  // dominio: ventas
  crearFactura: (data: Omit<T.Factura, 'id' | 'numero' | 'timbrado' | 'estado'> & { depositoId: string }) => T.Factura
  anularFactura: (id: string) => void
  registrarCobro: (data: Omit<T.Cobro, 'id' | 'numero' | 'usuarioId'>) => void
  crearPedido: (data: Omit<T.Pedido, 'id' | 'numero'>) => T.Pedido
  facturarPedido: (pedidoId: string, condicion: T.CondicionVenta) => T.Factura | null
  cambiarEstadoPedido: (id: string, estado: T.EstadoPedido) => void
  crearPresupuesto: (data: Omit<T.Presupuesto, 'id' | 'numero'>) => T.Presupuesto
  convertirPresupuesto: (id: string) => T.Pedido | null
  crearNotaCredito: (data: Omit<T.NotaCredito, 'id' | 'numero'>) => void

  // dominio: compras
  crearOrdenCompra: (data: Omit<T.OrdenCompra, 'id' | 'numero'>) => T.OrdenCompra
  recibirOrdenCompra: (id: string, cantidades: Record<string, number>) => void
  registrarPago: (data: Omit<T.Pago, 'id' | 'numero' | 'usuarioId'>) => void

  // dominio: inventario
  registrarMovimientoStock: (data: Omit<T.MovimientoStock, 'id' | 'usuarioId'>) => void

  // dominio: finanzas / contabilidad
  registrarMovimientoCaja: (data: Omit<T.MovimientoCaja, 'id' | 'usuarioId'>) => void
  crearAsiento: (data: Omit<T.Asiento, 'id' | 'numero'>) => void

  // dominio: rrhh
  generarLiquidacion: (periodo: string) => void
  cambiarEstadoLiquidacion: (id: string, estado: T.Liquidacion['estado']) => void
}

type Usuario = T.Usuario
export interface Toast { id: string; msg: string; tipo: 'success' | 'error' | 'info' }

const SEED_VERSION = 9

try { localStorage.removeItem('nanduti-erp') } catch { /* sin localStorage disponible */ }

export const useERP = create<ERPState>()(
  persist(
    (set, get) => {
      const log = (modulo: string, accion: string, detalle: string) => {
        const u = get().usuarioActual
        set((s) => ({ log: [{ id: uid('lg'), fecha: nowISO(), usuarioId: u?.id ?? 'u01', modulo, accion, detalle }, ...s.log].slice(0, 500) }))
      }
      const toast = (msg: string, tipo: Toast['tipo'] = 'success') => {
        const id = uid('t')
        set((s) => ({ toasts: [...s.toasts, { id, msg, tipo }] }))
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500)
      }
      const ajustarStock = (productoId: string, depositoId: string, delta: number) => {
        set((s) => ({
          productos: s.productos.map((p) =>
            p.id === productoId ? { ...p, stockPorDeposito: { ...p.stockPorDeposito, [depositoId]: (p.stockPorDeposito[depositoId] ?? 0) + delta } } : p,
          ),
        }))
      }
      const pushAsiento = (data: Omit<T.Asiento, 'id' | 'numero'>) => {
        set((s) => ({ asientos: [...s.asientos, { ...data, id: uid('as'), numero: (s.asientos.at(-1)?.numero ?? 0) + 1 }] }))
      }
      const userId = () => get().usuarioActual?.id ?? 'u01'

      return {
        ...seedData,
        version: SEED_VERSION,
        usuarioActual: null,
        toasts: [],

        login: (email, password) => {
          const u = get().usuarios.find((x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password && x.activo)
          if (!u) return false
          set((s) => ({ usuarioActual: u, usuarios: s.usuarios.map((x) => (x.id === u.id ? { ...x, ultimoAcceso: nowISO() } : x)) }))
          return true
        },
        logout: () => set({ usuarioActual: null }),

        add: (key, item) => set((s) => ({ [key]: [item, ...(s[key] as unknown[])] }) as Partial<ERPState>),
        update: (key, id, patch) =>
          set((s) => ({ [key]: (s[key] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...patch } : x)) }) as Partial<ERPState>),
        remove: (key, id) => set((s) => ({ [key]: (s[key] as { id: string }[]).filter((x) => x.id !== id) }) as Partial<ERPState>),
        setEmpresa: (patch) => set((s) => ({ empresa: { ...s.empresa, ...patch } })),
        resetData: () => set({ ...seedData, version: SEED_VERSION }),
        registrarLog: log,
        notify: (n) => set((s) => ({ notificaciones: [{ ...n, id: uid('nt'), fecha: nowISO(), leida: false }, ...s.notificaciones] })),
        marcarNotificacionesLeidas: () => set((s) => ({ notificaciones: s.notificaciones.map((n) => ({ ...n, leida: true })) })),
        toast,
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

        // ---------- Ventas ----------
        crearFactura: (data) => {
          const s = get()
          const { depositoId, ...rest } = data
          const sucNum = rest.sucursalId.slice(-1)
          const numero = nextNumero(s.facturas.map((f) => f.numero), `001-00${sucNum}-`)
          const factura: T.Factura = { ...rest, id: uid('fa'), numero, timbrado: s.empresa.timbrado, estado: 'pendiente' }
          const tot = totales(factura.lineas)
          const costo = factura.lineas.reduce((acc, l) => acc + l.cantidad * (s.productos.find((p) => p.id === l.productoId)?.costo ?? 0), 0)
          const cliente = s.clientes.find((c) => c.id === factura.clienteId)
          set((st) => ({ facturas: [factura, ...st.facturas] }))
          for (const l of factura.lineas) {
            ajustarStock(l.productoId, depositoId, -l.cantidad)
            set((st) => ({ movimientosStock: [{ id: uid('ms'), fecha: factura.fecha, productoId: l.productoId, depositoId, tipo: 'salida', cantidad: l.cantidad, motivo: 'Venta', referencia: numero, usuarioId: userId() }, ...st.movimientosStock] }))
          }
          pushAsiento({
            fecha: factura.fecha, concepto: `Venta ${numero} - ${cliente?.razonSocial ?? ''}`, origen: 'venta', referencia: numero,
            lineas: [
              { cuentaId: 'pc_1.1.03', debe: Math.round(tot.total), haber: 0 },
              { cuentaId: 'pc_4.1.01', debe: 0, haber: Math.round(tot.gravado) },
              { cuentaId: 'pc_2.1.02', debe: 0, haber: Math.round(tot.iva) },
              { cuentaId: 'pc_5.1.01', debe: Math.round(costo), haber: 0 },
              { cuentaId: 'pc_1.1.05', debe: 0, haber: Math.round(costo) },
            ],
          })
          log('Ventas', 'Creó factura', `${numero} - ${cliente?.razonSocial ?? ''}`)
          toast(`Factura ${numero} emitida`)
          return factura
        },
        anularFactura: (id) => {
          const f = get().facturas.find((x) => x.id === id)
          if (!f || f.estado === 'anulada') return
          const pedido = get().pedidos.find((p) => p.facturaId === id)
          const depositoId = pedido?.depositoId ?? (f.sucursalId === 's02' ? 'd02' : f.sucursalId === 's03' ? 'd03' : 'd01')
          for (const l of f.lineas) ajustarStock(l.productoId, depositoId, l.cantidad)
          set((s) => ({ facturas: s.facturas.map((x) => (x.id === id ? { ...x, estado: 'anulada' } : x)) }))
          log('Ventas', 'Anuló factura', f.numero)
          toast(`Factura ${f.numero} anulada`, 'info')
        },
        registrarCobro: (data) => {
          const s = get()
          const numero = nextNumero(s.cobros.map((c) => c.numero), 'REC-', 6)
          const cobro: T.Cobro = { ...data, id: uid('co'), numero, usuarioId: userId() }
          const factura = s.facturas.find((f) => f.id === data.facturaId)
          const cliente = s.clientes.find((c) => c.id === data.clienteId)
          set((st) => ({ cobros: [cobro, ...st.cobros] }))
          if (factura) {
            const total = totales(factura.lineas).total
            const cobrado = get().cobros.filter((c) => c.facturaId === factura.id).reduce((a, c) => a + c.monto, 0)
            const estado: T.EstadoFactura = cobrado >= total - 1 ? 'pagada' : factura.vencimiento < today() ? 'vencida' : 'parcial'
            set((st) => ({ facturas: st.facturas.map((f) => (f.id === factura.id ? { ...f, estado } : f)) }))
          }
          set((st) => ({ movimientosCaja: [{ id: uid('mc'), fecha: data.fecha, cuentaId: data.cuentaId, tipo: 'ingreso', categoria: 'Cobranza', concepto: `Cobro ${factura?.numero ?? ''} - ${cliente?.razonSocial ?? ''}`, monto: data.monto, referencia: numero, usuarioId: userId() }, ...st.movimientosCaja] }))
          pushAsiento({ fecha: data.fecha, concepto: `Cobro ${numero} - ${cliente?.razonSocial ?? ''}`, origen: 'cobro', referencia: numero, lineas: [
            { cuentaId: data.medio === 'efectivo' ? 'pc_1.1.01' : 'pc_1.1.02', debe: data.monto, haber: 0 },
            { cuentaId: 'pc_1.1.03', debe: 0, haber: data.monto },
          ] })
          log('Finanzas', 'Registró cobro', `${numero} - ${cliente?.razonSocial ?? ''}`)
          toast(`Cobro ${numero} registrado`)
        },
        crearPedido: (data) => {
          const numero = nextNumero(get().pedidos.map((p) => p.numero), 'PED-', 6)
          const pedido: T.Pedido = { ...data, id: uid('pe'), numero }
          set((s) => ({ pedidos: [pedido, ...s.pedidos] }))
          log('Ventas', 'Creó pedido', numero)
          toast(`Pedido ${numero} creado`)
          return pedido
        },
        facturarPedido: (pedidoId, condicion) => {
          const s = get()
          const p = s.pedidos.find((x) => x.id === pedidoId)
          if (!p || p.facturaId) return null
          const cliente = s.clientes.find((c) => c.id === p.clienteId)
          const fecha = today()
          const factura = get().crearFactura({ fecha, vencimiento: condicion === 'credito' ? addDays(fecha, cliente?.diasCredito ?? 30) : fecha, clienteId: p.clienteId, vendedorId: p.vendedorId, sucursalId: p.sucursalId, condicion, lineas: p.lineas, pedidoId: p.id, depositoId: p.depositoId })
          set((st) => ({ pedidos: st.pedidos.map((x) => (x.id === pedidoId ? { ...x, facturaId: factura.id, estado: x.estado === 'pendiente' ? 'confirmado' : x.estado } : x)) }))
          return factura
        },
        cambiarEstadoPedido: (id, estado) => {
          set((s) => ({ pedidos: s.pedidos.map((p) => (p.id === id ? { ...p, estado } : p)) }))
          const p = get().pedidos.find((x) => x.id === id)
          log('Ventas', 'Cambió estado de pedido', `${p?.numero} → ${estado}`)
        },
        crearPresupuesto: (data) => {
          const numero = nextNumero(get().presupuestos.map((p) => p.numero), 'PRE-', 6)
          const pre: T.Presupuesto = { ...data, id: uid('pr'), numero }
          set((s) => ({ presupuestos: [pre, ...s.presupuestos] }))
          log('Ventas', 'Creó presupuesto', numero)
          toast(`Presupuesto ${numero} creado`)
          return pre
        },
        convertirPresupuesto: (id) => {
          const s = get()
          const pre = s.presupuestos.find((p) => p.id === id)
          if (!pre) return null
          const cliente = s.clientes.find((c) => c.id === pre.clienteId)
          const sucursalId = cliente?.ciudad === 'Ciudad del Este' ? 's02' : cliente?.ciudad === 'Encarnación' ? 's03' : 's01'
          const pedido = get().crearPedido({ fecha: today(), clienteId: pre.clienteId, vendedorId: pre.vendedorId, sucursalId, depositoId: sucursalId === 's02' ? 'd02' : sucursalId === 's03' ? 'd03' : 'd01', lineas: pre.lineas, estado: 'confirmado', presupuestoId: pre.id, notas: pre.notas })
          set((st) => ({ presupuestos: st.presupuestos.map((p) => (p.id === id ? { ...p, estado: 'aceptado' } : p)) }))
          return pedido
        },
        crearNotaCredito: (data) => {
          const s = get()
          const numero = nextNumero(s.notasCredito.map((n) => n.numero), 'NC-', 6)
          const nc: T.NotaCredito = { ...data, id: uid('nc'), numero }
          const factura = s.facturas.find((f) => f.id === data.facturaId)
          const pedido = s.pedidos.find((p) => p.facturaId === data.facturaId)
          const depositoId = pedido?.depositoId ?? 'd01'
          set((st) => ({ notasCredito: [nc, ...st.notasCredito] }))
          for (const l of nc.lineas) {
            ajustarStock(l.productoId, depositoId, l.cantidad)
            set((st) => ({ movimientosStock: [{ id: uid('ms'), fecha: nc.fecha, productoId: l.productoId, depositoId, tipo: 'entrada', cantidad: l.cantidad, motivo: 'Devolución de cliente', referencia: numero, usuarioId: userId() }, ...st.movimientosStock] }))
          }
          const tot = totales(nc.lineas)
          pushAsiento({ fecha: nc.fecha, concepto: `Nota de crédito ${numero} s/ ${factura?.numero ?? ''}`, origen: 'venta', referencia: numero, lineas: [
            { cuentaId: 'pc_4.1.01', debe: Math.round(tot.gravado), haber: 0 },
            { cuentaId: 'pc_2.1.02', debe: Math.round(tot.iva), haber: 0 },
            { cuentaId: 'pc_1.1.03', debe: 0, haber: Math.round(tot.total) },
          ] })
          log('Ventas', 'Emitió nota de crédito', numero)
          toast(`Nota de crédito ${numero} emitida`)
        },

        // ---------- Compras ----------
        crearOrdenCompra: (data) => {
          const numero = nextNumero(get().ordenesCompra.map((o) => o.numero), 'OC-', 6)
          const oc: T.OrdenCompra = { ...data, id: uid('oc'), numero }
          set((s) => ({ ordenesCompra: [oc, ...s.ordenesCompra] }))
          log('Compras', 'Creó orden de compra', numero)
          toast(`Orden ${numero} creada`)
          return oc
        },
        recibirOrdenCompra: (id, cantidades) => {
          const s = get()
          const oc = s.ordenesCompra.find((o) => o.id === id)
          if (!oc) return
          const prov = s.proveedores.find((p) => p.id === oc.proveedorId)
          const fecha = today()
          const lineas = oc.lineas.map((l) => ({ ...l, recibido: Math.min(l.cantidad, l.recibido + (cantidades[l.productoId] ?? 0)) }))
          const completa = lineas.every((l) => l.recibido >= l.cantidad)
          set((st) => ({ ordenesCompra: st.ordenesCompra.map((o) => (o.id === id ? { ...o, lineas, estado: completa ? 'recibida' : 'parcial' } : o)) }))
          const recibidasAhora = oc.lineas.filter((l) => (cantidades[l.productoId] ?? 0) > 0)
          for (const l of recibidasAhora) {
            const q = Math.min(cantidades[l.productoId], l.cantidad - l.recibido)
            if (q <= 0) continue
            ajustarStock(l.productoId, oc.depositoId, q)
            set((st) => ({ movimientosStock: [{ id: uid('ms'), fecha, productoId: l.productoId, depositoId: oc.depositoId, tipo: 'entrada', cantidad: q, motivo: 'Recepción de compra', referencia: oc.numero, usuarioId: userId() }, ...st.movimientosStock] }))
          }
          if (recibidasAhora.length) {
            const lineasFC: T.LineaDocumento[] = recibidasAhora.map((l) => ({ productoId: l.productoId, descripcion: l.descripcion, cantidad: Math.min(cantidades[l.productoId], l.cantidad - l.recibido), precioUnitario: l.precioUnitario, descuento: l.descuento, iva: l.iva }))
            const tot = totales(lineasFC)
            const numeroFC = `001-001-${String(Date.now()).slice(-7)}`
            set((st) => ({ facturasCompra: [{ id: uid('fc'), numero: numeroFC, fecha, vencimiento: addDays(fecha, prov?.diasPago ?? 30), proveedorId: oc.proveedorId, ordenCompraId: oc.id, lineas: lineasFC, estado: 'pendiente' }, ...st.facturasCompra] }))
            pushAsiento({ fecha, concepto: `Compra ${numeroFC} - ${prov?.razonSocial ?? ''}`, origen: 'compra', referencia: numeroFC, lineas: [
              { cuentaId: 'pc_1.1.05', debe: Math.round(tot.gravado), haber: 0 },
              { cuentaId: 'pc_1.1.04', debe: Math.round(tot.iva), haber: 0 },
              { cuentaId: 'pc_2.1.01', debe: 0, haber: Math.round(tot.total) },
            ] })
          }
          log('Compras', 'Registró recepción', oc.numero)
          toast(`Recepción registrada para ${oc.numero}`)
        },
        registrarPago: (data) => {
          const s = get()
          const numero = nextNumero(s.pagos.map((p) => p.numero), 'OP-', 6)
          const pago: T.Pago = { ...data, id: uid('pg'), numero, usuarioId: userId() }
          const fc = s.facturasCompra.find((f) => f.id === data.facturaCompraId)
          const prov = s.proveedores.find((p) => p.id === data.proveedorId)
          set((st) => ({ pagos: [pago, ...st.pagos] }))
          if (fc) {
            const total = totales(fc.lineas).total
            const pagado = get().pagos.filter((p) => p.facturaCompraId === fc.id).reduce((a, p) => a + p.monto, 0)
            const estado: T.EstadoFacturaCompra = pagado >= total - 1 ? 'pagada' : fc.vencimiento < today() ? 'vencida' : 'parcial'
            set((st) => ({ facturasCompra: st.facturasCompra.map((f) => (f.id === fc.id ? { ...f, estado } : f)) }))
          }
          set((st) => ({ movimientosCaja: [{ id: uid('mc'), fecha: data.fecha, cuentaId: data.cuentaId, tipo: 'egreso', categoria: 'Pago a proveedores', concepto: `Pago ${fc?.numero ?? ''} - ${prov?.razonSocial ?? ''}`, monto: data.monto, referencia: numero, usuarioId: userId() }, ...st.movimientosCaja] }))
          pushAsiento({ fecha: data.fecha, concepto: `Pago ${numero} - ${prov?.razonSocial ?? ''}`, origen: 'pago', referencia: numero, lineas: [
            { cuentaId: 'pc_2.1.01', debe: data.monto, haber: 0 },
            { cuentaId: data.medio === 'efectivo' ? 'pc_1.1.01' : 'pc_1.1.02', debe: 0, haber: data.monto },
          ] })
          log('Finanzas', 'Registró pago', `${numero} - ${prov?.razonSocial ?? ''}`)
          toast(`Pago ${numero} registrado`)
        },

        // ---------- Inventario ----------
        registrarMovimientoStock: (data) => {
          const mov: T.MovimientoStock = { ...data, id: uid('ms'), usuarioId: userId() }
          set((s) => ({ movimientosStock: [mov, ...s.movimientosStock] }))
          if (data.tipo === 'entrada') ajustarStock(data.productoId, data.depositoId, data.cantidad)
          else if (data.tipo === 'salida') ajustarStock(data.productoId, data.depositoId, -data.cantidad)
          else if (data.tipo === 'ajuste') ajustarStock(data.productoId, data.depositoId, data.cantidad)
          else if (data.tipo === 'transferencia' && data.depositoDestinoId) {
            ajustarStock(data.productoId, data.depositoId, -data.cantidad)
            ajustarStock(data.productoId, data.depositoDestinoId, data.cantidad)
          }
          const p = get().productos.find((x) => x.id === data.productoId)
          log('Inventario', `Movimiento de stock (${data.tipo})`, `${p?.nombre} x${data.cantidad}`)
          toast('Movimiento de stock registrado')
        },

        // ---------- Finanzas ----------
        registrarMovimientoCaja: (data) => {
          const mov: T.MovimientoCaja = { ...data, id: uid('mc'), usuarioId: userId() }
          set((s) => ({ movimientosCaja: [mov, ...s.movimientosCaja] }))
          log('Finanzas', `Registró ${data.tipo}`, `${data.concepto}`)
          toast('Movimiento registrado')
        },
        crearAsiento: (data) => {
          pushAsiento(data)
          log('Contabilidad', 'Registró asiento', data.concepto)
          toast('Asiento registrado')
        },

        // ---------- RRHH ----------
        generarLiquidacion: (periodo) => {
          const s = get()
          if (s.liquidaciones.some((l) => l.periodo === periodo)) {
            toast('Ya existe una liquidación para ese período', 'error')
            return
          }
          const lineas: T.LineaLiquidacion[] = s.empleados.filter((e) => e.estado !== 'baja').map((e) => {
            const ips = Math.round(e.salario * 0.09)
            return { empleadoId: e.id, salarioBase: e.salario, horasExtra: 0, bonificaciones: 0, descuentos: 0, ips, neto: e.salario - ips }
          })
          set((st) => ({ liquidaciones: [{ id: uid('lq'), periodo, fecha: today(), lineas, estado: 'borrador' }, ...st.liquidaciones] }))
          log('RRHH', 'Generó liquidación', periodo)
          toast(`Liquidación ${periodo} generada`)
        },
        cambiarEstadoLiquidacion: (id, estado) => {
          const liq = get().liquidaciones.find((l) => l.id === id)
          if (!liq) return
          set((s) => ({ liquidaciones: s.liquidaciones.map((l) => (l.id === id ? { ...l, estado } : l)) }))
          if (estado === 'pagada') {
            const totalNeto = liq.lineas.reduce((a, l) => a + l.neto, 0)
            const totalIps = liq.lineas.reduce((a, l) => a + l.ips, 0)
            const bruto = liq.lineas.reduce((a, l) => a + l.salarioBase + l.horasExtra + l.bonificaciones, 0)
            const patronal = Math.round(bruto * 0.165)
            set((st) => ({ movimientosCaja: [{ id: uid('mc'), fecha: today(), cuentaId: 'cf03', tipo: 'egreso', categoria: 'Sueldos', concepto: `Pago de sueldos ${liq.periodo}`, monto: totalNeto, usuarioId: userId() }, ...st.movimientosCaja] }))
            pushAsiento({ fecha: today(), concepto: `Liquidación de sueldos ${liq.periodo}`, origen: 'sueldos', lineas: [
              { cuentaId: 'pc_5.1.02', debe: bruto, haber: 0 },
              { cuentaId: 'pc_5.1.03', debe: patronal, haber: 0 },
              { cuentaId: 'pc_2.1.04', debe: 0, haber: totalIps + patronal },
              { cuentaId: 'pc_1.1.02', debe: 0, haber: totalNeto },
              { cuentaId: 'pc_2.1.03', debe: 0, haber: bruto - totalIps - totalNeto },
            ] })
          }
          log('RRHH', 'Cambió estado de liquidación', `${liq.periodo} → ${estado}`)
          toast(`Liquidación ${liq.periodo} ${estado}`)
        },
      }
    },
    {
      name: 'nanduti-erp',
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => {
        const { toasts, ...rest } = s
        return rest as ERPState
      },
      version: SEED_VERSION,
      migrate: () => ({ ...seedData, version: SEED_VERSION, usuarioActual: null, toasts: [] }) as unknown as ERPState,
    },
  ),
)

/** true cuando zustand terminó de leer IndexedDB. Evita mostrar el login por un instante. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(useERP.persist.hasHydrated())
  useEffect(() => {
    const fin = useERP.persist.onFinishHydration(() => setHydrated(true))
    if (useERP.persist.hasHydrated()) setHydrated(true)
    return fin
  }, [])
  return hydrated
}

// Selectores útiles
export const selectores = {
  cliente: (s: ERPState, id: string) => s.clientes.find((c) => c.id === id),
  producto: (s: ERPState, id: string) => s.productos.find((p) => p.id === id),
  proveedor: (s: ERPState, id: string) => s.proveedores.find((p) => p.id === id),
  usuario: (s: ERPState, id: string) => s.usuarios.find((u) => u.id === id),
  saldoFactura: (s: ERPState, f: T.Factura) => {
    const total = totales(f.lineas).total
    const cobrado = s.cobros.filter((c) => c.facturaId === f.id).reduce((a, c) => a + c.monto, 0)
    const nc = s.notasCredito.filter((n) => n.facturaId === f.id).reduce((a, n) => a + totales(n.lineas).total, 0)
    return Math.max(0, total - cobrado - nc)
  },
  saldoFacturaCompra: (s: ERPState, f: T.FacturaCompra) => {
    const total = totales(f.lineas).total
    const pagado = s.pagos.filter((p) => p.facturaCompraId === f.id).reduce((a, p) => a + p.monto, 0)
    return Math.max(0, total - pagado)
  },
  saldoCuenta: (s: ERPState, cuentaId: string) => {
    const c = s.cuentasFinancieras.find((x) => x.id === cuentaId)
    if (!c) return 0
    return s.movimientosCaja.reduce((acc, m) => {
      if (m.cuentaId === cuentaId) {
        if (m.tipo === 'ingreso') return acc + m.monto
        if (m.tipo === 'egreso') return acc - m.monto
        if (m.tipo === 'transferencia') return acc - m.monto
      }
      if (m.tipo === 'transferencia' && m.cuentaDestinoId === cuentaId) return acc + m.monto
      return acc
    }, c.saldoInicial)
  },
  stockTotal: (p: T.Producto) => Object.values(p.stockPorDeposito).reduce((a, b) => a + b, 0),
}
