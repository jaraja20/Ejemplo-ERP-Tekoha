import type * as T from '@/types'
import { addDays, isoLocal, lineaSubtotal, lineaIva, padNum, totales } from '@/lib/utils'

// ---------- RNG determinístico ----------
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20260913)
const ri = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min
const pick = <U,>(arr: U[]): U => arr[Math.floor(rnd() * arr.length)]
const chance = (p: number) => rnd() < p

// Anclado a la fecha real de ejecucion (mediodia local para evitar saltos de zona horaria),
// asi el conjunto de datos siempre luce vigente cuando se muestra el sistema.
const HOY = (() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d })()
const iso = (d: Date) => isoLocal(d)
const hoy = iso(HOY)
function fechaHace(dias: number, hora?: string) {
  const d = new Date(HOY)
  d.setDate(d.getDate() - dias)
  return hora ? `${iso(d)}T${hora}:00` : iso(d)
}
const dateRange = (dias: number) => fechaHace(ri(0, dias))

let idc = 0
const id = (p: string) => `${p}${(++idc).toString().padStart(4, '0')}`

// ---------- Empresa ----------
export const empresa: T.Empresa = {
  razonSocial: 'Distribuidora Ñandutí S.A.',
  nombreFantasia: 'Ñandutí Distribuciones',
  ruc: '80045123-7',
  direccion: 'Avda. Mcal. López 3450 c/ Cnel. Cabrera',
  ciudad: 'Asunción',
  telefono: '+595 21 612 345',
  email: 'contacto@nanduti.com.py',
  web: 'www.nanduti.com.py',
  moneda: 'PYG',
  simbolo: '₲',
  timbrado: '15874521',
  vencimientoTimbrado: '2027-06-30',
  ivaGeneral: 10,
  ivaReducido: 5,
}

// ---------- Usuarios ----------
export const usuarios: T.Usuario[] = [
  { id: 'u01', nombre: 'Carlos Benítez', email: 'admin@nanduti.com.py', password: 'admin123', rol: 'admin', activo: true, ultimoAcceso: fechaHace(0, '08:12') },
  { id: 'u02', nombre: 'María Fernández', email: 'ventas@nanduti.com.py', password: 'ventas123', rol: 'ventas', activo: true, ultimoAcceso: fechaHace(0, '09:05') },
  { id: 'u03', nombre: 'Rodrigo Ayala', email: 'compras@nanduti.com.py', password: 'compras123', rol: 'compras', activo: true, ultimoAcceso: fechaHace(1, '17:40') },
  { id: 'u04', nombre: 'Lorena Giménez', email: 'contabilidad@nanduti.com.py', password: 'conta123', rol: 'contabilidad', activo: true, ultimoAcceso: fechaHace(0, '07:55') },
  { id: 'u05', nombre: 'Julio Ortiz', email: 'deposito@nanduti.com.py', password: 'deposito123', rol: 'almacen', activo: true, ultimoAcceso: fechaHace(0, '06:30') },
  { id: 'u06', nombre: 'Natalia Rojas', email: 'rrhh@nanduti.com.py', password: 'rrhh123', rol: 'rrhh', activo: true, ultimoAcceso: fechaHace(2, '11:20') },
  { id: 'u07', nombre: 'Diego Cáceres', email: 'diego.caceres@nanduti.com.py', password: 'ventas123', rol: 'ventas', activo: true, ultimoAcceso: fechaHace(0, '10:15') },
  { id: 'u08', nombre: 'Andrea Villalba', email: 'andrea.villalba@nanduti.com.py', password: 'ventas123', rol: 'ventas', activo: false, ultimoAcceso: fechaHace(45, '15:00') },
]
const vendedores = ['u02', 'u07']

// ---------- Sucursales / Depósitos ----------
export const sucursales: T.Sucursal[] = [
  { id: 's01', nombre: 'Casa Central', direccion: 'Avda. Mcal. López 3450', ciudad: 'Asunción', telefono: '+595 21 612 345', activa: true },
  { id: 's02', nombre: 'Sucursal Ciudad del Este', direccion: 'Ruta PY02 km 7, Área 1', ciudad: 'Ciudad del Este', telefono: '+595 61 578 900', activa: true },
  { id: 's03', nombre: 'Sucursal Encarnación', direccion: 'Avda. Irrazábal 1120', ciudad: 'Encarnación', telefono: '+595 71 205 411', activa: true },
]
export const depositos: T.Deposito[] = [
  { id: 'd01', nombre: 'Depósito Central', sucursalId: 's01', direccion: 'Avda. Mcal. López 3450 - Galpón A' },
  { id: 'd02', nombre: 'Depósito CDE', sucursalId: 's02', direccion: 'Ruta PY02 km 7' },
  { id: 'd03', nombre: 'Depósito Encarnación', sucursalId: 's03', direccion: 'Avda. Irrazábal 1120' },
]

// ---------- Catálogo ----------
export const categorias: T.Categoria[] = [
  { id: 'c01', nombre: 'Bebidas', color: '#0ea5e9', descripcion: 'Gaseosas, aguas, jugos y energizantes' },
  { id: 'c02', nombre: 'Almacén', color: '#f59e0b', descripcion: 'Productos secos y enlatados' },
  { id: 'c03', nombre: 'Limpieza', color: '#10b981', descripcion: 'Productos de limpieza del hogar' },
  { id: 'c04', nombre: 'Higiene personal', color: '#ec4899', descripcion: 'Cuidado personal y cosmética' },
  { id: 'c05', nombre: 'Lácteos', color: '#8b5cf6', descripcion: 'Leches, quesos y yogures' },
  { id: 'c06', nombre: 'Snacks', color: '#ef4444', descripcion: 'Galletitas, papas y golosinas' },
  { id: 'c07', nombre: 'Yerba y café', color: '#22c55e', descripcion: 'Yerba mate, té y café' },
  { id: 'c08', nombre: 'Congelados', color: '#3b82f6', descripcion: 'Productos de cadena de frío' },
]
export const marcas: T.Marca[] = [
  { id: 'm01', nombre: 'Coca-Cola' }, { id: 'm02', nombre: 'Pulp' }, { id: 'm03', nombre: 'Selecta' },
  { id: 'm04', nombre: 'Pampero' }, { id: 'm05', nombre: 'Kurupí' }, { id: 'm06', nombre: 'Lactolanda' },
  { id: 'm07', nombre: 'Trébol' }, { id: 'm08', nombre: 'Mazzei' }, { id: 'm09', nombre: 'Colgate' },
  { id: 'm10', nombre: 'Ariel' }, { id: 'm11', nombre: 'Dove' }, { id: 'm12', nombre: 'Nestlé' },
  { id: 'm13', nombre: 'Arcor' }, { id: 'm14', nombre: 'Lays' }, { id: 'm15', nombre: 'Genérica' },
]

