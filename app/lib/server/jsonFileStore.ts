import { readFile, rename, stat, unlink, writeFile } from "node:fs/promises";

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
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random()
      .toString(36)
      .slice(2, 8)}.tmp`;

    await writeFile(tempPath, serialized, "utf-8");
    try {
      await rename(tempPath, filePath);
    } catch (error) {
      await unlink(tempPath).catch(() => {
        // Ignore cleanup failure.
      });
      throw error;
    }

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
