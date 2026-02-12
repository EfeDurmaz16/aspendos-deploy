/**
 * YULA Desktop - Tauri API Wrapper
 *
 * Type-safe wrappers for Tauri commands that can be used in the frontend.
 * These functions communicate with the Rust backend.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, emit } from '@tauri-apps/api/event';

// ==================== Types ====================

export interface SystemInfo {
  platform: string;
  arch: string;
  os_version: string;
  hostname: string;
}

export interface UpdateInfo {
  available: boolean;
  version: string | null;
  notes: string | null;
}

export type TrayAction =
  | 'new-chat'
  | 'council'
  | 'check-updates'
  | 'preferences';

// ==================== Notifications ====================

/**
 * Show a native system notification
 */
export async function showNotification(
  title: string,
  body: string,
  icon?: string
): Promise<void> {
  return invoke('show_notification', { title, body, icon });
}

/**
 * Set the notification badge count (dock/taskbar)
 */
export async function setBadgeCount(count: number): Promise<void> {
  return invoke('set_badge_count', { count });
}

/**
 * Clear the notification badge
 */
export async function clearBadge(): Promise<void> {
  return invoke('clear_badge');
}

// ==================== System Info ====================

/**
 * Get system information
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  return invoke('get_system_info');
}

/**
 * Get application version
 */
export async function getAppVersion(): Promise<string> {
  return invoke('get_app_version');
}

// ==================== Updates ====================

/**
 * Check for application updates
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  return invoke('check_for_updates');
}

/**
 * Install available update
 */
export async function installUpdate(): Promise<void> {
  return invoke('install_update');
}

// ==================== Autostart ====================

/**
 * Enable or disable autostart on system boot
 */
export async function setAutostart(enabled: boolean): Promise<void> {
  return invoke('set_autostart', { enabled });
}

/**
 * Check if autostart is enabled
 */
export async function getAutostartEnabled(): Promise<boolean> {
  return invoke('get_autostart_enabled');
}

// ==================== External Links ====================

/**
 * Open a URL in the default browser
 */
export async function openExternalLink(url: string): Promise<void> {
  return invoke('open_external_link', { url });
}

// ==================== Clipboard ====================

/**
 * Copy text to system clipboard
 */
export async function copyToClipboard(text: string): Promise<void> {
  return invoke('copy_to_clipboard', { text });
}

/**
 * Read text from system clipboard
 */
export async function readFromClipboard(): Promise<string> {
  return invoke('read_from_clipboard');
}

// ==================== Window Management ====================

/**
 * Minimize window to system tray
 */
export async function minimizeToTray(): Promise<void> {
  return invoke('minimize_to_tray');
}

/**
 * Quit the application
 */
export async function quitApp(): Promise<void> {
  return invoke('quit_app');
}

// ==================== Events ====================

/**
 * Listen for deep link events (yula:// protocol)
 */
export function onDeepLink(callback: (url: string) => void): () => void {
  let unlisten: (() => void) | null = null;

  listen<string>('deep-link', (event) => {
    callback(event.payload);
  }).then((fn) => {
    unlisten = fn;
  });

  return () => {
    if (unlisten) unlisten();
  };
}

/**
 * Listen for tray menu actions
 */
export function onTrayAction(callback: (action: TrayAction) => void): () => void {
  let unlisten: (() => void) | null = null;

  listen<TrayAction>('tray-action', (event) => {
    callback(event.payload);
  }).then((fn) => {
    unlisten = fn;
  });

  return () => {
    if (unlisten) unlisten();
  };
}

// ==================== Utility ====================

/**
 * Check if running in Tauri desktop environment
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Initialize desktop-specific features
 * Call this in your app's entry point when running in Tauri
 */
export async function initializeDesktop(): Promise<void> {
  if (!isTauri()) {
    console.warn('Not running in Tauri environment');
    return;
  }

  console.log('Initializing YULA Desktop...');

  // Get system info
  const sysInfo = await getSystemInfo();
  console.log('System:', sysInfo.platform, sysInfo.arch);

  // Get app version
  const version = await getAppVersion();
  console.log('YULA Desktop version:', version);

  // Setup tray action handler
  onTrayAction((action) => {
    console.log('Tray action:', action);
    // Dispatch custom event for app to handle
    window.dispatchEvent(new CustomEvent('yula-tray-action', { detail: action }));
  });

  // Setup deep link handler
  onDeepLink((url) => {
    console.log('Deep link:', url);
    // Dispatch custom event for app to handle
    window.dispatchEvent(new CustomEvent('yula-deep-link', { detail: url }));
  });

  console.log('YULA Desktop initialized');
}