interface ProdDef { c: string; n: string; cat: string; m: string; u: string; costo: number; margen: number; iva?: number; min: number; prov: string }
const prodDefs: ProdDef[] = [
  { c: 'BEB-001', n: 'Coca-Cola 2.25L', cat: 'c01', m: 'm01', u: 'un', costo: 8500, margen: 0.28, min: 120, prov: 'p01' },
  { c: 'BEB-002', n: 'Coca-Cola 500ml', cat: 'c01', m: 'm01', u: 'un', costo: 3800, margen: 0.32, min: 200, prov: 'p01' },
  { c: 'BEB-003', n: 'Sprite 2.25L', cat: 'c01', m: 'm01', u: 'un', costo: 8200, margen: 0.28, min: 80, prov: 'p01' },
  { c: 'BEB-004', n: 'Fanta Naranja 2.25L', cat: 'c01', m: 'm01', u: 'un', costo: 8200, margen: 0.28, min: 80, prov: 'p01' },
  { c: 'BEB-005', n: 'Pulp Naranja 1.5L', cat: 'c01', m: 'm02', u: 'un', costo: 6200, margen: 0.30, min: 100, prov: 'p01' },
  { c: 'BEB-006', n: 'Agua Mineral 2L', cat: 'c01', m: 'm15', u: 'un', costo: 2900, margen: 0.38, min: 150, prov: 'p02' },
  { c: 'BEB-007', n: 'Agua Mineral 500ml x12', cat: 'c01', m: 'm15', u: 'pack', costo: 14500, margen: 0.30, min: 40, prov: 'p02' },
  { c: 'BEB-008', n: 'Energizante 500ml', cat: 'c01', m: 'm15', u: 'un', costo: 7800, margen: 0.35, min: 60, prov: 'p02' },
  { c: 'BEB-009', n: 'Cerveza Lata 350ml x6', cat: 'c01', m: 'm15', u: 'pack', costo: 26000, margen: 0.25, min: 50, prov: 'p02' },
  { c: 'ALM-001', n: 'Arroz Blanco 1kg', cat: 'c02', m: 'm15', u: 'kg', costo: 5200, margen: 0.25, iva: 5, min: 200, prov: 'p03' },
  { c: 'ALM-002', n: 'Azúcar 1kg', cat: 'c02', m: 'm15', u: 'kg', costo: 4900, margen: 0.22, iva: 5, min: 200, prov: 'p03' },
  { c: 'ALM-003', n: 'Harina 000 1kg', cat: 'c02', m: 'm15', u: 'kg', costo: 4300, margen: 0.25, iva: 5, min: 150, prov: 'p03' },
  { c: 'ALM-004', n: 'Aceite Girasol 900ml', cat: 'c02', m: 'm15', u: 'un', costo: 9800, margen: 0.24, min: 100, prov: 'p03' },
  { c: 'ALM-005', n: 'Fideos Tallarín 500g', cat: 'c02', m: 'm15', u: 'un', costo: 3600, margen: 0.30, min: 150, prov: 'p03' },
  { c: 'ALM-006', n: 'Sal Fina 500g', cat: 'c02', m: 'm15', u: 'un', costo: 1800, margen: 0.40, iva: 5, min: 100, prov: 'p03' },
  { c: 'ALM-007', n: 'Atún en Aceite 170g', cat: 'c02', m: 'm15', u: 'un', costo: 8900, margen: 0.30, min: 80, prov: 'p04' },
  { c: 'ALM-008', n: 'Salsa de Tomate 340g', cat: 'c02', m: 'm15', u: 'un', costo: 4200, margen: 0.32, min: 80, prov: 'p04' },
  { c: 'ALM-009', n: 'Poroto Rojo 500g', cat: 'c02', m: 'm15', u: 'un', costo: 4800, margen: 0.28, iva: 5, min: 60, prov: 'p03' },
  { c: 'ALM-010', n: 'Leche en Polvo 400g', cat: 'c02', m: 'm12', u: 'un', costo: 21000, margen: 0.22, min: 40, prov: 'p04' },
  { c: 'LIM-001', n: 'Detergente Líquido 500ml', cat: 'c03', m: 'm15', u: 'un', costo: 5400, margen: 0.35, min: 100, prov: 'p05' },
  { c: 'LIM-002', n: 'Lavandina 1L', cat: 'c03', m: 'm15', u: 'un', costo: 3200, margen: 0.40, min: 120, prov: 'p05' },
  { c: 'LIM-003', n: 'Jabón en Polvo Ariel 800g', cat: 'c03', m: 'm10', u: 'un', costo: 18500, margen: 0.25, min: 60, prov: 'p05' },
  { c: 'LIM-004', n: 'Desinfectante Piso 900ml', cat: 'c03', m: 'm15', u: 'un', costo: 7200, margen: 0.33, min: 60, prov: 'p05' },
  { c: 'LIM-005', n: 'Esponja Multiuso x3', cat: 'c03', m: 'm15', u: 'pack', costo: 3900, margen: 0.45, min: 80, prov: 'p05' },
  { c: 'LIM-006', n: 'Papel Higiénico x4', cat: 'c03', m: 'm15', u: 'pack', costo: 9800, margen: 0.30, min: 100, prov: 'p05' },
  { c: 'LIM-007', n: 'Bolsas de Basura 60L x10', cat: 'c03', m: 'm15', u: 'pack', costo: 5100, margen: 0.38, min: 60, prov: 'p05' },
  { c: 'HIG-001', n: 'Pasta Dental Colgate 90g', cat: 'c04', m: 'm09', u: 'un', costo: 8900, margen: 0.30, min: 80, prov: 'p06' },
  { c: 'HIG-002', n: 'Shampoo Dove 400ml', cat: 'c04', m: 'm11', u: 'un', costo: 24500, margen: 0.28, min: 40, prov: 'p06' },
  { c: 'HIG-003', n: 'Jabón de Tocador x3', cat: 'c04', m: 'm11', u: 'pack', costo: 12800, margen: 0.30, min: 60, prov: 'p06' },
  { c: 'HIG-004', n: 'Desodorante Aerosol 150ml', cat: 'c04', m: 'm11', u: 'un', costo: 17900, margen: 0.30, min: 50, prov: 'p06' },
  { c: 'HIG-005', n: 'Cepillo Dental Colgate', cat: 'c04', m: 'm09', u: 'un', costo: 6500, margen: 0.40, min: 60, prov: 'p06' },
  { c: 'HIG-006', n: 'Toallas Húmedas x80', cat: 'c04', m: 'm15', u: 'pack', costo: 9200, margen: 0.35, min: 50, prov: 'p06' },
  { c: 'LAC-001', n: 'Leche Entera 1L', cat: 'c05', m: 'm06', u: 'un', costo: 5100, margen: 0.20, iva: 5, min: 200, prov: 'p07' },
  { c: 'LAC-002', n: 'Yogur Bebible 900ml', cat: 'c05', m: 'm06', u: 'un', costo: 8700, margen: 0.25, iva: 5, min: 60, prov: 'p07' },
  { c: 'LAC-003', n: 'Queso Paraguay 500g', cat: 'c05', m: 'm07', u: 'un', costo: 19500, margen: 0.25, iva: 5, min: 40, prov: 'p07' },
  { c: 'LAC-004', n: 'Manteca 200g', cat: 'c05', m: 'm07', u: 'un', costo: 9300, margen: 0.25, iva: 5, min: 50, prov: 'p07' },
  { c: 'LAC-005', n: 'Dulce de Leche 400g', cat: 'c05', m: 'm07', u: 'un', costo: 10800, margen: 0.28, min: 40, prov: 'p07' },
  { c: 'SNK-001', n: 'Galletitas Mazzei Surtidas 300g', cat: 'c06', m: 'm08', u: 'un', costo: 6200, margen: 0.35, min: 100, prov: 'p08' },
  { c: 'SNK-002', n: 'Papas Lays Clásicas 150g', cat: 'c06', m: 'm14', u: 'un', costo: 9800, margen: 0.32, min: 80, prov: 'p08' },
  { c: 'SNK-003', n: 'Alfajor Arcor Triple', cat: 'c06', m: 'm13', u: 'un', costo: 3900, margen: 0.40, min: 150, prov: 'p08' },
  { c: 'SNK-004', n: 'Chocolate Arcor 100g', cat: 'c06', m: 'm13', u: 'un', costo: 8400, margen: 0.35, min: 80, prov: 'p08' },
  { c: 'SNK-005', n: 'Caramelos Surtidos 1kg', cat: 'c06', m: 'm13', u: 'kg', costo: 22000, margen: 0.30, min: 30, prov: 'p08' },
  { c: 'SNK-006', n: 'Chipa Empaquetada 250g', cat: 'c06', m: 'm15', u: 'un', costo: 7500, margen: 0.30, iva: 5, min: 40, prov: 'p09' },
  { c: 'SNK-007', n: 'Maní Salado 200g', cat: 'c06', m: 'm15', u: 'un', costo: 5600, margen: 0.38, min: 60, prov: 'p08' },
  { c: 'YER-001', n: 'Yerba Pajarito 1kg', cat: 'c07', m: 'm04', u: 'kg', costo: 16500, margen: 0.22, min: 150, prov: 'p10' },
  { c: 'YER-002', n: 'Yerba Kurupí Menta 500g', cat: 'c07', m: 'm05', u: 'un', costo: 11800, margen: 0.25, min: 100, prov: 'p10' },
  { c: 'YER-003', n: 'Yerba Selecta 1kg', cat: 'c07', m: 'm03', u: 'kg', costo: 15900, margen: 0.24, min: 120, prov: 'p10' },
  { c: 'YER-004', n: 'Café Molido 250g', cat: 'c07', m: 'm12', u: 'un', costo: 18200, margen: 0.28, min: 50, prov: 'p04' },
  { c: 'YER-005', n: 'Té Negro x25 saquitos', cat: 'c07', m: 'm15', u: 'un', costo: 5400, margen: 0.38, min: 60, prov: 'p04' },
  { c: 'YER-006', n: 'Cocido Quemado 500g', cat: 'c07', m: 'm04', u: 'un', costo: 9900, margen: 0.30, min: 40, prov: 'p10' },
  { c: 'CON-001', n: 'Pollo Entero Congelado kg', cat: 'c08', m: 'm15', u: 'kg', costo: 13500, margen: 0.22, iva: 5, min: 80, prov: 'p11' },
  { c: 'CON-002', n: 'Hamburguesas x4', cat: 'c08', m: 'm15', u: 'pack', costo: 15800, margen: 0.30, min: 50, prov: 'p11' },
  { c: 'CON-003', n: 'Papas Prefritas 1kg', cat: 'c08', m: 'm15', u: 'kg', costo: 12400, margen: 0.30, min: 60, prov: 'p11' },
  { c: 'CON-004', n: 'Helado 2L Vainilla', cat: 'c08', m: 'm15', u: 'un', costo: 24000, margen: 0.30, min: 30, prov: 'p11' },
  { c: 'CON-005', n: 'Empanadas Congeladas x12', cat: 'c08', m: 'm15', u: 'pack', costo: 19800, margen: 0.30, min: 30, prov: 'p11' },
]
export const productos: T.Producto[] = prodDefs.map((p, i) => {
  const iva = p.iva ?? 10
  // El margen se aplica sobre el costo neto; recien despues se suma el IVA al precio de lista.
  const precio = Math.round((p.costo * (1 + p.margen + 0.08) * (1 + iva / 100)) / 100) * 100
  const stockMinimo = p.min * 5
  const bajoStock = i % 11 === 3
  const stock1 = bajoStock ? ri(0, Math.floor(stockMinimo * 0.6)) : ri(stockMinimo, Math.round(stockMinimo * 3.5))
  return {
    id: `pr${padNum(i + 1, 3)}`,
    codigo: p.c,
    codigoBarras: `7840${padNum(100000 + i * 137, 9)}`,
    nombre: p.n,
    categoriaId: p.cat,
    marcaId: p.m,
    unidad: p.u,
    costo: p.costo,
    precio,
    precioMayorista: Math.round((precio * 0.96) / 100) * 100,
    iva,
    stockMinimo,
    stockPorDeposito: { d01: stock1, d02: ri(Math.floor(stockMinimo * 0.4), stockMinimo * 2), d03: ri(Math.floor(stockMinimo * 0.2), stockMinimo) },
    activo: true,
    proveedorId: p.prov,
    creadoEn: fechaHace(ri(200, 400)),
  }
})

