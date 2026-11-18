export type Rol = 'admin' | 'ventas' | 'compras' | 'contabilidad' | 'almacen' | 'rrhh'

export interface Usuario {
  id: string
  nombre: string
  email: string
  password: string
  rol: Rol
  activo: boolean
  ultimoAcceso?: string
}

export interface Empresa {
  razonSocial: string
  nombreFantasia: string
  ruc: string
  direccion: string
  ciudad: string
  telefono: string
  email: string
  web: string
  moneda: string
  simbolo: string
  timbrado: string
  vencimientoTimbrado: string
  ivaGeneral: number
  ivaReducido: number
}

export interface Sucursal { id: string; nombre: string; direccion: string; ciudad: string; telefono: string; activa: boolean }
export interface Deposito { id: string; nombre: string; sucursalId: string; direccion: string }

export interface Categoria { id: string; nombre: string; descripcion?: string; color: string }
export interface Marca { id: string; nombre: string }

export interface Producto {
  id: string
  codigo: string
  codigoBarras?: string
  nombre: string
  descripcion?: string
  categoriaId: string
  marcaId: string
  unidad: string
  costo: number
  precio: number
  precioMayorista: number
  iva: number
  stockMinimo: number
  stockPorDeposito: Record<string, number>
  activo: boolean
  proveedorId?: string
  creadoEn: string
}

export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste' | 'transferencia'
export interface MovimientoStock {
  id: string
  fecha: string
  productoId: string
  depositoId: string
  depositoDestinoId?: string
  tipo: TipoMovimiento
  cantidad: number
  motivo: string
  referencia?: string
  usuarioId: string
}

export interface Cliente {
  id: string
  codigo: string
  tipo: 'empresa' | 'persona'
  razonSocial: string
  ruc: string
  email: string
  telefono: string
  direccion: string
  ciudad: string
  contacto?: string
  segmento: 'minorista' | 'mayorista' | 'corporativo'
  limiteCredito: number
  diasCredito: number
  activo: boolean
  notas?: string
  creadoEn: string
}

export interface Proveedor {
  id: string
  codigo: string
  razonSocial: string
  ruc: string
  email: string
  telefono: string
  direccion: string
  ciudad: string
  contacto?: string
  rubro: string
  diasPago: number
  activo: boolean
  creadoEn: string
}

export interface LineaDocumento {
  productoId: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  descuento: number
  iva: number
}

export type EstadoPresupuesto = 'borrador' | 'enviado' | 'aceptado' | 'rechazado' | 'vencido'
export interface Presupuesto {
  id: string
  numero: string
  fecha: string
  validoHasta: string
  clienteId: string
  vendedorId: string
  lineas: LineaDocumento[]
  estado: EstadoPresupuesto
  notas?: string
}

export type EstadoPedido = 'pendiente' | 'confirmado' | 'preparando' | 'enviado' | 'entregado' | 'cancelado'
export interface Pedido {
  id: string
  numero: string
  fecha: string
  clienteId: string
  vendedorId: string
  sucursalId: string
  depositoId: string
  lineas: LineaDocumento[]
  estado: EstadoPedido
  facturaId?: string
  presupuestoId?: string
  notas?: string
}

export type EstadoFactura = 'pendiente' | 'parcial' | 'pagada' | 'vencida' | 'anulada'
export type CondicionVenta = 'contado' | 'credito'
export interface Factura {
  id: string
  numero: string
  timbrado: string
  fecha: string
  vencimiento: string
  clienteId: string
  vendedorId: string
  sucursalId: string
  condicion: CondicionVenta
  lineas: LineaDocumento[]
  estado: EstadoFactura
  pedidoId?: string
  notas?: string
}

export interface NotaCredito {
  id: string
  numero: string
  fecha: string
  facturaId: string
  clienteId: string
  motivo: string
  lineas: LineaDocumento[]
}

export type MedioPago = 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque' | 'billetera'
export interface Cobro {
  id: string
  numero: string
  fecha: string
  clienteId: string
  facturaId: string
  monto: number
  medio: MedioPago
  cuentaId: string
  referencia?: string
  usuarioId: string
}

export type EstadoOC = 'borrador' | 'enviada' | 'parcial' | 'recibida' | 'cancelada'
export interface LineaOC extends LineaDocumento { recibido: number }
export interface OrdenCompra {
  id: string
  numero: string
  fecha: string
  entregaEstimada: string
  proveedorId: string
  depositoId: string
  compradorId: string
  lineas: LineaOC[]
  estado: EstadoOC
  notas?: string
}

export type EstadoFacturaCompra = 'pendiente' | 'parcial' | 'pagada' | 'vencida'
export interface FacturaCompra {
  id: string
  numero: string
  fecha: string
  vencimiento: string
  proveedorId: string
  ordenCompraId?: string
  lineas: LineaDocumento[]
  estado: EstadoFacturaCompra
}

export interface Pago {
  id: string
  numero: string
  fecha: string
  proveedorId: string
  facturaCompraId: string
  monto: number
  medio: MedioPago
  cuentaId: string
  referencia?: string
  usuarioId: string
}

