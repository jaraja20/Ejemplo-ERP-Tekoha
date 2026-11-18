import { useState } from 'react'
import { Plus, Pencil, RotateCcw, Building2, Users, MapPin, Tag, Wallet, ScrollText } from 'lucide-react'
import { useERP } from '@/store/erp'
import type { Usuario, Rol, Sucursal, Categoria, CuentaFinanciera } from '@/types'
import { PageHeader, Tabs, Modal, Field, Select, Badge, ConfirmDialog, Avatar, DataTable, Alert, type Column } from '@/components/ui'
import { fmtDate, fmtDateTime, fmtMoney, uid } from '@/lib/utils'

export default function Configuracion() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const [tab, setTab] = useState<'empresa' | 'usuarios' | 'sucursales' | 'catalogo' | 'cuentas' | 'auditoria'>('empresa')
  const [emp, setEmp] = useState(s.empresa)
  const [userForm, setUserForm] = useState<(Partial<Usuario> & { id?: string }) | null>(null)
  const [sucForm, setSucForm] = useState<(Partial<Sucursal> & { id?: string }) | null>(null)
  const [catForm, setCatForm] = useState<(Partial<Categoria> & { id?: string }) | null>(null)
  const [ctaForm, setCtaForm] = useState<(Partial<CuentaFinanciera> & { id?: string }) | null>(null)
  const [reset, setReset] = useState(false)

  const logColumns: Column<(typeof s.log)[number]> = { key: '', header: '' } as never
  void logColumns

  return (
    <div>
      <PageHeader title="Configuración" subtitle="Datos de la empresa, usuarios, estructura y parámetros del sistema" actions={<button className="btn-danger" onClick={() => setReset(true)}><RotateCcw size={16} /> Restaurar datos de demo</button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'empresa', label: 'Empresa' }, { value: 'usuarios', label: 'Usuarios y roles', count: s.usuarios.length }, { value: 'sucursales', label: 'Sucursales y depósitos' }, { value: 'catalogo', label: 'Categorías y marcas' }, { value: 'cuentas', label: 'Cuentas financieras' }, { value: 'auditoria', label: 'Auditoría' }]} />

      {tab === 'empresa' && (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800"><Building2 size={16} className="text-brand-600" /> Datos fiscales y de contacto</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Razón social" className="sm:col-span-2"><input className="input" value={emp.razonSocial} onChange={(e) => setEmp({ ...emp, razonSocial: e.target.value })} /></Field>
              <Field label="Nombre de fantasía"><input className="input" value={emp.nombreFantasia} onChange={(e) => setEmp({ ...emp, nombreFantasia: e.target.value })} /></Field>
              <Field label="RUC"><input className="input" value={emp.ruc} onChange={(e) => setEmp({ ...emp, ruc: e.target.value })} /></Field>
              <Field label="Dirección"><input className="input" value={emp.direccion} onChange={(e) => setEmp({ ...emp, direccion: e.target.value })} /></Field>
              <Field label="Ciudad"><input className="input" value={emp.ciudad} onChange={(e) => setEmp({ ...emp, ciudad: e.target.value })} /></Field>
              <Field label="Teléfono"><input className="input" value={emp.telefono} onChange={(e) => setEmp({ ...emp, telefono: e.target.value })} /></Field>
              <Field label="Email"><input className="input" value={emp.email} onChange={(e) => setEmp({ ...emp, email: e.target.value })} /></Field>
              <Field label="Sitio web"><input className="input" value={emp.web} onChange={(e) => setEmp({ ...emp, web: e.target.value })} /></Field>
              <Field label="Moneda"><input className="input" value={emp.moneda} onChange={(e) => setEmp({ ...emp, moneda: e.target.value })} /></Field>
              <Field label="Símbolo"><input className="input" value={emp.simbolo} onChange={(e) => setEmp({ ...emp, simbolo: e.target.value })} /></Field>
              <Field label="Timbrado"><input className="input" value={emp.timbrado} onChange={(e) => setEmp({ ...emp, timbrado: e.target.value })} /></Field>
              <Field label="Vencimiento del timbrado"><input type="date" className="input" value={emp.vencimientoTimbrado} onChange={(e) => setEmp({ ...emp, vencimientoTimbrado: e.target.value })} /></Field>
              <Field label="IVA general (%)"><input type="number" className="input" value={emp.ivaGeneral} onChange={(e) => setEmp({ ...emp, ivaGeneral: Number(e.target.value) })} /></Field>
              <Field label="IVA reducido (%)"><input type="number" className="input" value={emp.ivaReducido} onChange={(e) => setEmp({ ...emp, ivaReducido: Number(e.target.value) })} /></Field>
            </div>
            <button className="btn-primary mt-4" onClick={() => { s.setEmpresa(emp); s.toast('Datos de la empresa actualizados') }}>Guardar cambios</button>
          </div>
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Resumen del sistema</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Clientes</span><b>{s.clientes.length}</b></div>
                <div className="flex justify-between"><span className="text-slate-500">Proveedores</span><b>{s.proveedores.length}</b></div>
                <div className="flex justify-between"><span className="text-slate-500">Productos</span><b>{s.productos.length}</b></div>
                <div className="flex justify-between"><span className="text-slate-500">Facturas emitidas</span><b>{s.facturas.length}</b></div>
                <div className="flex justify-between"><span className="text-slate-500">Órdenes de compra</span><b>{s.ordenesCompra.length}</b></div>
                <div className="flex justify-between"><span className="text-slate-500">Asientos contables</span><b>{s.asientos.length}</b></div>
                <div className="flex justify-between"><span className="text-slate-500">Empleados</span><b>{s.empleados.length}</b></div>
                <div className="flex justify-between"><span className="text-slate-500">Movimientos de stock</span><b>{s.movimientosStock.length}</b></div>
              </div>
            </div>
            <Alert tipo="info">Esta es una versión de demostración: podés operar el sistema normalmente, pero nada se guarda. Al recargar la página (o con el botón de restaurar) todo vuelve al estado original.</Alert>
          </div>
        </div>
      )}

      {tab === 'usuarios' && (
        <div>
          <button className="btn-primary mb-4" onClick={() => setUserForm({ nombre: '', email: '', password: '', rol: 'ventas', activo: true })}><Plus size={16} /> Nuevo usuario</button>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Último acceso</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {s.usuarios.map((u) => (
                  <tr key={u.id}>
                    <td><div className="flex items-center gap-2"><Avatar name={u.nombre} size="sm" /><span className="font-medium">{u.nombre}</span></div></td>
                    <td className="text-slate-600">{u.email}</td>
                    <td><Badge color={u.rol === 'admin' ? 'purple' : 'blue'}>{u.rol}</Badge></td>
                    <td className="text-xs text-slate-500">{u.ultimoAcceso ? fmtDateTime(u.ultimoAcceso) : '—'}</td>
                    <td><Badge color={u.activo ? 'green' : 'gray'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                    <td><button className="btn-ghost btn-sm" onClick={() => setUserForm({ ...u })}><Pencil size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 card p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><Users size={15} className="text-brand-600" /> Permisos por rol</h3>
            <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
              {[
                { r: 'admin', d: 'Acceso total a todos los módulos, configuración y auditoría' },
                { r: 'ventas', d: 'POS, pedidos, presupuestos, facturación, clientes y CRM' },
                { r: 'compras', d: 'Órdenes de compra, proveedores e inventario' },
                { r: 'contabilidad', d: 'Facturación, compras, finanzas, contabilidad y reportes' },
                { r: 'almacen', d: 'Inventario, stock, movimientos y recepciones' },
                { r: 'rrhh', d: 'Empleados, asistencia, vacaciones y liquidación de sueldos' },
              ].map((x) => (
                <div key={x.r} className="rounded-lg border border-slate-200 p-2.5">
                  <Badge color={x.r === 'admin' ? 'purple' : 'blue'}>{x.r}</Badge>
                  <p className="mt-1 text-slate-600">{x.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'sucursales' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><MapPin size={15} className="text-brand-600" /> Sucursales</h3><button className="btn-secondary btn-sm" onClick={() => setSucForm({ nombre: '', direccion: '', ciudad: '', telefono: '', activa: true })}><Plus size={13} /> Agregar</button></div>
            {s.sucursales.map((x) => (
              <div key={x.id} className="mb-2 flex items-start justify-between rounded-lg border border-slate-200 p-3">
                <div><div className="font-medium text-slate-800">{x.nombre}</div><div className="text-xs text-slate-500">{x.direccion}, {x.ciudad}</div><div className="text-xs text-slate-500">{x.telefono}</div></div>
                <div className="flex items-center gap-1"><Badge color={x.activa ? 'green' : 'gray'}>{x.activa ? 'Activa' : 'Inactiva'}</Badge><button className="btn-ghost btn-sm" onClick={() => setSucForm({ ...x })}><Pencil size={13} /></button></div>
              </div>
            ))}
          </div>
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Depósitos</h3>
            {s.depositos.map((d) => (
              <div key={d.id} className="mb-2 rounded-lg border border-slate-200 p-3">
                <div className="font-medium text-slate-800">{d.nombre}</div>
                <div className="text-xs text-slate-500">{d.direccion}</div>
                <div className="text-xs text-slate-400">Sucursal: {s.sucursales.find((x) => x.id === d.sucursalId)?.nombre}</div>
                <div className="mt-1 text-xs text-slate-600">{s.productos.filter((p) => (p.stockPorDeposito[d.id] ?? 0) > 0).length} productos con existencia</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'catalogo' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Tag size={15} className="text-brand-600" /> Categorías</h3><button className="btn-secondary btn-sm" onClick={() => setCatForm({ nombre: '', color: '#3f5ff5', descripcion: '' })}><Plus size={13} /> Agregar</button></div>
            {s.categorias.map((c) => (
              <div key={c.id} className="mb-2 flex items-center justify-between rounded-lg border border-slate-200 p-2.5">
                <div className="flex items-center gap-2"><span className="h-4 w-4 rounded" style={{ background: c.color }} /><div><div className="text-sm font-medium">{c.nombre}</div><div className="text-xs text-slate-500">{c.descripcion}</div></div></div>
                <div className="flex items-center gap-2"><span className="text-xs text-slate-400">{s.productos.filter((p) => p.categoriaId === c.id).length} prod.</span><button className="btn-ghost btn-sm" onClick={() => setCatForm({ ...c })}><Pencil size={13} /></button></div>
              </div>
            ))}
          </div>
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Marcas</h3>
            <div className="flex flex-wrap gap-2">
              {s.marcas.map((m) => <span key={m.id} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">{m.nombre} <span className="text-xs text-slate-400">({s.productos.filter((p) => p.marcaId === m.id).length})</span></span>)}
            </div>
            <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-800">Departamentos y cargos</h3>
            {s.departamentos.map((d) => (
              <div key={d.id} className="mb-2 rounded-lg border border-slate-200 p-2.5">
                <div className="text-sm font-medium">{d.nombre}</div>
                <div className="mt-1 flex flex-wrap gap-1">{s.cargos.filter((c) => c.departamentoId === d.id).map((c) => <span key={c.id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{c.nombre} · {fmtMoney(c.salarioBase, sim)}</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'cuentas' && (
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Wallet size={15} className="text-brand-600" /> Cuentas de caja, bancos y billeteras</h3><button className="btn-secondary btn-sm" onClick={() => setCtaForm({ nombre: '', tipo: 'banco', moneda: 'PYG', saldoInicial: 0, activa: true })}><Plus size={13} /> Agregar</button></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Cuenta</th><th>Tipo</th><th>Banco</th><th>Número</th><th className="text-right">Saldo inicial</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {s.cuentasFinancieras.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.nombre}</td><td className="capitalize">{c.tipo}</td><td>{c.banco ?? '—'}</td><td className="font-mono text-xs">{c.numero ?? '—'}</td>
                    <td className="num">{fmtMoney(c.saldoInicial, sim)}</td>
                    <td><Badge color={c.activa ? 'green' : 'gray'}>{c.activa ? 'Activa' : 'Inactiva'}</Badge></td>
                    <td><button className="btn-ghost btn-sm" onClick={() => setCtaForm({ ...c })}><Pencil size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'auditoria' && (
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><ScrollText size={15} className="text-brand-600" /> Registro de actividad del sistema</div>
          <DataTable rows={s.log} pageSize={25} exportName="auditoria" searchKeys={(r) => `${s.usuarios.find((u) => u.id === r.usuarioId)?.nombre ?? ''} ${r.modulo} ${r.accion} ${r.detalle}`}
            columns={[
              { key: 'fecha', header: 'Fecha', render: (r) => fmtDateTime(r.fecha), value: (r) => r.fecha, sortable: true },
              { key: 'usuario', header: 'Usuario', render: (r) => { const u = s.usuarios.find((x) => x.id === r.usuarioId); return <div className="flex items-center gap-2"><Avatar name={u?.nombre ?? '?'} size="sm" /><span>{u?.nombre}</span></div> } },
              { key: 'modulo', header: 'Módulo', render: (r) => <Badge color="blue">{r.modulo}</Badge> },
              { key: 'accion', header: 'Acción' },
              { key: 'detalle', header: 'Detalle', render: (r) => <span className="text-xs text-slate-500">{r.detalle}</span> },
            ]} />
        </div>
      )}

      <Modal open={!!userForm} onClose={() => setUserForm(null)} title={userForm?.id ? 'Editar usuario' : 'Nuevo usuario'} size="sm"
        footer={<><button className="btn-secondary" onClick={() => setUserForm(null)}>Cancelar</button><button className="btn-primary" onClick={() => { if (!userForm?.nombre) return; if (userForm.id) { const { id, ...rest } = userForm; s.update('usuarios', id, rest) } else s.add('usuarios', { ...userForm, id: uid('u') } as Usuario); s.toast('Usuario guardado'); setUserForm(null) }}>Guardar</button></>}>
        {userForm && (
          <div className="grid gap-3">
            <Field label="Nombre"><input className="input" value={userForm.nombre ?? ''} onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })} /></Field>
            <Field label="Email"><input className="input" value={userForm.email ?? ''} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></Field>
            <Field label="Contraseña"><input className="input" value={userForm.password ?? ''} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /></Field>
            <Field label="Rol"><Select value={userForm.rol ?? 'ventas'} onChange={(v) => setUserForm({ ...userForm, rol: v as Rol })} options={['admin', 'ventas', 'compras', 'contabilidad', 'almacen', 'rrhh'].map((r) => ({ value: r, label: r }))} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={userForm.activo ?? true} onChange={(e) => setUserForm({ ...userForm, activo: e.target.checked })} /> Usuario activo</label>
          </div>
        )}
      </Modal>

      <Modal open={!!sucForm} onClose={() => setSucForm(null)} title={sucForm?.id ? 'Editar sucursal' : 'Nueva sucursal'} size="sm"
        footer={<><button className="btn-secondary" onClick={() => setSucForm(null)}>Cancelar</button><button className="btn-primary" onClick={() => { if (!sucForm?.nombre) return; if (sucForm.id) { const { id, ...rest } = sucForm; s.update('sucursales', id, rest) } else s.add('sucursales', { ...sucForm, id: uid('s') } as Sucursal); s.toast('Sucursal guardada'); setSucForm(null) }}>Guardar</button></>}>
        {sucForm && (
          <div className="grid gap-3">
            <Field label="Nombre"><input className="input" value={sucForm.nombre ?? ''} onChange={(e) => setSucForm({ ...sucForm, nombre: e.target.value })} /></Field>
            <Field label="Dirección"><input className="input" value={sucForm.direccion ?? ''} onChange={(e) => setSucForm({ ...sucForm, direccion: e.target.value })} /></Field>
            <Field label="Ciudad"><input className="input" value={sucForm.ciudad ?? ''} onChange={(e) => setSucForm({ ...sucForm, ciudad: e.target.value })} /></Field>
            <Field label="Teléfono"><input className="input" value={sucForm.telefono ?? ''} onChange={(e) => setSucForm({ ...sucForm, telefono: e.target.value })} /></Field>
          </div>
        )}
      </Modal>

      <Modal open={!!catForm} onClose={() => setCatForm(null)} title={catForm?.id ? 'Editar categoría' : 'Nueva categoría'} size="sm"
        footer={<><button className="btn-secondary" onClick={() => setCatForm(null)}>Cancelar</button><button className="btn-primary" onClick={() => { if (!catForm?.nombre) return; if (catForm.id) { const { id, ...rest } = catForm; s.update('categorias', id, rest) } else s.add('categorias', { ...catForm, id: uid('c') } as Categoria); s.toast('Categoría guardada'); setCatForm(null) }}>Guardar</button></>}>
        {catForm && (
          <div className="grid gap-3">
            <Field label="Nombre"><input className="input" value={catForm.nombre ?? ''} onChange={(e) => setCatForm({ ...catForm, nombre: e.target.value })} /></Field>
            <Field label="Descripción"><input className="input" value={catForm.descripcion ?? ''} onChange={(e) => setCatForm({ ...catForm, descripcion: e.target.value })} /></Field>
            <Field label="Color"><input type="color" className="input h-10" value={catForm.color ?? '#3f5ff5'} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })} /></Field>
          </div>
        )}
      </Modal>

      <Modal open={!!ctaForm} onClose={() => setCtaForm(null)} title={ctaForm?.id ? 'Editar cuenta' : 'Nueva cuenta'} size="sm"
        footer={<><button className="btn-secondary" onClick={() => setCtaForm(null)}>Cancelar</button><button className="btn-primary" onClick={() => { if (!ctaForm?.nombre) return; if (ctaForm.id) { const { id, ...rest } = ctaForm; s.update('cuentasFinancieras', id, rest) } else s.add('cuentasFinancieras', { ...ctaForm, id: uid('cf') } as CuentaFinanciera); s.toast('Cuenta guardada'); setCtaForm(null) }}>Guardar</button></>}>
        {ctaForm && (
          <div className="grid gap-3">
            <Field label="Nombre"><input className="input" value={ctaForm.nombre ?? ''} onChange={(e) => setCtaForm({ ...ctaForm, nombre: e.target.value })} /></Field>
            <Field label="Tipo"><Select value={ctaForm.tipo ?? 'banco'} onChange={(v) => setCtaForm({ ...ctaForm, tipo: v as CuentaFinanciera['tipo'] })} options={[{ value: 'caja', label: 'Caja' }, { value: 'banco', label: 'Banco' }, { value: 'billetera', label: 'Billetera electrónica' }]} /></Field>
            <Field label="Banco"><input className="input" value={ctaForm.banco ?? ''} onChange={(e) => setCtaForm({ ...ctaForm, banco: e.target.value })} /></Field>
            <Field label="Número de cuenta"><input className="input" value={ctaForm.numero ?? ''} onChange={(e) => setCtaForm({ ...ctaForm, numero: e.target.value })} /></Field>
            <Field label="Saldo inicial"><input type="number" className="input" value={ctaForm.saldoInicial ?? 0} onChange={(e) => setCtaForm({ ...ctaForm, saldoInicial: Number(e.target.value) })} /></Field>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={reset} onClose={() => setReset(false)} onConfirm={() => { s.resetData(); s.toast('Datos de demostración restaurados') }} title="Restaurar datos de demostración" message="Se descartarán todos los cambios realizados y el sistema volverá al conjunto de datos original. Esta acción no se puede deshacer." danger />
      <span className="hidden">{fmtDate(s.empresa.vencimientoTimbrado)}</span>
    </div>
  )
}