// ---------- Proveedores ----------
export const proveedores: T.Proveedor[] = [
  { id: 'p01', codigo: 'PRV-001', razonSocial: 'Paresa S.A.', ruc: '80001234-5', email: 'ventas@paresa.com.py', telefono: '+595 21 518 8000', direccion: 'Ruta 2 km 15.5', ciudad: 'Capiatá', contacto: 'Marcelo Duarte', rubro: 'Bebidas', diasPago: 30, activo: true, creadoEn: fechaHace(500) },
  { id: 'p02', codigo: 'PRV-002', razonSocial: 'Bebidas del Paraguay S.A.', ruc: '80012345-6', email: 'comercial@bebidaspy.com', telefono: '+595 21 645 000', direccion: 'Avda. Artigas 2010', ciudad: 'Asunción', contacto: 'Silvia Romero', rubro: 'Bebidas', diasPago: 30, activo: true, creadoEn: fechaHace(480) },
  { id: 'p03', codigo: 'PRV-003', razonSocial: 'Molinos Guaraní S.R.L.', ruc: '80023456-7', email: 'pedidos@molinosguarani.com.py', telefono: '+595 21 300 400', direccion: 'Ruta 1 km 22', ciudad: 'Itá', contacto: 'Ramón Escobar', rubro: 'Alimentos secos', diasPago: 45, activo: true, creadoEn: fechaHace(470) },
  { id: 'p04', codigo: 'PRV-004', razonSocial: 'Importadora Continental S.A.', ruc: '80034567-8', email: 'ventas@continental.com.py', telefono: '+595 21 210 210', direccion: 'Avda. Eusebio Ayala 4500', ciudad: 'Asunción', contacto: 'Patricia López', rubro: 'Alimentos importados', diasPago: 30, activo: true, creadoEn: fechaHace(450) },
  { id: 'p05', codigo: 'PRV-005', razonSocial: 'Química Limpia S.A.', ruc: '80045678-9', email: 'contacto@quimicalimpia.com.py', telefono: '+595 21 555 123', direccion: 'Parque Industrial', ciudad: 'Villeta', contacto: 'Hugo Martínez', rubro: 'Limpieza', diasPago: 30, activo: true, creadoEn: fechaHace(430) },
  { id: 'p06', codigo: 'PRV-006', razonSocial: 'Unilever Paraguay S.A.', ruc: '80056789-0', email: 'distribuidores@unilever.com.py', telefono: '+595 21 619 000', direccion: 'Avda. Santa Teresa 1827', ciudad: 'Asunción', contacto: 'Fabiola Núñez', rubro: 'Higiene personal', diasPago: 60, activo: true, creadoEn: fechaHace(420) },
  { id: 'p07', codigo: 'PRV-007', razonSocial: 'Lácteos del Sur S.A.', ruc: '80067890-1', email: 'ventas@lacteosdelsur.com.py', telefono: '+595 71 202 300', direccion: 'Ruta 6 km 12', ciudad: 'Hohenau', contacto: 'Klaus Wiebe', rubro: 'Lácteos', diasPago: 15, activo: true, creadoEn: fechaHace(400) },
  { id: 'p08', codigo: 'PRV-008', razonSocial: 'Golosinas Arcor Paraguay', ruc: '80078901-2', email: 'py.ventas@arcor.com', telefono: '+595 21 517 700', direccion: 'Avda. Fernando de la Mora 1550', ciudad: 'Asunción', contacto: 'Gabriel Sosa', rubro: 'Snacks', diasPago: 30, activo: true, creadoEn: fechaHace(390) },
  { id: 'p09', codigo: 'PRV-009', razonSocial: 'Chipería Doña Elsa', ruc: '3456789-1', email: 'donaelsa@gmail.com', telefono: '+595 981 456 789', direccion: 'Ruta 1 km 40', ciudad: 'Yaguarón', contacto: 'Elsa Ramírez', rubro: 'Panificados', diasPago: 7, activo: true, creadoEn: fechaHace(300) },
  { id: 'p10', codigo: 'PRV-010', razonSocial: 'Yerbatera Pajarito S.A.', ruc: '80089012-3', email: 'ventas@pajarito.com.py', telefono: '+595 21 585 100', direccion: 'Ruta 2 km 28', ciudad: 'Itacurubí', contacto: 'Oscar Vera', rubro: 'Yerba mate', diasPago: 30, activo: true, creadoEn: fechaHace(380) },
  { id: 'p11', codigo: 'PRV-011', razonSocial: 'Frigorífico San Antonio S.A.', ruc: '80090123-4', email: 'comercial@frigosanantonio.com.py', telefono: '+595 21 950 800', direccion: 'Ruta Acceso Sur km 8', ciudad: 'San Antonio', contacto: 'Liliana Torres', rubro: 'Congelados', diasPago: 15, activo: true, creadoEn: fechaHace(360) },
  { id: 'p12', codigo: 'PRV-012', razonSocial: 'Transportes Rápido Express', ruc: '80001111-2', email: 'logistica@rapidoexpress.com.py', telefono: '+595 21 333 444', direccion: 'Avda. Defensores del Chaco 900', ciudad: 'Asunción', contacto: 'Iván Paredes', rubro: 'Logística', diasPago: 15, activo: true, creadoEn: fechaHace(250) },
  { id: 'p13', codigo: 'PRV-013', razonSocial: 'Papelería Central S.R.L.', ruc: '80002222-3', email: 'ventas@papeleriacentral.com.py', telefono: '+595 21 444 555', direccion: 'Palma 850', ciudad: 'Asunción', contacto: 'Rosa Acosta', rubro: 'Insumos oficina', diasPago: 30, activo: false, creadoEn: fechaHace(600) },
]

// ---------- Clientes ----------
const nombresEmpresa = [
  'Supermercado La Familia', 'Autoservicio San Miguel', 'Despensa Doña Tere', 'Minimarket El Trébol', 'Supermercado Real',
  'Hotel Guaraní Plaza', 'Restaurante Lo de Pepe', 'Copetín La Esquina', 'Kiosco Universitario', 'Distribuidora Este S.A.',
  'Colegio San José', 'Estación de Servicio Petropar Luque', 'Bar Mbareté', 'Almacén San Cayetano', 'Súper 6 Villa Morra',
  'Panadería La Espiga', 'Cantina Club Olimpia', 'Confitería Bolsi', 'Mercado Municipal Puesto 14', 'Hospital Privado Central',
  'Comedor Universitario UNA', 'Farmacia Catedral', 'Servicentro Ruta 2', 'Bodega El Ceibo', 'Despensa Ña Lucía',
  'Autoservicio Familiar CDE', 'Hostal Encarnación', 'Cafetería Kentucky', 'Supermercado Fortis', 'Fábrica de Chipas Ñemby',
]
const ciudadesCli = ['Asunción', 'Asunción', 'Asunción', 'Luque', 'San Lorenzo', 'Fernando de la Mora', 'Lambaré', 'Ciudad del Este', 'Encarnación', 'Capiatá', 'Ñemby', 'Villa Elisa']
const personas = ['Juan Pérez', 'Ana Martínez', 'Pedro González', 'Carmen Ruiz', 'Luis Báez', 'Sofía Riquelme', 'Miguel Ángel Ferreira', 'Rocío Insfrán', 'Gustavo Amarilla', 'Paola Cardozo']
export const clientes: T.Cliente[] = [
  ...nombresEmpresa.map((n, i): T.Cliente => {
    const seg: T.Cliente['segmento'] = i % 5 === 0 ? 'corporativo' : i % 3 === 0 ? 'minorista' : 'mayorista'
    return {
      id: `cl${padNum(i + 1, 3)}`,
      codigo: `CLI-${padNum(i + 1, 4)}`,
      tipo: 'empresa',
      razonSocial: n,
      ruc: `${80100000 + i * 731}-${(i % 9) + 1}`,
      email: `compras@${n.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14)}.com.py`,
      telefono: `+595 ${pick(['21', '981', '971', '991', '61', '71'])} ${ri(100, 999)} ${ri(100, 999)}`,
      direccion: `${pick(['Avda. España', 'Mcal. Estigarribia', 'Ruta 1', 'Palma', 'Avda. Aviadores del Chaco', 'Gral. Santos', 'Avda. Perón', 'Cerro Corá'])} ${ri(100, 4999)}`,
      ciudad: pick(ciudadesCli),
      contacto: pick(personas),
      segmento: seg,
      limiteCredito: seg === 'corporativo' ? 200000000 : seg === 'mayorista' ? 80000000 : 15000000,
      diasCredito: seg === 'corporativo' ? 45 : seg === 'mayorista' ? 30 : 15,
      activo: i !== 12,
      notas: i % 7 === 0 ? 'Cliente prioritario. Coordinar entregas antes de las 10hs.' : undefined,
      creadoEn: fechaHace(ri(30, 700)),
    }
  }),
  ...personas.map((n, i): T.Cliente => ({
    id: `cl${padNum(31 + i, 3)}`,
    codigo: `CLI-${padNum(31 + i, 4)}`,
    tipo: 'persona',
    razonSocial: n,
    ruc: `${1500000 + i * 12345}-${(i % 9) + 1}`,
    email: `${n.toLowerCase().replace(/[^a-z]/g, '.')}@gmail.com`,
    telefono: `+595 9${ri(71, 99)} ${ri(100, 999)} ${ri(100, 999)}`,
    direccion: `${pick(['Barrio Herrera', 'Villa Aurelia', 'Sajonia', 'Loma Pytã', 'Las Mercedes'])} ${ri(100, 2000)}`,
    ciudad: pick(ciudadesCli),
    segmento: 'minorista',
    limiteCredito: 8000000,
    diasCredito: 0,
    activo: true,
    creadoEn: fechaHace(ri(10, 400)),
  })),
]

