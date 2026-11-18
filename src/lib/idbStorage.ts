import type { StateStorage } from 'zustand/middleware'

/**
 * Persistencia en IndexedDB.
 *
 * El conjunto de datos de demostración supera los 5 MB que admite localStorage,
 * así que se guarda en IndexedDB, que no tiene ese techo. La API es asíncrona,
 * por lo que zustand hidrata el estado después del primer render: mientras tanto
 * se muestra la pantalla de carga controlada por `useHydrated`.
 */

const DB_NAME = 'nanduti-erp-db'
const STORE = 'kv'
let dbPromise: Promise<IDBDatabase> | null = null

function abrir(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function tx<R>(modo: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<R>): Promise<R> {
  const db = await abrir()
  return new Promise<R>((resolve, reject) => {
    const t = db.transaction(STORE, modo)
    const req = fn(t.objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Modo demostración (por defecto): todo vive en memoria y al recargar vuelve al estado original.
 *  Para guardar en el navegador, compilar con VITE_PERSISTIR=true. */
export const DEMO_EFIMERA = import.meta.env.VITE_PERSISTIR !== 'true'

const memoria: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

const idbReal: StateStorage = {
  getItem: async (name) => {
    try {
      const v = await tx<string | undefined>('readonly', (s) => s.get(name) as IDBRequest<string | undefined>)
      return v ?? null
    } catch {
      return null
    }
  },
  setItem: async (name, value) => {
    try {
      await tx('readwrite', (s) => s.put(value, name) as IDBRequest<IDBValidKey>)
    } catch {
      /* si falla el guardado la app sigue funcionando en memoria */
    }
  },
  removeItem: async (name) => {
    try {
      await tx('readwrite', (s) => s.delete(name) as IDBRequest<undefined>)
    } catch {
      /* ignorado */
    }
  },
}

export const idbStorage: StateStorage = DEMO_EFIMERA ? memoria : idbReal