export type TipoCuentaFinanciera = 'caja' | 'banco' | 'billetera'
export interface CuentaFinanciera {
  id: string
  nombre: string
  tipo: TipoCuentaFinanciera
  banco?: string
  numero?: string
  moneda: string
  saldoInicial: number
  activa: boolean
}

export interface MovimientoCaja {
  id: string
  fecha: string
  cuentaId: string
  tipo: 'ingreso' | 'egreso' | 'transferencia'
  categoria: string
  concepto: string
  monto: number
  referencia?: string
  cuentaDestinoId?: string
  usuarioId: string
}

export type TipoCuentaContable = 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'egreso'
export interface CuentaContable {
  id: string
  codigo: string
  nombre: string
  tipo: TipoCuentaContable
  padreId?: string
  imputable: boolean
}

export interface LineaAsiento { cuentaId: string; debe: number; haber: number; detalle?: string }
export interface Asiento {
  id: string
  numero: number
  fecha: string
  concepto: string
  lineas: LineaAsiento[]
  origen: 'manual' | 'venta' | 'compra' | 'cobro' | 'pago' | 'sueldos' | 'apertura'
  referencia?: string
}

export interface Departamento { id: string; nombre: string; responsableId?: string }
export interface Cargo { id: string; nombre: string; departamentoId: string; salarioBase: number }

export type EstadoEmpleado = 'activo' | 'vacaciones' | 'licencia' | 'baja'
export interface Empleado {
  id: string
  legajo: string
  nombre: string
  apellido: string
  ci: string
  email: string
  telefono: string
  fechaNacimiento: string
  fechaIngreso: string
  departamentoId: string
  cargoId: string
  sucursalId: string
  salario: number
  estado: EstadoEmpleado
  ips: boolean
  cuentaBancaria?: string
  usuarioId?: string
}

export interface Asistencia {
  id: string
  empleadoId: string
  fecha: string
  entrada?: string
  salida?: string
  estado: 'presente' | 'ausente' | 'tarde' | 'vacaciones' | 'licencia' | 'feriado'
}

export interface Vacacion {
  id: string
  empleadoId: string
  desde: string
  hasta: string
  dias: number
  estado: 'solicitada' | 'aprobada' | 'rechazada'
  motivo?: string
}

export interface LineaLiquidacion {
  empleadoId: string
  salarioBase: number
  horasExtra: number
  bonificaciones: number
  descuentos: number
  ips: number
  neto: number
}
export interface Liquidacion {
  id: string
  periodo: string
  fecha: string
  lineas: LineaLiquidacion[]
  estado: 'borrador' | 'aprobada' | 'pagada'
}

export type EtapaOportunidad = 'prospecto' | 'contacto' | 'propuesta' | 'negociacion' | 'ganada' | 'perdida'
export interface Oportunidad {
  id: string
  titulo: string
  clienteId: string
  vendedorId: string
  valor: number
  probabilidad: number
  etapa: EtapaOportunidad
  fechaCierre: string
  notas?: string
  creadoEn: string
}

export interface ActividadCRM {
  id: string
  clienteId: string
  oportunidadId?: string
  tipo: 'llamada' | 'email' | 'reunion' | 'nota' | 'tarea'
  descripcion: string
  fecha: string
  usuarioId: string
  completada: boolean
}

export interface Tarea {
  id: string
  titulo: string
  descripcion?: string
  asignadoId: string
  fechaLimite: string
  prioridad: 'baja' | 'media' | 'alta'
  estado: 'pendiente' | 'en_progreso' | 'completada'
  modulo: string
}

export interface LogActividad {
  id: string
  fecha: string
  usuarioId: string
  modulo: string
  accion: string
  detalle: string
}

export interface Notificacion {
  id: string
  fecha: string
  titulo: string
  mensaje: string
  tipo: 'info' | 'warning' | 'success' | 'error'
  leida: boolean
  link?: string
}

export interface ERPData {
  empresa: Empresa
  usuarios: Usuario[]
  sucursales: Sucursal[]
  depositos: Deposito[]
  categorias: Categoria[]
  marcas: Marca[]
  productos: Producto[]
  movimientosStock: MovimientoStock[]
  clientes: Cliente[]
  proveedores: Proveedor[]
  presupuestos: Presupuesto[]
  pedidos: Pedido[]
  facturas: Factura[]
  notasCredito: NotaCredito[]
  cobros: Cobro[]
  ordenesCompra: OrdenCompra[]
  facturasCompra: FacturaCompra[]
  pagos: Pago[]
  cuentasFinancieras: CuentaFinanciera[]
  movimientosCaja: MovimientoCaja[]
  planCuentas: CuentaContable[]
  asientos: Asiento[]
  departamentos: Departamento[]
  cargos: Cargo[]
  empleados: Empleado[]
  asistencias: Asistencia[]
  vacaciones: Vacacion[]
  liquidaciones: Liquidacion[]
  oportunidades: Oportunidad[]
  actividadesCRM: ActividadCRM[]
  tareas: Tarea[]
  log: LogActividad[]
  notificaciones: Notificacion[]
}