// ---------- RRHH ----------
export const departamentos: T.Departamento[] = [
  { id: 'dp01', nombre: 'Dirección General', responsableId: 'e01' },
  { id: 'dp02', nombre: 'Ventas', responsableId: 'e02' },
  { id: 'dp03', nombre: 'Compras y Logística', responsableId: 'e03' },
  { id: 'dp04', nombre: 'Administración y Finanzas', responsableId: 'e04' },
  { id: 'dp05', nombre: 'Depósito', responsableId: 'e05' },
  { id: 'dp06', nombre: 'Recursos Humanos', responsableId: 'e06' },
]
export const cargos: T.Cargo[] = [
  { id: 'cg01', nombre: 'Gerente General', departamentoId: 'dp01', salarioBase: 18000000 },
  { id: 'cg02', nombre: 'Jefe de Ventas', departamentoId: 'dp02', salarioBase: 9500000 },
  { id: 'cg03', nombre: 'Vendedor', departamentoId: 'dp02', salarioBase: 4200000 },
  { id: 'cg04', nombre: 'Jefe de Compras', departamentoId: 'dp03', salarioBase: 9000000 },
  { id: 'cg05', nombre: 'Chofer repartidor', departamentoId: 'dp03', salarioBase: 3500000 },
  { id: 'cg06', nombre: 'Contador', departamentoId: 'dp04', salarioBase: 8500000 },
  { id: 'cg07', nombre: 'Auxiliar administrativo', departamentoId: 'dp04', salarioBase: 3200000 },
  { id: 'cg08', nombre: 'Encargado de depósito', departamentoId: 'dp05', salarioBase: 5500000 },
  { id: 'cg09', nombre: 'Operario de depósito', departamentoId: 'dp05', salarioBase: 2900000 },
  { id: 'cg10', nombre: 'Analista de RRHH', departamentoId: 'dp06', salarioBase: 6500000 },
]
interface EmpDef { n: string; a: string; cg: string; s: string; u?: string; est?: T.EstadoEmpleado; ing: number }
const empDefs: EmpDef[] = [
  { n: 'Carlos', a: 'Benítez', cg: 'cg01', s: 's01', u: 'u01', ing: 2900 },
  { n: 'María', a: 'Fernández', cg: 'cg02', s: 's01', u: 'u02', ing: 2100 },
  { n: 'Rodrigo', a: 'Ayala', cg: 'cg04', s: 's01', u: 'u03', ing: 1800 },
  { n: 'Lorena', a: 'Giménez', cg: 'cg06', s: 's01', u: 'u04', ing: 1500 },
  { n: 'Julio', a: 'Ortiz', cg: 'cg08', s: 's01', u: 'u05', ing: 2400 },
  { n: 'Natalia', a: 'Rojas', cg: 'cg10', s: 's01', u: 'u06', ing: 900 },
  { n: 'Diego', a: 'Cáceres', cg: 'cg03', s: 's01', u: 'u07', ing: 700 },
  { n: 'Andrea', a: 'Villalba', cg: 'cg03', s: 's02', u: 'u08', est: 'baja', ing: 1200 },
  { n: 'Fernando', a: 'Medina', cg: 'cg03', s: 's02', ing: 500 },
  { n: 'Claudia', a: 'Romero', cg: 'cg03', s: 's03', ing: 350 },
  { n: 'Roberto', a: 'Franco', cg: 'cg05', s: 's01', ing: 1600 },
  { n: 'Esteban', a: 'Mereles', cg: 'cg05', s: 's01', ing: 800 },
  { n: 'Víctor', a: 'Núñez', cg: 'cg05', s: 's02', ing: 600 },
  { n: 'Sandra', a: 'Ledesma', cg: 'cg07', s: 's01', ing: 1100 },
  { n: 'Marcos', a: 'Britez', cg: 'cg09', s: 's01', ing: 400 },
  { n: 'Aldo', a: 'Sanabria', cg: 'cg09', s: 's01', est: 'vacaciones', ing: 950 },
  { n: 'Cynthia', a: 'Duarte', cg: 'cg09', s: 's02', ing: 300 },
  { n: 'Ramón', a: 'Galeano', cg: 'cg09', s: 's03', est: 'licencia', ing: 250 },
  { n: 'Belén', a: 'Aquino', cg: 'cg07', s: 's02', ing: 200 },
  { n: 'Óscar', a: 'Peralta', cg: 'cg08', s: 's02', ing: 1300 },
]
export const empleados: T.Empleado[] = empDefs.map((e, i) => {
  const cargo = cargos.find((c) => c.id === e.cg)!
  return {
    id: `e${padNum(i + 1, 2)}`,
    legajo: `LEG-${padNum(i + 1, 3)}`,
    nombre: e.n,
    apellido: e.a,
    ci: `${ri(1000000, 5999999)}`,
    email: `${e.n.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}.${e.a.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}@nanduti.com.py`,
    telefono: `+595 9${ri(71, 99)} ${ri(100, 999)} ${ri(100, 999)}`,
    fechaNacimiento: fechaHace(ri(23 * 365, 55 * 365)),
    fechaIngreso: fechaHace(e.ing),
    departamentoId: cargo.departamentoId,
    cargoId: e.cg,
    sucursalId: e.s,
    salario: Math.round((cargo.salarioBase * (1 + ri(0, 15) / 100)) / 10000) * 10000,
    estado: e.est ?? 'activo',
    ips: true,
    cuentaBancaria: `${pick(['Itaú', 'Continental', 'Familiar', 'GNB', 'Visión'])} ${ri(1000000, 9999999)}`,
    usuarioId: e.u,
  }
})

// ---------- Cuentas financieras ----------
export const cuentasFinancieras: T.CuentaFinanciera[] = [
  { id: 'cf01', nombre: 'Caja Casa Central', tipo: 'caja', moneda: 'PYG', saldoInicial: 12500000, activa: true },
  { id: 'cf02', nombre: 'Caja Sucursal CDE', tipo: 'caja', moneda: 'PYG', saldoInicial: 4800000, activa: true },
  { id: 'cf03', nombre: 'Banco Itaú Cta. Cte.', tipo: 'banco', banco: 'Itaú', numero: '70045-12-8', moneda: 'PYG', saldoInicial: 385000000, activa: true },
  { id: 'cf04', nombre: 'Banco Continental Cta. Cte.', tipo: 'banco', banco: 'Continental', numero: '112-004589-3', moneda: 'PYG', saldoInicial: 142000000, activa: true },
  { id: 'cf05', nombre: 'Tigo Money Empresas', tipo: 'billetera', moneda: 'PYG', saldoInicial: 3200000, activa: true },
]

// ---------- Plan de cuentas ----------
const pc = (codigo: string, nombre: string, tipo: T.TipoCuentaContable, padre?: string, imputable = true): T.CuentaContable => ({
  id: `pc_${codigo}`, codigo, nombre, tipo, padreId: padre ? `pc_${padre}` : undefined, imputable,
})
export const planCuentas: T.CuentaContable[] = [
  pc('1', 'ACTIVO', 'activo', undefined, false),
  pc('1.1', 'Activo Corriente', 'activo', '1', false),
  pc('1.1.01', 'Caja', 'activo', '1.1'),
  pc('1.1.02', 'Bancos', 'activo', '1.1'),
  pc('1.1.03', 'Clientes (Cuentas por cobrar)', 'activo', '1.1'),
  pc('1.1.04', 'IVA Crédito Fiscal', 'activo', '1.1'),
  pc('1.1.05', 'Mercaderías', 'activo', '1.1'),
  pc('1.1.06', 'Anticipos a proveedores', 'activo', '1.1'),
  pc('1.2', 'Activo No Corriente', 'activo', '1', false),
  pc('1.2.01', 'Rodados', 'activo', '1.2'),
  pc('1.2.02', 'Muebles y útiles', 'activo', '1.2'),
  pc('1.2.03', 'Equipos de computación', 'activo', '1.2'),
  pc('1.2.04', 'Depreciación acumulada', 'activo', '1.2'),
  pc('2', 'PASIVO', 'pasivo', undefined, false),
  pc('2.1', 'Pasivo Corriente', 'pasivo', '2', false),
  pc('2.1.01', 'Proveedores (Cuentas por pagar)', 'pasivo', '2.1'),
  pc('2.1.02', 'IVA Débito Fiscal', 'pasivo', '2.1'),
  pc('2.1.03', 'Sueldos a pagar', 'pasivo', '2.1'),
  pc('2.1.04', 'IPS a pagar', 'pasivo', '2.1'),
  pc('2.1.05', 'Impuestos a pagar', 'pasivo', '2.1'),
  pc('2.2', 'Pasivo No Corriente', 'pasivo', '2', false),
  pc('2.2.01', 'Préstamos bancarios', 'pasivo', '2.2'),
  pc('3', 'PATRIMONIO NETO', 'patrimonio', undefined, false),
  pc('3.1.01', 'Capital social', 'patrimonio', '3'),
  pc('3.1.02', 'Reserva legal', 'patrimonio', '3'),
  pc('3.1.03', 'Resultados acumulados', 'patrimonio', '3'),
  pc('4', 'INGRESOS', 'ingreso', undefined, false),
  pc('4.1.01', 'Ventas de mercaderías', 'ingreso', '4'),
  pc('4.1.02', 'Descuentos obtenidos', 'ingreso', '4'),
  pc('4.1.03', 'Otros ingresos', 'ingreso', '4'),
  pc('5', 'EGRESOS', 'egreso', undefined, false),
  pc('5.1.01', 'Costo de mercaderías vendidas', 'egreso', '5'),
  pc('5.1.02', 'Sueldos y jornales', 'egreso', '5'),
  pc('5.1.03', 'Aporte patronal IPS', 'egreso', '5'),
  pc('5.1.04', 'Alquileres', 'egreso', '5'),
  pc('5.1.05', 'Servicios públicos', 'egreso', '5'),
  pc('5.1.06', 'Fletes y logística', 'egreso', '5'),
  pc('5.1.07', 'Gastos de oficina', 'egreso', '5'),
  pc('5.1.08', 'Mantenimiento de vehículos', 'egreso', '5'),
  pc('5.1.09', 'Publicidad y marketing', 'egreso', '5'),
  pc('5.1.10', 'Gastos bancarios', 'egreso', '5'),
  pc('5.1.11', 'Depreciaciones', 'egreso', '5'),
]

// ---------- Transacciones generadas ----------
const movimientosStock: T.MovimientoStock[] = []
const presupuestos: T.Presupuesto[] = []
const pedidos: T.Pedido[] = []
const facturas: T.Factura[] = []
const notasCredito: T.NotaCredito[] = []
const cobros: T.Cobro[] = []
const ordenesCompra: T.OrdenCompra[] = []
const facturasCompra: T.FacturaCompra[] = []
const pagos: T.Pago[] = []
const movimientosCaja: T.MovimientoCaja[] = []
const asientos: T.Asiento[] = []
const log: T.LogActividad[] = []
const vendidoPorProducto: Record<string, number> = {}

let nAsiento = 0
function asiento(fecha: string, concepto: string, origen: T.Asiento['origen'], lineas: T.LineaAsiento[], referencia?: string) {
  asientos.push({ id: id('as'), numero: ++nAsiento, fecha, concepto, lineas, origen, referencia })
}

