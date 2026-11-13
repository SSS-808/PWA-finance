// The phone's outbox in IndexedDB: entries waiting to be sent; log-out clears it
import type { OutboxEntry } from "../domain/outbox";

const DB_NAME = "wallet-outbox";
const DB_VERSION = 1;
const STORE = "entries";

let cached: Promise<IDBDatabase> | null = null;

function openOutbox(): Promise<IDBDatabase> {
  if (cached) return cached;
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available"));
  }
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        cached = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      cached = null;
      reject(request.error ?? new Error("Could not open the outbox"));
    };
  });
  cached = opening;
  return opening;
}

async function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openOutbox();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = work(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error ?? new Error("Outbox error"));
    tx.onabort = () => reject(tx.error ?? new Error("Outbox aborted"));
  });
}

export async function readOutbox(): Promise<OutboxEntry[]> {
  return run(
    "readonly",
    (store) => store.getAll() as IDBRequest<OutboxEntry[]>,
  );
}

export async function putOutboxEntry(entry: OutboxEntry): Promise<void> {
  await run("readwrite", (store) => store.put(entry));
}

export async function removeOutboxEntry(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id));
}

export async function clearOutbox(): Promise<void> {
  await run("readwrite", (store) => store.clear());
}
