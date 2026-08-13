// IndexedDB genérico — persistencia local de boletas.
// store 'borrador': la boleta en curso (autoguardado, una sola a la vez).
// store 'cola'    : boletas terminadas, pendientes de sincronizar o ya enviadas.
const DB_NAME = 'transitoCanelonesDB'
const DB_VERSION = 1

let _db = null
function idb() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db)
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const d = req.result
      if (!d.objectStoreNames.contains('borrador')) d.createObjectStore('borrador')
      if (!d.objectStoreNames.contains('cola')) d.createObjectStore('cola', { keyPath: 'uuid' })
    }
    req.onsuccess = () => { _db = req.result; resolve(_db) }
    req.onerror = () => reject(req.error)
  })
}

export function idbPut(store, val, key) {
  return idb().then((d) => new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readwrite')
    if (key !== undefined) tx.objectStore(store).put(val, key)
    else tx.objectStore(store).put(val)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  }))
}

export function idbGet(store, key) {
  return idb().then((d) => new Promise((resolve, reject) => {
    const r = d.transaction(store).objectStore(store).get(key)
    r.onsuccess = () => resolve(r.result || null)
    r.onerror = () => reject(r.error)
  }))
}

export function idbAll(store) {
  return idb().then((d) => new Promise((resolve, reject) => {
    const r = d.transaction(store).objectStore(store).getAll()
    r.onsuccess = () => resolve(r.result || [])
    r.onerror = () => reject(r.error)
  }))
}

export function idbDel(store, key) {
  return idb().then((d) => new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readwrite')
    tx.objectStore(store).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  }))
}