// Asiento de apertura
asiento(fechaHace(370), 'Asiento de apertura ejercicio', 'apertura', [
  { cuentaId: 'pc_1.1.01', debe: 17300000, haber: 0 },
  { cuentaId: 'pc_1.1.02', debe: 527000000, haber: 0 },
  { cuentaId: 'pc_1.1.05', debe: 817000000, haber: 0 },
  { cuentaId: 'pc_1.2.01', debe: 380000000, haber: 0 },
  { cuentaId: 'pc_1.2.02', debe: 45000000, haber: 0 },
  { cuentaId: 'pc_1.2.03', debe: 28000000, haber: 0 },
  { cuentaId: 'pc_2.1.01', debe: 0, haber: 210000000 },
  { cuentaId: 'pc_2.2.01', debe: 0, haber: 150000000 },
  { cuentaId: 'pc_3.1.01', debe: 0, haber: 1200000000 },
  { cuentaId: 'pc_3.1.03', debe: 0, haber: 254300000 },
])

function lineasVenta(cliente: T.Cliente, n: number): T.LineaDocumento[] {
  const usados = new Set<string>()
  const lineas: T.LineaDocumento[] = []
  for (let i = 0; i < n; i++) {
    const p = pick(productos)
    if (usados.has(p.id)) continue
    usados.add(p.id)
    const mayorista = cliente.segmento !== 'minorista'
    lineas.push({
      productoId: p.id,
      descripcion: p.nombre,
      cantidad: mayorista ? ri(30, 140) * 6 : ri(3, 24),
      precioUnitario: mayorista ? p.precioMayorista : p.precio,
      descuento: chance(0.2) ? pick([2, 5, 10]) : 0,
      iva: p.iva,
    })
  }
  return lineas
}

