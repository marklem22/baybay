import { resolve } from "node:path";
import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "../../lib/server/jsonFileStore";

const SETTINGS_PATH = resolve(process.cwd(), "app/lib/settings.json");

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  accentBlue: string;
  accentPurple: string;
  accentCyan: string;
  success: string;
  warning: string;
  danger: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  isBuiltIn: boolean;
  colors: ThemeColors;
  font: string;
}

export interface ThemeSettings {
  activePreset: string;
  presets: ThemePreset[];
}

function isValidHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function isValidColors(obj: unknown): obj is ThemeColors {
  if (!obj || typeof obj !== "object") return false;
  const c = obj as Record<string, unknown>;
  const keys: (keyof ThemeColors)[] = [
    "bgPrimary", "bgSecondary", "bgCard",
    "accentBlue", "accentPurple", "accentCyan",
    "success", "warning", "danger",
    "textPrimary", "textSecondary", "textMuted",
  ];
  return keys.every((k) => isValidHex(c[k]));
}

function isValidPreset(obj: unknown): obj is ThemePreset {
  if (!obj || typeof obj !== "object") return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.isBuiltIn === "boolean" &&
    typeof p.font === "string" &&
    isValidColors(p.colors)
  );
}

export async function GET() {
  try {
    const settings = await readJsonFile<ThemeSettings>(SETTINGS_PATH);
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "Failed to read settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Partial<ThemeSettings>;
    const current = await readJsonFile<ThemeSettings>(SETTINGS_PATH);

    if (body.activePreset !== undefined) {
      if (typeof body.activePreset !== "string") {
        return NextResponse.json({ error: "activePreset must be a string" }, { status: 400 });
      }
      current.activePreset = body.activePreset;
    }

    if (body.presets !== undefined) {
      if (!Array.isArray(body.presets) || !body.presets.every(isValidPreset)) {
        return NextResponse.json({ error: "Invalid presets data" }, { status: 400 });
      }
      current.presets = body.presets;
    }

    await writeJsonFile(SETTINGS_PATH, current);
    return NextResponse.json(current);
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
