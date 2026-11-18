import { clsx, type ClassValue } from 'clsx'
import { format, parseISO, differenceInDays, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import type { LineaDocumento } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

let counter = 0
export function uid(prefix = 'id'): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function fmtMoney(n: number, simbolo = '₲'): string {
  const rounded = Math.round(n)
  return `${simbolo} ${rounded.toLocaleString('es-PY')}`
}

/**
 * Importe abreviado para tarjetas de indicadores. En guaraníes las cifras tienen
 * muchos dígitos y se cortaban dentro de las tarjetas: a partir del millón se
 * muestra en millones (M) y a partir de mil millones con un decimal.
 */
export function fmtMoneyCompact(n: number, simbolo = '₲'): string {
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${simbolo} ${(n / 1e6).toLocaleString('es-PY', { maximumFractionDigits: 0 })} M`
  if (abs >= 1e6) return `${simbolo} ${(n / 1e6).toLocaleString('es-PY', { maximumFractionDigits: 1 })} M`
  return fmtMoney(n, simbolo)
}

export function fmtNum(n: number, dec = 0): string {
  return n.toLocaleString('es-PY', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

export function fmtDate(iso: string | undefined, pattern = 'dd/MM/yyyy'): string {
  if (!iso) return '—'
  const d = parseISO(iso)
  if (!isValid(d)) return iso
  return format(d, pattern, { locale: es })
}

export function fmtDateTime(iso: string): string {
  return fmtDate(iso, 'dd/MM/yyyy HH:mm')
}

/** Fecha de hoy en hora LOCAL. `toISOString()` usa UTC y en Paraguay (UTC-3) adelanta el día por la noche. */
export function today(): string {
  return isoLocal(new Date())
}

export function isoLocal(d: Date): string {
  const p2 = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return isoLocal(d)
}

export function daysBetween(a: string, b: string): number {
  return differenceInDays(parseISO(b), parseISO(a))
}

export function lineaSubtotal(l: LineaDocumento): number {
  return l.cantidad * l.precioUnitario * (1 - l.descuento / 100)
}

export function lineaIva(l: LineaDocumento): number {
  // Precios con IVA incluido (práctica habitual en Paraguay)
  const sub = lineaSubtotal(l)
  if (l.iva === 0) return 0
  return sub - sub / (1 + l.iva / 100)
}

export function totales(lineas: LineaDocumento[]) {
  const total = lineas.reduce((s, l) => s + lineaSubtotal(l), 0)
  const iva = lineas.reduce((s, l) => s + lineaIva(l), 0)
  const bruto = lineas.reduce((s, l) => s + l.cantidad * l.precioUnitario, 0)
  return { bruto, descuento: bruto - total, gravado: total - iva, iva, total }
}

export function initials(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function padNum(n: number, len = 7): string {
  return n.toString().padStart(len, '0')
}

export function nextNumero(existing: string[], prefix: string, len = 7): string {
  const nums = existing
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length).replace(/\D/g, ''), 10))
    .filter((n) => !Number.isNaN(n))
  const max = nums.length ? Math.max(...nums) : 0
  return `${prefix}${padNum(max + 1, len)}`
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.join(';'), ...rows.map((r) => headers.map((h) => escape(r[h])).join(';'))].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function groupBy<T>(arr: T[], key: (t: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item)
    ;(acc[k] ||= []).push(item)
    return acc
  }, {})
}

export function sumBy<T>(arr: T[], fn: (t: T) => number): number {
  return arr.reduce((s, x) => s + fn(x), 0)
}

export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function mesLabel(iso: string): string {
  const d = parseISO(iso)
  return `${MESES[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`
}

export function mesKey(iso: string): string {
  return iso.slice(0, 7)
}
