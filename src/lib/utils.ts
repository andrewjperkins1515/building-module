import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let counter = 0;
/** Stable-format internal ID: prefix + time + counter + random. */
export function uid(prefix: string) {
  counter = (counter + 1) % 1296;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36).padStart(2, "0")}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function todayIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Returns a YYYY-MM-DD date offset by `days` from today. */
export function offsetDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Returns an ISO timestamp offset by `days` (fractional allowed) from now. */
export function offsetTimestamp(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

/** Deterministic PRNG (mulberry32) for mock data generation. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function sum(ns: number[]) {
  return ns.reduce((a, b) => a + b, 0);
}
