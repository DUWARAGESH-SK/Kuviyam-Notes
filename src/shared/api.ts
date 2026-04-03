/**
 * Cross-browser extension API abstraction.
 *
 * Firefox exposes `browser` (Promise-based, WebExtensions standard).
 * Chrome exposes `chrome` (callback-based, Manifest V3).
 *
 * This shim lets us write browser-agnostic code throughout the codebase.
 * Usage: import { api } from '@/shared/api';
 *        api.storage.local.get(...)
 */

declare const browser: typeof chrome | undefined;

export const api: typeof chrome =
  typeof browser !== 'undefined' ? (browser as typeof chrome) : chrome;
