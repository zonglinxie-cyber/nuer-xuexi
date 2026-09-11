import type { StudyRecord, UserRewardStats, WrongQuestion } from '../types'

const DB_NAME = 'grade4_math_db'
const DB_VERSION = 1

export const STORES = {
  RECORDS: 'records',
  WRONG: 'wrong_questions',
  REWARDS: 'rewards',
} as const

let dbPromise: Promise<IDBDatabase> | null = null

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

function resetDatabaseHandle(): void {
  dbPromise = null
}

function openDatabase(): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error('当前浏览器环境不支持 IndexedDB'))
  }

  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(STORES.RECORDS)) {
        db.createObjectStore(STORES.RECORDS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.WRONG)) {
        db.createObjectStore(STORES.WRONG, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.REWARDS)) {
        db.createObjectStore(STORES.REWARDS, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => {
      const db = request.result
      db.onclose = () => {
        resetDatabaseHandle()
      }
      db.onversionchange = () => {
        db.close()
        resetDatabaseHandle()
      }
      resolve(db)
    }

    request.onerror = () => {
      resetDatabaseHandle()
      reject(request.error || new Error('打开 IndexedDB 数据库失败'))
    }
  })

  return dbPromise
}

function runStoreRequest<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDatabase().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(storeName, mode)
        const store = tx.objectStore(storeName)
        let requestError: DOMException | null = null
        const request = run(store)
        if (request) {
          request.onerror = () => {
            requestError = request.error
          }
        }
        tx.oncomplete = () => resolve(request ? (request.result as T) : undefined)
        tx.onerror = () => reject(tx.error || requestError || new Error('IndexedDB 事务失败'))
        tx.onabort = () => reject(tx.error || requestError || new Error('IndexedDB 事务已中止'))
      }),
  )
}

export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  if (!isIndexedDbAvailable()) return []
  try {
    const rows = await runStoreRequest<T[]>(storeName, 'readonly', (store) => store.getAll())
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

export async function putToStore<T>(storeName: string, item: T): Promise<void> {
  if (!isIndexedDbAvailable()) return
  await runStoreRequest(storeName, 'readwrite', (store) => store.put(item))
}

export async function bulkPutToStore<T>(storeName: string, items: T[]): Promise<void> {
  if (!items.length || !isIndexedDbAvailable()) return
  await runStoreRequest(storeName, 'readwrite', (store) => {
    for (const item of items) {
      store.put(item)
    }
  })
}

export async function deleteFromStore(storeName: string, id: string): Promise<void> {
  if (!isIndexedDbAvailable()) return
  await runStoreRequest(storeName, 'readwrite', (store) => store.delete(id))
}

export async function clearStore(storeName: string): Promise<void> {
  if (!isIndexedDbAvailable()) return
  await runStoreRequest(storeName, 'readwrite', (store) => store.clear())
}

export async function getRewardStatsFromDB(): Promise<UserRewardStats | null> {
  if (!isIndexedDbAvailable()) return null
  try {
    const row = await runStoreRequest<{ key: string; stats?: UserRewardStats }>(
      STORES.REWARDS,
      'readonly',
      (store) => store.get('user_reward_stats'),
    )
    if (row && typeof row === 'object' && row.stats) {
      return row.stats
    }
    return null
  } catch {
    return null
  }
}

export async function saveRewardStatsToDB(stats: UserRewardStats): Promise<void> {
  await putToStore(STORES.REWARDS, { key: 'user_reward_stats', stats })
}

export async function getStorageStatsFromDB(): Promise<{
  recordsCount: number
  wrongCount: number
  imagesCount: number
  estimatedBytes: number
}> {
  const records = await getAllFromStore<StudyRecord>(STORES.RECORDS)
  const wrong = await getAllFromStore<WrongQuestion>(STORES.WRONG)
  const images = wrong.filter((item) => Boolean(item.imageDataUrl))

  let bytes = 0
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate()
      if (estimate.usage) {
        bytes = estimate.usage
      }
    } catch {
      // fallback to rough estimate
    }
  }

  if (!bytes) {
    bytes = new Blob([JSON.stringify(wrong) + JSON.stringify(records)]).size
  }

  return {
    recordsCount: records.length,
    wrongCount: wrong.length,
    imagesCount: images.length,
    estimatedBytes: bytes,
  }
}