// Ventas: ~12 meses, con estacionalidad
let nFac = 1200, nPed = 1200, nPre = 300, nCob = 900, nNC = 20
const clientesActivos = clientes.filter((c) => c.activo)
for (let dia = 365; dia >= 0; dia--) {
  const fecha = fechaHace(dia)
  const dow = new Date(fecha + 'T12:00:00').getDay()
  if (dow === 0) continue
  const mes = new Date(fecha + 'T12:00:00').getMonth()
  const estacional = mes === 11 ? 1.6 : mes === 0 ? 0.8 : mes >= 5 && mes <= 7 ? 1.15 : 1
  const cantVentas = Math.round((dow === 6 ? 1 : ri(2, 5)) * estacional)
  for (let k = 0; k < cantVentas; k++) {
    const cliente = pick(clientesActivos)
    const vendedor = pick(vendedores)
    const sucursalId = cliente.ciudad === 'Ciudad del Este' ? 's02' : cliente.ciudad === 'Encarnación' ? 's03' : 's01'
    const depositoId = sucursalId === 's02' ? 'd02' : sucursalId === 's03' ? 'd03' : 'd01'
    const lineas = lineasVenta(cliente, ri(2, 7))
    if (!lineas.length) continue
    const condicion: T.CondicionVenta = cliente.diasCredito > 0 && chance(0.65) ? 'credito' : 'contado'
    const pedido: T.Pedido = {
      id: id('pe'), numero: `PED-${padNum(++nPed, 6)}`, fecha, clienteId: cliente.id, vendedorId: vendedor,
      sucursalId, depositoId, lineas, estado: 'entregado',
    }
    // Pedidos recientes con estados intermedios
    if (dia <= 6) pedido.estado = pick(['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'entregado'])
    if (chance(0.03)) pedido.estado = 'cancelado'
    pedidos.push(pedido)
    if (pedido.estado === 'cancelado' || pedido.estado === 'pendiente' || pedido.estado === 'confirmado') continue

    const tot = totales(lineas)
    const vencimiento = condicion === 'credito' ? addDays(fecha, cliente.diasCredito) : fecha
    const factura: T.Factura = {
      id: id('fa'), numero: `001-00${sucursalId.slice(-1)}-${padNum(++nFac, 7)}`, timbrado: empresa.timbrado, fecha, vencimiento,
      clienteId: cliente.id, vendedorId: vendedor, sucursalId, condicion, lineas, estado: 'pendiente', pedidoId: pedido.id,
    }
    pedido.facturaId = factura.id
    facturas.push(factura)
    for (const l of lineas) {
      vendidoPorProducto[l.productoId] = (vendidoPorProducto[l.productoId] ?? 0) + l.cantidad
      movimientosStock.push({ id: id('ms'), fecha, productoId: l.productoId, depositoId, tipo: 'salida', cantidad: l.cantidad, motivo: 'Venta', referencia: factura.numero, usuarioId: 'u05' })
    }
    const costo = lineas.reduce((s, l) => s + l.cantidad * (productos.find((p) => p.id === l.productoId)?.costo ?? 0), 0)
    asiento(fecha, `Venta ${factura.numero} - ${cliente.razonSocial}`, 'venta', [
      { cuentaId: 'pc_1.1.03', debe: Math.round(tot.total), haber: 0 },
      { cuentaId: 'pc_4.1.01', debe: 0, haber: Math.round(tot.gravado) },
      { cuentaId: 'pc_2.1.02', debe: 0, haber: Math.round(tot.iva) },
      { cuentaId: 'pc_5.1.01', debe: Math.round(costo), haber: 0 },
      { cuentaId: 'pc_1.1.05', debe: 0, haber: Math.round(costo) },
    ], factura.numero)

    // Cobros
    const cobrar = (fechaCobro: string, monto: number) => {
      const medio: T.MedioPago = condicion === 'contado' ? pick(['efectivo', 'efectivo', 'tarjeta', 'billetera']) : pick(['transferencia', 'transferencia', 'cheque', 'efectivo'])
      const cuentaId = medio === 'efectivo' ? (sucursalId === 's02' ? 'cf02' : 'cf01') : medio === 'billetera' ? 'cf05' : pick(['cf03', 'cf03', 'cf04'])
      const cobro: T.Cobro = { id: id('co'), numero: `REC-${padNum(++nCob, 6)}`, fecha: fechaCobro, clienteId: cliente.id, facturaId: factura.id, monto: Math.round(monto), medio, cuentaId, referencia: medio === 'transferencia' ? `TRF-${ri(100000, 999999)}` : medio === 'cheque' ? `CHQ ${ri(1000, 9999)}` : undefined, usuarioId: 'u04' }
      cobros.push(cobro)
      movimientosCaja.push({ id: id('mc'), fecha: fechaCobro, cuentaId, tipo: 'ingreso', categoria: 'Cobranza', concepto: `Cobro ${factura.numero} - ${cliente.razonSocial}`, monto: Math.round(monto), referencia: cobro.numero, usuarioId: 'u04' })
      asiento(fechaCobro, `Cobro ${cobro.numero} - ${cliente.razonSocial}`, 'cobro', [
        { cuentaId: medio === 'efectivo' ? 'pc_1.1.01' : 'pc_1.1.02', debe: Math.round(monto), haber: 0 },
        { cuentaId: 'pc_1.1.03', debe: 0, haber: Math.round(monto) },
      ], cobro.numero)
    }
    if (condicion === 'contado') {
      cobrar(fecha, tot.total)
      factura.estado = 'pagada'
    } else {
      const diasPago = ri(-5, 25) + cliente.diasCredito
      const fechaPago = addDays(fecha, Math.max(1, diasPago))
      if (fechaPago <= hoy && chance(0.9)) {
        if (chance(0.15)) {
          cobrar(addDays(fecha, ri(3, 10)), tot.total * 0.5)
          cobrar(fechaPago, tot.total * 0.5)
        } else cobrar(fechaPago, tot.total)
        factura.estado = 'pagada'
      } else if (chance(0.25) && dia > 5) {
        cobrar(addDays(fecha, ri(3, 15)), tot.total * pick([0.3, 0.5, 0.6]))
        factura.estado = vencimiento < hoy ? 'vencida' : 'parcial'
      } else {
        factura.estado = vencimiento < hoy ? 'vencida' : 'pendiente'
      }
    }
    // Notas de crédito ocasionales
    if (chance(0.02) && lineas.length > 1) {
      const l = lineas[0]
      const lineaNC = { ...l, cantidad: Math.max(1, Math.floor(l.cantidad / 3)) }
      notasCredito.push({ id: id('nc'), numero: `NC-${padNum(++nNC, 6)}`, fecha: addDays(fecha, ri(1, 5)), facturaId: factura.id, clienteId: cliente.id, motivo: pick(['Devolución por producto dañado', 'Diferencia de precio', 'Devolución parcial', 'Producto vencido']), lineas: [lineaNC] })
      movimientosStock.push({ id: id('ms'), fecha: addDays(fecha, ri(1, 5)), productoId: l.productoId, depositoId, tipo: 'entrada', cantidad: lineaNC.cantidad, motivo: 'Devolución de cliente', referencia: `NC-${padNum(nNC, 6)}`, usuarioId: 'u05' })
    }
  }
  // Presupuestos
  if (chance(0.35)) {
    const cliente = pick(clientesActivos)
    const estado: T.EstadoPresupuesto = dia < 20 ? pick(['borrador', 'enviado', 'enviado']) : pick(['aceptado', 'aceptado', 'rechazado', 'vencido'])
    presupuestos.push({ id: id('pr'), numero: `PRE-${padNum(++nPre, 6)}`, fecha, validoHasta: addDays(fecha, 15), clienteId: cliente.id, vendedorId: pick(vendedores), lineas: lineasVenta(cliente, ri(2, 6)), estado, notas: chance(0.3) ? 'Precios sujetos a disponibilidad de stock.' : undefined })
  }
}

// Compras: reposición dimensionada según lo efectivamente vendido de cada proveedor.
// Cada proveedor recibe una orden cada `cadencia` dias; la cantidad pedida cubre lo vendido
// en ese intervalo mas un 8% de colchon, redondeado a bultos de 6 unidades.
let nOC = 500, nFC = 0, nPag = 400
const provsActivos = proveedores.filter((p) => p.activo && p.id !== 'p12')
interface PlanOC { dia: number; provId: string }
const planOC: PlanOC[] = []
provsActivos.forEach((prov, idx) => {
  const cadencia = ['p07', 'p11', 'p09'].includes(prov.id) ? 14 : 21 // perecederos se reponen mas seguido
  for (let dia = 365 - (idx * 2) % cadencia; dia >= 0; dia -= cadencia) planOC.push({ dia, provId: prov.id })
})
planOC.sort((a, b) => b.dia - a.dia)

for (const plan of planOC) {
  const dia = plan.dia
  const fecha = fechaHace(dia)
  const prov = provsActivos.find((p) => p.id === plan.provId)!
  const prods = productos.filter((p) => p.proveedorId === prov.id)
  if (!prods.length) continue
  const cadencia = ['p07', 'p11', 'p09'].includes(prov.id) ? 14 : 21
  const ordenesDelAnho = Math.max(1, Math.round(366 / cadencia))
  const depositoId = pick(['d01', 'd01', 'd01', 'd01', 'd02', 'd03'])
  const lineas: T.LineaOC[] = []
  const masVendidos = [...prods].sort((a, b) => (vendidoPorProducto[b.id] ?? 0) - (vendidoPorProducto[a.id] ?? 0)).slice(0, 8)
  for (const p of masVendidos) {
    const vendidoAnual = vendidoPorProducto[p.id] ?? 0
    if (!vendidoAnual) continue
    // La OC repone lo vendido entre reposiciones, en bultos de 6
    const base = (vendidoAnual / ordenesDelAnho) * (1 + ri(-8, 8) / 100)
    const cantidad = Math.max(12, Math.round(base / 6) * 6)
    lineas.push({ productoId: p.id, descripcion: p.nombre, cantidad, precioUnitario: Math.round(p.costo * (1 + p.iva / 100)), descuento: 0, iva: p.iva, recibido: cantidad })
  }
  if (!lineas.length) continue
  let estado: T.EstadoOC = 'recibida'
  if (dia <= 12) estado = pick(['borrador', 'enviada', 'enviada', 'parcial', 'recibida'])
  if (estado === 'parcial') lineas.forEach((l) => (l.recibido = Math.floor(l.cantidad / 2)))
  if (estado === 'borrador' || estado === 'enviada') lineas.forEach((l) => (l.recibido = 0))
  const oc: T.OrdenCompra = { id: id('oc'), numero: `OC-${padNum(++nOC, 6)}`, fecha, entregaEstimada: addDays(fecha, ri(3, 10)), proveedorId: prov.id, depositoId, compradorId: 'u03', lineas, estado }
  ordenesCompra.push(oc)
  if (estado === 'borrador' || estado === 'enviada') continue
  const fechaRecep = addDays(fecha, ri(2, 8))
  for (const l of lineas) {
    if (l.recibido > 0) movimientosStock.push({ id: id('ms'), fecha: fechaRecep, productoId: l.productoId, depositoId, tipo: 'entrada', cantidad: l.recibido, motivo: 'Recepción de compra', referencia: oc.numero, usuarioId: 'u05' })
  }
  const lineasFC: T.LineaDocumento[] = lineas.map((l) => ({ productoId: l.productoId, descripcion: l.descripcion, cantidad: l.recibido, precioUnitario: l.precioUnitario, descuento: l.descuento, iva: l.iva }))
  const tot = totales(lineasFC)
  const venc = addDays(fechaRecep, prov.diasPago)
  const fc: T.FacturaCompra = { id: id('fc'), numero: `${padNum(ri(1, 3), 3)}-${padNum(ri(1, 3), 3)}-${padNum(++nFC * 37 + 1000, 7)}`, fecha: fechaRecep, vencimiento: venc, proveedorId: prov.id, ordenCompraId: oc.id, lineas: lineasFC, estado: 'pendiente' }
  facturasCompra.push(fc)
  asiento(fechaRecep, `Compra ${fc.numero} - ${prov.razonSocial}`, 'compra', [
    { cuentaId: 'pc_1.1.05', debe: Math.round(tot.gravado), haber: 0 },
    { cuentaId: 'pc_1.1.04', debe: Math.round(tot.iva), haber: 0 },
    { cuentaId: 'pc_2.1.01', debe: 0, haber: Math.round(tot.total) },
  ], fc.numero)
  const fechaPago = addDays(venc, ri(-3, 5))
  if (fechaPago <= hoy && chance(0.92)) {
    const pago: T.Pago = { id: id('pg'), numero: `OP-${padNum(++nPag, 6)}`, fecha: fechaPago, proveedorId: prov.id, facturaCompraId: fc.id, monto: Math.round(tot.total), medio: pick(['transferencia', 'transferencia', 'cheque']), cuentaId: pick(['cf03', 'cf03', 'cf04']), referencia: `TRF-${ri(100000, 999999)}`, usuarioId: 'u04' }
    pagos.push(pago)
    fc.estado = 'pagada'
    movimientosCaja.push({ id: id('mc'), fecha: fechaPago, cuentaId: pago.cuentaId, tipo: 'egreso', categoria: 'Pago a proveedores', concepto: `Pago ${fc.numero} - ${prov.razonSocial}`, monto: pago.monto, referencia: pago.numero, usuarioId: 'u04' })
    asiento(fechaPago, `Pago ${pago.numero} - ${prov.razonSocial}`, 'pago', [
      { cuentaId: 'pc_2.1.01', debe: pago.monto, haber: 0 },
      { cuentaId: 'pc_1.1.02', debe: 0, haber: pago.monto },
    ], pago.numero)
  } else {
    fc.estado = venc < hoy ? 'vencida' : 'pendiente'
  }
}

// Gastos operativos mensuales y sueldos
const gastosFijos: { cat: string; concepto: string; monto: number; cuenta: string; dia: number }[] = [
  { cat: 'Alquileres', concepto: 'Alquiler galpón y oficinas', monto: 28000000, cuenta: 'pc_5.1.04', dia: 5 },
  { cat: 'Servicios', concepto: 'ANDE - Energía eléctrica', monto: 6400000, cuenta: 'pc_5.1.05', dia: 12 },
  { cat: 'Servicios', concepto: 'ESSAP - Agua', monto: 850000, cuenta: 'pc_5.1.05', dia: 12 },
  { cat: 'Servicios', concepto: 'Tigo Empresas - Internet y telefonía', monto: 2100000, cuenta: 'pc_5.1.05', dia: 15 },
  { cat: 'Logística', concepto: 'Combustible flota', monto: 9800000, cuenta: 'pc_5.1.06', dia: 20 },
  { cat: 'Logística', concepto: 'Fletes tercerizados - Rápido Express', monto: 5500000, cuenta: 'pc_5.1.06', dia: 25 },
  { cat: 'Marketing', concepto: 'Publicidad redes sociales', monto: 1800000, cuenta: 'pc_5.1.09', dia: 8 },
  { cat: 'Gastos bancarios', concepto: 'Comisiones y mantenimiento de cuentas', monto: 650000, cuenta: 'pc_5.1.10', dia: 28 },
  { cat: 'Oficina', concepto: 'Insumos de oficina y limpieza', monto: 1200000, cuenta: 'pc_5.1.07', dia: 10 },
  { cat: 'Mantenimiento', concepto: 'Service y mantenimiento de camiones', monto: 3200000, cuenta: 'pc_5.1.08', dia: 18 },
]
const liquidaciones: T.Liquidacion[] = []
for (let m = 12; m >= 0; m--) {
  const d = new Date(HOY)
  d.setMonth(d.getMonth() - m)
  d.setDate(1)
  const ym = iso(d).slice(0, 7)
  for (const g of gastosFijos) {
    const f = `${ym}-${padNum(g.dia, 2)}`
    if (f > hoy) continue
    const monto = Math.round((g.monto * (1 + ri(-8, 8) / 100)) / 1000) * 1000
    movimientosCaja.push({ id: id('mc'), fecha: f, cuentaId: 'cf03', tipo: 'egreso', categoria: g.cat, concepto: g.concepto, monto, usuarioId: 'u04' })
    asiento(f, g.concepto, 'manual', [
      { cuentaId: g.cuenta, debe: monto, haber: 0 },
      { cuentaId: 'pc_1.1.02', debe: 0, haber: monto },
    ])
  }
  // Sueldos
  const fSueldo = `${ym}-28`
  if (fSueldo <= hoy || m === 0) {
    const activos = empleados.filter((e) => e.estado !== 'baja' || m > 1)
    const lineas: T.LineaLiquidacion[] = activos.map((e) => {
      const he = chance(0.4) ? ri(2, 20) * Math.round(e.salario / 200) : 0
      const bon = e.cargoId === 'cg03' ? ri(0, 15) * 100000 : 0
      const desc = chance(0.15) ? ri(1, 5) * 100000 : 0
      const ips = Math.round((e.salario + he) * 0.09)
      return { empleadoId: e.id, salarioBase: e.salario, horasExtra: he, bonificaciones: bon, descuentos: desc, ips, neto: e.salario + he + bon - desc - ips }
    })
    const estado: T.Liquidacion['estado'] = m === 0 ? 'borrador' : 'pagada'
    liquidaciones.push({ id: id('lq'), periodo: ym, fecha: fSueldo, lineas, estado })
    if (estado === 'pagada') {
      const totalNeto = lineas.reduce((s, l) => s + l.neto, 0)
      const totalIps = lineas.reduce((s, l) => s + l.ips, 0)
      const bruto = lineas.reduce((s, l) => s + l.salarioBase + l.horasExtra + l.bonificaciones, 0)
      const patronal = Math.round(bruto * 0.165)
      movimientosCaja.push({ id: id('mc'), fecha: fSueldo, cuentaId: 'cf03', tipo: 'egreso', categoria: 'Sueldos', concepto: `Pago de sueldos ${ym}`, monto: totalNeto, usuarioId: 'u04' })
      asiento(fSueldo, `Liquidación de sueldos ${ym}`, 'sueldos', [
        { cuentaId: 'pc_5.1.02', debe: bruto, haber: 0 },
        { cuentaId: 'pc_5.1.03', debe: patronal, haber: 0 },
        { cuentaId: 'pc_2.1.04', debe: 0, haber: totalIps + patronal },
        { cuentaId: 'pc_1.1.02', debe: 0, haber: totalNeto },
        { cuentaId: 'pc_2.1.03', debe: 0, haber: bruto - totalIps - totalNeto },
      ])
    }
  }
}

// Depositos bancarios semanales de la recaudacion en efectivo.
// Sin esto la caja acumularia saldos irreales y el banco quedaria en descubierto.
for (let dia = 361; dia >= 1; dia -= 7) {
  const desde = fechaHace(dia + 7)
  const hasta = fechaHace(dia)
  for (const cajaId of ['cf01', 'cf02', 'cf05']) {
    const movs = movimientosCaja.filter((m) => m.cuentaId === cajaId && m.fecha > desde && m.fecha <= hasta)
    const neto = movs.reduce((a, m) => a + (m.tipo === 'ingreso' ? m.monto : -m.monto), 0)
    const aDepositar = Math.round((neto * 0.95) / 10000) * 10000
    if (aDepositar < 500000) continue
    const bancoId = cajaId === 'cf02' ? 'cf04' : dia % 14 === 1 ? 'cf04' : 'cf03'
    movimientosCaja.push({ id: id('mc'), fecha: hasta, cuentaId: cajaId, tipo: 'transferencia', categoria: 'Deposito bancario', concepto: `Deposito de recaudacion en ${cuentasFinancieras.find((c) => c.id === bancoId)?.nombre}`, monto: aDepositar, cuentaDestinoId: bancoId, usuarioId: 'u04' })
    // Solo la caja en efectivo mueve cuentas contables distintas; la billetera ya se imputa a bancos
    if (cajaId !== 'cf05') {
      asiento(hasta, 'Deposito de recaudacion en cuenta bancaria', 'manual', [
        { cuentaId: 'pc_1.1.02', debe: aDepositar, haber: 0 },
        { cuentaId: 'pc_1.1.01', debe: 0, haber: aDepositar },
      ])
    }
  }
}

// Liquidacion mensual de IVA (Formulario 120) y pago de aportes al IPS
for (let m = 12; m >= 1; m--) {
  const d = new Date(HOY)
  d.setMonth(d.getMonth() - m)
  d.setDate(1)
  const ym = iso(d).slice(0, 7)
  const delMes = asientos.filter((a) => a.fecha.slice(0, 7) === ym)
  const debito = delMes.reduce((acc, a) => acc + a.lineas.filter((l) => l.cuentaId === 'pc_2.1.02').reduce((x, l) => x + l.haber - l.debe, 0), 0)
  const credito = delMes.reduce((acc, a) => acc + a.lineas.filter((l) => l.cuentaId === 'pc_1.1.04').reduce((x, l) => x + l.debe - l.haber, 0), 0)
  const aPagar = Math.round(debito - credito)
  const fVenc = `${ym}-28`
  const fPago = addDays(fVenc, 10)
  if (aPagar > 0 && fPago <= hoy) {
    asiento(fVenc, `Liquidacion de IVA ${ym}`, 'manual', [
      { cuentaId: 'pc_2.1.02', debe: Math.round(debito), haber: 0 },
      { cuentaId: 'pc_1.1.04', debe: 0, haber: Math.round(credito) },
      { cuentaId: 'pc_2.1.05', debe: 0, haber: aPagar },
    ])
    movimientosCaja.push({ id: id('mc'), fecha: fPago, cuentaId: 'cf03', tipo: 'egreso', categoria: 'Impuestos', concepto: `Pago de IVA ${ym} - SET Formulario 120`, monto: aPagar, usuarioId: 'u04' })
    asiento(fPago, `Pago de IVA ${ym}`, 'manual', [
      { cuentaId: 'pc_2.1.05', debe: aPagar, haber: 0 },
      { cuentaId: 'pc_1.1.02', debe: 0, haber: aPagar },
    ])
  }
  const ips = delMes.reduce((acc, a) => acc + a.lineas.filter((l) => l.cuentaId === 'pc_2.1.04').reduce((x, l) => x + l.haber - l.debe, 0), 0)
  const fIps = `${ym}-20`
  const fPagoIps = addDays(fIps, 20)
  if (ips > 0 && fPagoIps <= hoy) {
    movimientosCaja.push({ id: id('mc'), fecha: fPagoIps, cuentaId: 'cf03', tipo: 'egreso', categoria: 'Impuestos', concepto: `Aportes IPS ${ym}`, monto: Math.round(ips), usuarioId: 'u04' })
    asiento(fPagoIps, `Pago de aportes al IPS ${ym}`, 'manual', [
      { cuentaId: 'pc_2.1.04', debe: Math.round(ips), haber: 0 },
      { cuentaId: 'pc_1.1.02', debe: 0, haber: Math.round(ips) },
    ])
  }
}

// Ajustes de stock ocasionales
for (let i = 0; i < 25; i++) {
  const p = pick(productos)
  movimientosStock.push({ id: id('ms'), fecha: dateRange(300), productoId: p.id, depositoId: pick(['d01', 'd02', 'd03']), tipo: 'ajuste', cantidad: ri(-8, 5), motivo: pick(['Inventario físico', 'Rotura', 'Vencimiento', 'Merma', 'Corrección de carga']), usuarioId: 'u05' })
}
for (let i = 0; i < 20; i++) {
  const p = pick(productos)
  movimientosStock.push({ id: id('ms'), fecha: dateRange(300), productoId: p.id, depositoId: 'd01', depositoDestinoId: pick(['d02', 'd03']), tipo: 'transferencia', cantidad: ri(12, 96), motivo: 'Reposición sucursal', usuarioId: 'u05' })
}

// ---------- RRHH: asistencias, vacaciones ----------
const asistencias: T.Asistencia[] = []
for (let dia = 30; dia >= 0; dia--) {
  const fecha = fechaHace(dia)
  const dow = new Date(fecha + 'T12:00:00').getDay()
  if (dow === 0 || dow === 6) continue
  for (const e of empleados) {
    if (e.estado === 'baja') continue
    let estado: T.Asistencia['estado'] = 'presente'
    if (e.estado === 'vacaciones' && dia < 12) estado = 'vacaciones'
    else if (e.estado === 'licencia' && dia < 20) estado = 'licencia'
    else if (chance(0.04)) estado = 'ausente'
    else if (chance(0.1)) estado = 'tarde'
    const entradaMin = estado === 'tarde' ? ri(15, 55) : ri(-10, 5)
    const hIn = new Date(`${fecha}T08:00:00`)
    hIn.setMinutes(hIn.getMinutes() + entradaMin)
    const hOut = new Date(`${fecha}T17:00:00`)
    hOut.setMinutes(hOut.getMinutes() + ri(-5, 60))
    const hhmm = (dt: Date) => dt.toTimeString().slice(0, 5)
    asistencias.push({ id: id('at'), empleadoId: e.id, fecha, estado, entrada: ['presente', 'tarde'].includes(estado) ? hhmm(hIn) : undefined, salida: ['presente', 'tarde'].includes(estado) ? hhmm(hOut) : undefined })
  }
}
const vacaciones: T.Vacacion[] = [
  { id: id('vc'), empleadoId: 'e16', desde: fechaHace(11), hasta: addDays(hoy, 3), dias: 12, estado: 'aprobada', motivo: 'Vacaciones anuales' },
  { id: id('vc'), empleadoId: 'e07', desde: addDays(hoy, 20), hasta: addDays(hoy, 34), dias: 12, estado: 'solicitada', motivo: 'Vacaciones anuales' },
  { id: id('vc'), empleadoId: 'e11', desde: addDays(hoy, 45), hasta: addDays(hoy, 52), dias: 6, estado: 'solicitada', motivo: 'Viaje familiar' },
  { id: id('vc'), empleadoId: 'e02', desde: fechaHace(90), hasta: fechaHace(78), dias: 12, estado: 'aprobada' },
  { id: id('vc'), empleadoId: 'e05', desde: fechaHace(150), hasta: fechaHace(138), dias: 12, estado: 'aprobada' },
  { id: id('vc'), empleadoId: 'e14', desde: addDays(hoy, 10), hasta: addDays(hoy, 12), dias: 3, estado: 'rechazada', motivo: 'Cierre de mes' },
]

// ---------- CRM ----------
const oportunidades: T.Oportunidad[] = [
  { id: id('op'), titulo: 'Provisión mensual bebidas - Hotel Guaraní', clienteId: 'cl006', vendedorId: 'u02', valor: 48000000, probabilidad: 70, etapa: 'negociacion', fechaCierre: addDays(hoy, 12), creadoEn: fechaHace(20), notas: 'Piden 60 días de crédito. Evaluar con finanzas.' },
  { id: id('op'), titulo: 'Contrato anual comedor UNA', clienteId: 'cl021', vendedorId: 'u07', valor: 180000000, probabilidad: 45, etapa: 'propuesta', fechaCierre: addDays(hoy, 30), creadoEn: fechaHace(35), notas: 'Licitación. Entregar propuesta antes del 30.' },
  { id: id('op'), titulo: 'Apertura nueva sucursal Súper Real', clienteId: 'cl005', vendedorId: 'u02', valor: 95000000, probabilidad: 60, etapa: 'propuesta', fechaCierre: addDays(hoy, 25), creadoEn: fechaHace(15) },
  { id: id('op'), titulo: 'Kit limpieza Hospital Central', clienteId: 'cl020', vendedorId: 'u07', valor: 32000000, probabilidad: 30, etapa: 'contacto', fechaCierre: addDays(hoy, 40), creadoEn: fechaHace(8) },
  { id: id('op'), titulo: 'Reposición semanal Autoservicio Familiar', clienteId: 'cl026', vendedorId: 'u07', valor: 22000000, probabilidad: 20, etapa: 'prospecto', fechaCierre: addDays(hoy, 50), creadoEn: fechaHace(3) },
  { id: id('op'), titulo: 'Bebidas evento Club Olimpia', clienteId: 'cl017', vendedorId: 'u02', valor: 15500000, probabilidad: 100, etapa: 'ganada', fechaCierre: fechaHace(5), creadoEn: fechaHace(30) },
  { id: id('op'), titulo: 'Canasta navideña empresas', clienteId: 'cl010', vendedorId: 'u02', valor: 65000000, probabilidad: 50, etapa: 'negociacion', fechaCierre: addDays(hoy, 60), creadoEn: fechaHace(10) },
  { id: id('op'), titulo: 'Snacks kioscos Servicentro', clienteId: 'cl023', vendedorId: 'u07', valor: 8500000, probabilidad: 0, etapa: 'perdida', fechaCierre: fechaHace(12), creadoEn: fechaHace(40), notas: 'Eligieron competidor por precio.' },
  { id: id('op'), titulo: 'Lácteos Panadería La Espiga', clienteId: 'cl016', vendedorId: 'u02', valor: 12000000, probabilidad: 80, etapa: 'negociacion', fechaCierre: addDays(hoy, 7), creadoEn: fechaHace(18) },
  { id: id('op'), titulo: 'Yerba y café Farmacia Catedral', clienteId: 'cl022', vendedorId: 'u07', valor: 6800000, probabilidad: 35, etapa: 'contacto', fechaCierre: addDays(hoy, 21), creadoEn: fechaHace(6) },
]
const actividadesCRM: T.ActividadCRM[] = [
  { id: id('ac'), clienteId: 'cl006', oportunidadId: oportunidades[0].id, tipo: 'reunion', descripcion: 'Reunión con gerente de compras. Revisaron lista de precios mayorista.', fecha: fechaHace(3, '10:00'), usuarioId: 'u02', completada: true },
  { id: id('ac'), clienteId: 'cl006', oportunidadId: oportunidades[0].id, tipo: 'tarea', descripcion: 'Enviar propuesta con condición de pago a 45 días', fecha: addDays(hoy, 2) + 'T09:00:00', usuarioId: 'u02', completada: false },
  { id: id('ac'), clienteId: 'cl021', oportunidadId: oportunidades[1].id, tipo: 'email', descripcion: 'Enviado pliego de condiciones y catálogo completo.', fecha: fechaHace(7, '15:30'), usuarioId: 'u07', completada: true },
  { id: id('ac'), clienteId: 'cl021', oportunidadId: oportunidades[1].id, tipo: 'tarea', descripcion: 'Preparar propuesta económica licitación', fecha: addDays(hoy, 5) + 'T09:00:00', usuarioId: 'u07', completada: false },
  { id: id('ac'), clienteId: 'cl005', oportunidadId: oportunidades[2].id, tipo: 'llamada', descripcion: 'Llamada con encargado de la nueva sucursal. Necesitan surtido inicial completo.', fecha: fechaHace(2, '11:15'), usuarioId: 'u02', completada: true },
  { id: id('ac'), clienteId: 'cl020', oportunidadId: oportunidades[3].id, tipo: 'llamada', descripcion: 'Primer contacto. Interesados en kit de limpieza institucional.', fecha: fechaHace(1, '16:00'), usuarioId: 'u07', completada: true },
  { id: id('ac'), clienteId: 'cl001', tipo: 'nota', descripcion: 'Cliente reclamó demora en entrega del pedido del jueves. Se compensó con descuento del 5%.', fecha: fechaHace(4, '09:30'), usuarioId: 'u02', completada: true },
  { id: id('ac'), clienteId: 'cl010', oportunidadId: oportunidades[6].id, tipo: 'reunion', descripcion: 'Presentación de canastas navideñas en 3 opciones.', fecha: addDays(hoy, 1) + 'T14:00:00', usuarioId: 'u02', completada: false },
  { id: id('ac'), clienteId: 'cl016', oportunidadId: oportunidades[8].id, tipo: 'llamada', descripcion: 'Confirmar volúmenes semanales de lácteos', fecha: addDays(hoy, 0) + 'T17:00:00', usuarioId: 'u02', completada: false },
  { id: id('ac'), clienteId: 'cl002', tipo: 'email', descripcion: 'Enviada lista de precios actualizada septiembre.', fecha: fechaHace(6, '08:45'), usuarioId: 'u07', completada: true },
]

// ---------- Tareas ----------
const tareas: T.Tarea[] = [
  { id: id('tk'), titulo: 'Cierre contable agosto', descripcion: 'Conciliar bancos y revisar asientos pendientes', asignadoId: 'u04', fechaLimite: addDays(hoy, 2), prioridad: 'alta', estado: 'en_progreso', modulo: 'Contabilidad' },
  { id: id('tk'), titulo: 'Inventario físico Depósito Central', descripcion: 'Conteo de categorías Bebidas y Almacén', asignadoId: 'u05', fechaLimite: addDays(hoy, 5), prioridad: 'media', estado: 'pendiente', modulo: 'Inventario' },
  { id: id('tk'), titulo: 'Reclamar facturas vencidas +30 días', asignadoId: 'u02', fechaLimite: addDays(hoy, 1), prioridad: 'alta', estado: 'pendiente', modulo: 'Ventas' },
  { id: id('tk'), titulo: 'Renovar contrato con Paresa', descripcion: 'Negociar mejora de precio por volumen', asignadoId: 'u03', fechaLimite: addDays(hoy, 10), prioridad: 'media', estado: 'pendiente', modulo: 'Compras' },
  { id: id('tk'), titulo: 'Aprobar liquidación de sueldos septiembre', asignadoId: 'u01', fechaLimite: addDays(hoy, 14), prioridad: 'alta', estado: 'pendiente', modulo: 'RRHH' },
  { id: id('tk'), titulo: 'Actualizar lista de precios mayorista', asignadoId: 'u02', fechaLimite: fechaHace(2), prioridad: 'media', estado: 'completada', modulo: 'Ventas' },
  { id: id('tk'), titulo: 'Capacitación nuevo operario', asignadoId: 'u06', fechaLimite: addDays(hoy, 3), prioridad: 'baja', estado: 'en_progreso', modulo: 'RRHH' },
  { id: id('tk'), titulo: 'Verificar vencimiento timbrado', asignadoId: 'u04', fechaLimite: addDays(hoy, 30), prioridad: 'baja', estado: 'pendiente', modulo: 'Configuración' },
]

// ---------- Notificaciones ----------
const bajoStock = productos.filter((p) => p.stockPorDeposito.d01 < p.stockMinimo)
const notificaciones: T.Notificacion[] = [
  { id: id('nt'), fecha: fechaHace(0, '08:05'), titulo: 'Stock bajo mínimo', mensaje: `${bajoStock.length} productos por debajo del stock mínimo en Depósito Central`, tipo: 'warning', leida: false, link: '/inventario/productos?filtro=bajo' },
  { id: id('nt'), fecha: fechaHace(0, '07:30'), titulo: 'Facturas vencidas', mensaje: `${facturas.filter((f) => f.estado === 'vencida').length} facturas de venta vencidas sin cobrar`, tipo: 'error', leida: false, link: '/facturacion/facturas?estado=vencida' },
  { id: id('nt'), fecha: fechaHace(1, '17:45'), titulo: 'Pedido entregado', mensaje: 'El pedido PED-001580 fue marcado como entregado por Julio Ortiz', tipo: 'success', leida: true, link: '/ventas/pedidos' },
  { id: id('nt'), fecha: fechaHace(1, '12:10'), titulo: 'Solicitud de vacaciones', mensaje: 'Diego Cáceres solicitó 12 días de vacaciones', tipo: 'info', leida: false, link: '/rrhh/vacaciones' },
  { id: id('nt'), fecha: fechaHace(2, '09:00'), titulo: 'Orden de compra recibida', mensaje: 'Se recibió mercadería de Paresa S.A. en Depósito Central', tipo: 'success', leida: true, link: '/compras/ordenes' },
  { id: id('nt'), fecha: fechaHace(3, '10:20'), titulo: 'Liquidación pendiente', mensaje: 'La liquidación de sueldos de septiembre está en borrador', tipo: 'info', leida: true, link: '/rrhh/liquidaciones' },
]

// ---------- Log ----------
const acciones = ['Creó factura', 'Registró cobro', 'Actualizó producto', 'Creó pedido', 'Registró recepción', 'Creó orden de compra', 'Registró pago', 'Ajustó stock', 'Aprobó vacaciones', 'Creó cliente', 'Editó cliente', 'Registró asiento']
for (let i = 0; i < 60; i++) {
  const u = pick(usuarios.filter((x) => x.activo))
  const dia = ri(0, 10)
  log.push({ id: id('lg'), fecha: fechaHace(dia, `${padNum(ri(7, 18), 2)}:${padNum(ri(0, 59), 2)}`), usuarioId: u.id, modulo: pick(['Ventas', 'Compras', 'Inventario', 'Finanzas', 'RRHH', 'Clientes']), accion: pick(acciones), detalle: `Ref. ${pick(['FAC', 'PED', 'OC', 'REC', 'OP', 'AJ'])}-${ri(1000, 9999)}` })
}
log.sort((a, b) => b.fecha.localeCompare(a.fecha))

facturas.sort((a, b) => b.fecha.localeCompare(a.fecha))
pedidos.sort((a, b) => b.fecha.localeCompare(a.fecha))
presupuestos.sort((a, b) => b.fecha.localeCompare(a.fecha))
cobros.sort((a, b) => b.fecha.localeCompare(a.fecha))
ordenesCompra.sort((a, b) => b.fecha.localeCompare(a.fecha))
facturasCompra.sort((a, b) => b.fecha.localeCompare(a.fecha))
pagos.sort((a, b) => b.fecha.localeCompare(a.fecha))
movimientosStock.sort((a, b) => b.fecha.localeCompare(a.fecha))
movimientosCaja.sort((a, b) => b.fecha.localeCompare(a.fecha))
asientos.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.numero - b.numero)
asientos.forEach((a, i) => (a.numero = i + 1))
liquidaciones.sort((a, b) => b.periodo.localeCompare(a.periodo))

export const seedData: T.ERPData = {
  empresa, usuarios, sucursales, depositos, categorias, marcas, productos, movimientosStock, clientes, proveedores,
  presupuestos, pedidos, facturas, notasCredito, cobros, ordenesCompra, facturasCompra, pagos, cuentasFinancieras,
  movimientosCaja, planCuentas, asientos, departamentos, cargos, empleados, asistencias, vacaciones, liquidaciones,
  oportunidades, actividadesCRM, tareas, log, notificaciones,
}

// Sanity: evitar imports no usados
void lineaSubtotal
void lineaIva
