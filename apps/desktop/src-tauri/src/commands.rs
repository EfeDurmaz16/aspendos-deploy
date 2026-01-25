//! Tauri Commands for YULA Desktop
//!
//! These commands are exposed to the frontend via `invoke()`.

use serde::Serialize;
use tauri::{AppHandle, Manager, Runtime};

/// System information response
#[derive(Debug, Serialize)]
pub struct SystemInfo {
    pub platform: String,
    pub arch: String,
    pub os_version: String,
    pub hostname: String,
}

/// Update information
#[derive(Debug, Serialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub version: Option<String>,
    pub notes: Option<String>,
}

/// Show a native system notification
#[tauri::command]
pub async fn show_notification<R: Runtime>(
    app: AppHandle<R>,
    title: String,
    body: String,
    icon: Option<String>,
) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;

    let mut notification = app.notification().builder();
    notification = notification.title(&title).body(&body);

    if let Some(icon_path) = icon {
        notification = notification.icon(&icon_path);
    }

    notification.show().map_err(|e| e.to_string())
}

/// Get system information
#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    SystemInfo {
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        os_version: tauri_plugin_os::version().to_string(),
        hostname: tauri_plugin_os::hostname(),
    }
}

/// Get application version
#[tauri::command]
pub fn get_app_version<R: Runtime>(app: AppHandle<R>) -> String {
    app.package_info().version.to_string()
}

/// Set the dock/taskbar badge count (for notifications)
#[tauri::command]
pub async fn set_badge_count<R: Runtime>(
    app: AppHandle<R>,
    count: u32,
) -> Result<(), String> {
    // Update state
    if let Some(state) = app.try_state::<crate::AppState>() {
        state.notification_count.store(count, std::sync::atomic::Ordering::SeqCst);
    }

    // Platform-specific badge handling
    #[cfg(target_os = "macos")]
    {
        // macOS dock badge is handled via NSApplication
        // For now, we update the state and the tray can read it
        let _ = &app; // Suppress unused warning
    }

    Ok(())
}

/// Clear the notification badge
#[tauri::command]
pub async fn clear_badge<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    set_badge_count(app, 0).await
}

/// Check for application updates
#[tauri::command]
pub async fn check_for_updates<R: Runtime>(app: AppHandle<R>) -> Result<UpdateInfo, String> {
    use tauri_plugin_updater::UpdaterExt;

    match app.updater() {
        Ok(updater) => {
            match updater.check().await {
                Ok(Some(update)) => Ok(UpdateInfo {
                    available: true,
                    version: Some(update.version.clone()),
                    notes: update.body.clone(),
                }),
                Ok(None) => Ok(UpdateInfo {
                    available: false,
                    version: None,
                    notes: None,
                }),
                Err(e) => Err(e.to_string()),
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

/// Install available update
#[tauri::command]
pub async fn install_update<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    use tauri_plugin_updater::UpdaterExt;

    let updater = app.updater().map_err(|e| e.to_string())?;

    if let Some(update) = updater.check().await.map_err(|e| e.to_string())? {
        // Download and install
        let mut downloaded = 0;
        update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    log::info!("Downloaded {} of {:?}", downloaded, content_length);
                },
                || {
                    log::info!("Download finished, installing...");
                },
            )
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Enable or disable autostart on system boot
#[tauri::command]
pub async fn set_autostart<R: Runtime>(
    app: AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;

    let autostart = app.autolaunch();

    if enabled {
        autostart.enable().map_err(|e| e.to_string())
    } else {
        autostart.disable().map_err(|e| e.to_string())
    }
}

/// Check if autostart is enabled
#[tauri::command]
pub async fn get_autostart_enabled<R: Runtime>(app: AppHandle<R>) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;

    app.autolaunch()
        .is_enabled()
        .map_err(|e| e.to_string())
}

/// Open an external link in the default browser
#[tauri::command]
pub async fn open_external_link<R: Runtime>(
    app: AppHandle<R>,
    url: String,
) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;

    app.shell()
        .open(&url, None)
        .map_err(|e| e.to_string())
}

/// Copy text to system clipboard
#[tauri::command]
pub async fn copy_to_clipboard<R: Runtime>(
    app: AppHandle<R>,
    text: String,
) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;

    app.clipboard()
        .write_text(&text)
        .map_err(|e| e.to_string())
}

/// Read text from system clipboard
#[tauri::command]
pub async fn read_from_clipboard<R: Runtime>(
    app: AppHandle<R>,
) -> Result<String, String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;

    app.clipboard()
        .read_text()
        .map_err(|e| e.to_string())
}

/// Minimize the window to system tray
#[tauri::command]
pub async fn minimize_to_tray<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())
    } else {
        Err("Main window not found".to_string())
    }
}

/// Quit the application
#[tauri::command]
pub async fn quit_app<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    app.exit(0);
    Ok(())
}
