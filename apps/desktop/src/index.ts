/**
 * YULA Desktop - Main Entry Point
 *
 * Re-exports all Tauri API functions and types.
 */

export * from './tauri';

// Re-export Tauri plugins for convenience
export { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
export { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
export { readTextFile, writeTextFile, readDir, exists } from '@tauri-apps/plugin-fs';
export { open as openShell } from '@tauri-apps/plugin-shell';
