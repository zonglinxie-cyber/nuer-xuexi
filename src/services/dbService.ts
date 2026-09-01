import type { StudyRecord, UserRewardStats, WrongQuestion } from '../types'

const DB_NAME = 'grade4_math_db'
const DB_VERSION = 1

export const STORES = {
  RECORDS: 'records',
  WRONG: 'wrong_questions',
  REWARDS: 'rewards',
} as const

let dbPromise: Promise<IDBDatabase> | null = null

function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.indexedDB)
}

function openDatabase(): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error('当前浏览器环境不支持 IndexedDB'))
  }

  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

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
      resolve(request.result)
    }

    request.onerror = () => {
      dbPromise = null
      reject(request.error || new Error('打开 IndexedDB 数据库失败'))
    }
  })

  return dbPromise
}

export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result as T[])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function putToStore<T>(storeName: string, item: T): Promise<void> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const req = store.put(item)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    if (isIndexedDbAvailable()) {
      console.error(`[IndexedDB] putToStore ${storeName} error:`, err)
    }
  }
}

export async function bulkPutToStore<T>(storeName: string, items: T[]): Promise<void> {
  if (!items.length) return
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      items.forEach((item) => store.put(item))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    if (isIndexedDbAvailable()) {
      console.error(`[IndexedDB] bulkPutToStore ${storeName} error:`, err)
    }
  }
}

export async function deleteFromStore(storeName: string, id: string): Promise<void> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    if (isIndexedDbAvailable()) {
      console.error(`[IndexedDB] deleteFromStore ${storeName} error:`, err)
    }
  }
}

export async function clearStore(storeName: string): Promise<void> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const req = store.clear()
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    if (isIndexedDbAvailable()) {
      console.error(`[IndexedDB] clearStore ${storeName} error:`, err)
    }
  }
}

export async function getRewardStatsFromDB(): Promise<UserRewardStats | null> {
  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.REWARDS, 'readonly')
      const store = tx.objectStore(STORES.REWARDS)
      const req = store.get('user_reward_stats')
      req.onsuccess = () => {
        if (req.result && typeof req.result === 'object' && 'stats' in req.result) {
          resolve(req.result.stats as UserRewardStats)
        } else {
          resolve(null)
        }
      }
      req.onerror = () => resolve(null)
    })
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
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
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
    const wrongStr = JSON.stringify(wrong)
    const recStr = JSON.stringify(records)
    bytes = new Blob([wrongStr + recStr]).size
  }

  return {
    recordsCount: records.length,
    wrongCount: wrong.length,
    imagesCount: images.length,
    estimatedBytes: bytes,
  }
}
