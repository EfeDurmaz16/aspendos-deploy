//! YULA OS Desktop Application - Tauri 2.0 Backend
//!
//! This module provides native desktop functionality for the YULA OS application,
//! including system notifications, deep linking, tray integration, and auto-updates.

use tauri::{Emitter, Manager};

mod commands;
mod tray;

pub use commands::*;

/// Application state shared across all windows
#[derive(Debug, Default)]
pub struct AppState {
    pub notification_count: std::sync::atomic::AtomicU32,
    pub is_authenticated: std::sync::atomic::AtomicBool,
}

/// Initialize the Tauri application with all plugins and event handlers
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .manage(AppState::default())
        .setup(|app| {
            // Initialize logging
            env_logger::init();
            log::info!("YULA Desktop starting...");

            // Setup system tray
            tray::setup_tray(app.handle())?;

            // Handle deep links - Tauri 2.x uses plugin setup
            #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let handle = app.handle().clone();
                app.deep_link().on_open_url(move |event| {
                    let urls = event.urls();
                    log::info!("Deep link received: {:?}", urls);
                    if let Some(window) = handle.get_webview_window("main") {
                        for url in urls {
                            let _ = window.emit("deep-link", url.to_string());
                        }
                        let _ = window.set_focus();
                    }
                });
            }

            // Open devtools in debug mode
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }

            log::info!("YULA Desktop initialized successfully");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::show_notification,
            commands::get_system_info,
            commands::get_app_version,
            commands::set_badge_count,
            commands::clear_badge,
            commands::check_for_updates,
            commands::install_update,
            commands::set_autostart,
            commands::get_autostart_enabled,
            commands::open_external_link,
            commands::copy_to_clipboard,
            commands::read_from_clipboard,
            commands::minimize_to_tray,
            commands::quit_app,
        ])
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // On macOS, closing the window just hides it (default behavior)
                // On other platforms, we could minimize to tray
                #[cfg(not(target_os = "macos"))]
                {
                    // Note: For non-macOS, the window closes - tray minimization
                    // would require additional configuration
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("Error while running YULA Desktop");
}
