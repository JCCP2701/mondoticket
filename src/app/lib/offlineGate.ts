import { openDB, type IDBPDatabase } from 'idb';

export interface ManifestEntry {
    ticketId: string;
    eventId: string;
    status: 'valid' | 'used' | 'cancelled';
    ticketTypeName: string | null;
    seatLabel: string | null;
    holderName: string | null;
    allowStaticQr: boolean;
    qrHash: string | null;
}

export interface PendingScan {
    clientScanId: string;
    eventId: string;
    qrCode: string;
    ticketId: string | null;
    deviceId: string;
    scannedAt: string;
    localResult: 'ok' | 'already_used' | 'cancelled' | 'not_found';
    synced: boolean;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
    if (!dbPromise) {
        dbPromise = openDB('tb-gate', 1, {
            upgrade(db) {
                const manifestStore = db.createObjectStore('manifest', { keyPath: 'ticketId' });
                manifestStore.createIndex('eventId', 'eventId');
                const scansStore = db.createObjectStore('pendingScans', { keyPath: 'clientScanId' });
                scansStore.createIndex('eventId', 'eventId');
            },
        });
    }
    return dbPromise;
}

export async function saveManifest(eventId: string, entries: ManifestEntry[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('manifest', 'readwrite');
    const idx = tx.store.index('eventId');
    for await (const cursor of idx.iterate(eventId)) {
        await cursor.delete();
    }
    for (const e of entries) await tx.store.put(e);
    await tx.done;
}

export async function getManifestEntry(ticketId: string): Promise<ManifestEntry | undefined> {
    const db = await getDb();
    return db.get('manifest', ticketId);
}

export async function findManifestEntryByHash(eventId: string, qrHash: string): Promise<ManifestEntry | undefined> {
    const db = await getDb();
    const all: ManifestEntry[] = await db.getAllFromIndex('manifest', 'eventId', eventId);
    return all.find((e) => e.allowStaticQr && e.qrHash === qrHash);
}

export async function markLocalUsed(ticketId: string): Promise<void> {
    const db = await getDb();
    const entry: ManifestEntry | undefined = await db.get('manifest', ticketId);
    if (entry) {
        entry.status = 'used';
        await db.put('manifest', entry);
    }
}

export async function queueScan(scan: PendingScan): Promise<void> {
    const db = await getDb();
    await db.put('pendingScans', scan);
}

export async function getPendingScans(eventId: string): Promise<PendingScan[]> {
    const db = await getDb();
    const all: PendingScan[] = await db.getAllFromIndex('pendingScans', 'eventId', eventId);
    return all.filter((s) => !s.synced);
}

export async function markScansSynced(clientScanIds: string[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('pendingScans', 'readwrite');
    for (const id of clientScanIds) {
        const s: PendingScan | undefined = await tx.store.get(id);
        if (s) {
            s.synced = true;
            await tx.store.put(s);
        }
    }
    await tx.done;
}
