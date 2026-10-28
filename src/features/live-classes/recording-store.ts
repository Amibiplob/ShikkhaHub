/** Private, origin-local recovery journal. Never contains a public storage URL. */
export interface RecordingDraft {
  id: string;
  userId: string;
  classId: string;
  title: string;
  mime: string;
  createdAt: number;
  duration: number;
  complete: boolean;
}
const database = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("shikkhahub-recordings", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("drafts", { keyPath: "id" });
      request.result.createObjectStore("chunks", { keyPath: ["id", "index"] });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
async function transact<T>(
  stores: string[],
  mode: IDBTransactionMode,
  action: (tx: IDBTransaction) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      const request = action(tx);
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error || request.error);
      tx.onabort = () =>
        reject(tx.error || new Error("Recording storage was interrupted"));
    });
  } finally {
    db.close();
  }
}
export const saveDraft = (draft: RecordingDraft) =>
  transact(["drafts"], "readwrite", (tx) =>
    tx.objectStore("drafts").put(draft),
  );
export const saveChunk = (id: string, index: number, blob: Blob) =>
  transact(["chunks"], "readwrite", (tx) =>
    tx.objectStore("chunks").put({ id, index, blob }),
  );
export async function recordingDrafts(userId: string, classId: string) {
  const drafts = await transact<RecordingDraft[]>(
    ["drafts"],
    "readonly",
    (tx) => tx.objectStore("drafts").getAll(),
  );
  return drafts
    .filter((d) => d.userId === userId && d.classId === classId)
    .sort((a, b) => b.createdAt - a.createdAt);
}
export async function recordingBlob(draft: RecordingDraft) {
  const chunks = await transact<{ blob: Blob }[]>(
    ["chunks"],
    "readonly",
    (tx) =>
      tx
        .objectStore("chunks")
        .getAll(
          IDBKeyRange.bound([draft.id, 0], [draft.id, Number.MAX_SAFE_INTEGER]),
        ),
  );
  return new Blob(
    chunks.map((c) => c.blob),
    { type: draft.mime },
  );
}
export async function deleteDraft(id: string) {
  return transact(["drafts", "chunks"], "readwrite", (tx) => {
    tx.objectStore("chunks").delete(
      IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]),
    );
    return tx.objectStore("drafts").delete(id);
  });
}
