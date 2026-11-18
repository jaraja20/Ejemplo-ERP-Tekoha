import { useMemo, useState } from 'react'
import { ArrowLeftRight, SlidersHorizontal } from 'lucide-react'
import { useERP, selectores } from '@/store/erp'
import type { Producto } from '@/types'
import { PageHeader, DataTable, StatCard, Modal, Field, Select, Badge, type Column } from '@/components/ui'
import { fmtMoneyCompact, fmtMoney, fmtNum, sumBy, today } from '@/lib/utils'

export default function Stock() {
  const s = useERP()
  const sim = s.empresa.simbolo
  const [transfer, setTransfer] = useState(false)
  const [ajuste, setAjuste] = useState(false)
  const [tForm, setTForm] = useState({ productoId: '', origen: 'd01', destino: 'd02', cantidad: 1 })
  const [aForm, setAForm] = useState({ productoId: '', depositoId: 'd01', cantidad: 0, motivo: 'Inventario físico' })

  const totalesDep = useMemo(() => s.depositos.map((d) => ({
    dep: d,
    unidades: sumBy(s.productos, (p) => p.stockPorDeposito[d.id] ?? 0),
    valor: sumBy(s.productos, (p) => (p.stockPorDeposito[d.id] ?? 0) * p.costo),
    bajos: s.productos.filter((p) => p.activo && (p.stockPorDeposito[d.id] ?? 0) < p.stockMinimo).length,
  })), [s.depositos, s.productos])

  const columns: Column<Producto>[] = [
    { key: 'codigo', header: 'Código', render: (r) => <span className="font-mono text-xs">{r.codigo}</span>, value: (r) => r.codigo, sortable: true },
    { key: 'nombre', header: 'Producto', value: (r) => r.nombre, sortable: true },
    { key: 'minimo', header: 'Mínimo', render: (r) => <span className="text-xs text-slate-500">{r.stockMinimo}</span>, align: 'right' },
    ...s.depositos.map((d): Column<Producto> => ({
      key: d.id, header: d.nombre.replace('Depósito ', ''), align: 'right',
      render: (r) => { const v = r.stockPorDeposito[d.id] ?? 0; return <span className={v < r.stockMinimo ? 'font-bold text-rose-600' : v < r.stockMinimo * 1.5 ? 'text-amber-600' : ''}>{fmtNum(v)}</span> },
      value: (r) => r.stockPorDeposito[d.id] ?? 0, sortable: true,
    })),
    { key: 'total', header: 'Total', render: (r) => <span className="font-semibold">{fmtNum(selectores.stockTotal(r))}</span>, value: (r) => selectores.stockTotal(r), sortable: true, align: 'right' },
    { key: 'valor', header: 'Valor (costo)', render: (r) => fmtMoney(selectores.stockTotal(r) * r.costo, sim), value: (r) => selectores.stockTotal(r) * r.costo, sortable: true, align: 'right' },
    { key: 'estado', header: 'Estado', render: (r) => { const t = selectores.stockTotal(r); return t === 0 ? <Badge color="red">Sin stock</Badge> : r.stockPorDeposito.d01 < r.stockMinimo ? <Badge color="yellow">Reponer</Badge> : <Badge color="green">OK</Badge> } },
  ]

  return (
    <div>
      <PageHeader title="Stock por depósito" subtitle="Existencias en los 3 depósitos con transferencias y ajustes" actions={<><button className="btn-secondary" onClick={() => setAjuste(true)}><SlidersHorizontal size={16} /> Ajustar stock</button><button className="btn-primary" onClick={() => setTransfer(true)}><ArrowLeftRight size={16} /> Transferir</button></>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {totalesDep.map((t) => (
          <StatCard key={t.dep.id} label={t.dep.nombre} value={fmtMoneyCompact(t.valor, sim)} hint={`${fmtNum(t.unidades)} unidades · ${t.bajos} bajo mínimo`} tone={t.bajos > 8 ? 'red' : 'blue'} />
        ))}
      </div>
      <DataTable rows={s.productos.filter((p) => p.activo)} columns={columns} searchKeys={(r) => `${r.codigo} ${r.nombre}`} exportName="stock" pageSize={20} />

      <Modal open={transfer} onClose={() => setTransfer(false)} title="Transferencia entre depósitos" size="sm"
        footer={<><button className="btn-secondary" onClick={() => setTransfer(false)}>Cancelar</button><button className="btn-primary" disabled={!tForm.productoId || tForm.origen === tForm.destino} onClick={() => { s.registrarMovimientoStock({ fecha: today(), productoId: tForm.productoId, depositoId: tForm.origen, depositoDestinoId: tForm.destino, tipo: 'transferencia', cantidad: tForm.cantidad, motivo: 'Transferencia entre depósitos' }); setTransfer(false) }}>Confirmar</button></>}>
        <div className="grid gap-3">
          <Field label="Producto"><Select value={tForm.productoId} onChange={(v) => setTForm({ ...tForm, productoId: v })} placeholder="Seleccionar..." options={s.productos.filter((p) => p.activo).map((p) => ({ value: p.id, label: `${p.codigo} — ${p.nombre}` }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde"><Select value={tForm.origen} onChange={(v) => setTForm({ ...tForm, origen: v })} options={s.depositos.map((d) => ({ value: d.id, label: d.nombre }))} /></Field>
            <Field label="Hacia"><Select value={tForm.destino} onChange={(v) => setTForm({ ...tForm, destino: v })} options={s.depositos.map((d) => ({ value: d.id, label: d.nombre }))} /></Field>
          </div>
          <Field label="Cantidad" hint={tForm.productoId ? `Disponible en origen: ${s.productos.find((p) => p.id === tForm.productoId)?.stockPorDeposito[tForm.origen] ?? 0}` : ''}><input type="number" min={1} className="input" value={tForm.cantidad} onChange={(e) => setTForm({ ...tForm, cantidad: Number(e.target.value) })} /></Field>
        </div>
      </Modal>

      <Modal open={ajuste} onClose={() => setAjuste(false)} title="Ajuste de inventario" size="sm"
        footer={<><button className="btn-secondary" onClick={() => setAjuste(false)}>Cancelar</button><button className="btn-primary" disabled={!aForm.productoId || !aForm.cantidad} onClick={() => { s.registrarMovimientoStock({ fecha: today(), productoId: aForm.productoId, depositoId: aForm.depositoId, tipo: 'ajuste', cantidad: aForm.cantidad, motivo: aForm.motivo }); setAjuste(false) }}>Confirmar ajuste</button></>}>
        <div className="grid gap-3">
          <Field label="Producto"><Select value={aForm.productoId} onChange={(v) => setAForm({ ...aForm, productoId: v })} placeholder="Seleccionar..." options={s.productos.filter((p) => p.activo).map((p) => ({ value: p.id, label: `${p.codigo} — ${p.nombre}` }))} /></Field>
          <Field label="Depósito"><Select value={aForm.depositoId} onChange={(v) => setAForm({ ...aForm, depositoId: v })} options={s.depositos.map((d) => ({ value: d.id, label: d.nombre }))} /></Field>
          <Field label="Cantidad (positiva suma, negativa resta)" hint={aForm.productoId ? `Stock actual: ${s.productos.find((p) => p.id === aForm.productoId)?.stockPorDeposito[aForm.depositoId] ?? 0}` : ''}><input type="number" className="input" value={aForm.cantidad} onChange={(e) => setAForm({ ...aForm, cantidad: Number(e.target.value) })} /></Field>
          <Field label="Motivo"><Select value={aForm.motivo} onChange={(v) => setAForm({ ...aForm, motivo: v })} options={['Inventario físico', 'Rotura', 'Vencimiento', 'Merma', 'Robo / faltante', 'Corrección de carga'].map((m) => ({ value: m, label: m }))} /></Field>
        </div>
      </Modal>
    </div>
  )
}
