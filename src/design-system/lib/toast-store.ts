"use client";

import { useSyncExternalStore } from "react";

export interface ToastEntry {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "error" | "success";
}

type Listener = () => void;

/**
 * A module level store, not React context, so `toast()` can be called from any event handler
 * (including one that isn't rendered under a provider, e.g. a top level error boundary) and every
 * mounted `Toaster` picks it up. One `Toaster` (in the root layout) renders what's in the store.
 */
let toasts: ToastEntry[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ToastEntry[] {
  return toasts;
}

const EMPTY_TOASTS: ToastEntry[] = [];

function getServerSnapshot(): ToastEntry[] {
  return EMPTY_TOASTS;
}

/** Queues a toast notification. Returns its id, usable with `dismissToast`. */
export function toast(entry: Omit<ToastEntry, "id">): string {
  const id = crypto.randomUUID();
  toasts = [...toasts, { ...entry, id }];
  emit();
  return id;
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((entry) => entry.id !== id);
  emit();
}

/** Subscribes a component (the `Toaster`) to the live toast queue. */
export function useToasts(): ToastEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
