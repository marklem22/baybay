import { readFile, stat, writeFile } from "node:fs/promises";

interface JsonCacheEntry {
  mtimeMs: number;
  size: number;
  data: unknown;
}

const jsonCache = new Map<string, JsonCacheEntry>();
const writeQueue = new Map<string, Promise<void>>();

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const fileStat = await stat(filePath);
  const cached = jsonCache.get(filePath);

  if (cached && cached.mtimeMs === fileStat.mtimeMs && cached.size === fileStat.size) {
    return cached.data as T;
  }

  const raw = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw) as T;

  jsonCache.set(filePath, {
    mtimeMs: fileStat.mtimeMs,
    size: fileStat.size,
    data: parsed,
  });

  return parsed;
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  const prev = writeQueue.get(filePath) ?? Promise.resolve();

  const nextWrite = prev.then(async () => {
    const serialized = `${JSON.stringify(data, null, 2)}\n`;
    await writeFile(filePath, serialized, "utf-8");
    const fileStat = await stat(filePath);
    jsonCache.set(filePath, {
      mtimeMs: fileStat.mtimeMs,
      size: fileStat.size,
      data,
    });
  });

  writeQueue.set(
    filePath,
    nextWrite.catch(() => {
      // Keep the queue chain alive after a rejected write.
    }),
  );

  await nextWrite;
}

export function invalidateJsonCache(filePath: string): void {
  jsonCache.delete(filePath);
}
