//! System Tray functionality for YULA Desktop
//!
//! Provides a persistent tray icon with quick actions.

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime,
};

/// Setup the system tray icon and menu
pub fn setup_tray<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    // Create menu items
    let open = MenuItemBuilder::new("Open YULA")
        .id("open")
        .build(app)?;

    let new_chat = MenuItemBuilder::new("New Chat")
        .id("new_chat")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;

    let council = MenuItemBuilder::new("Council Mode")
        .id("council")
        .accelerator("CmdOrCtrl+Shift+C")
        .build(app)?;

    let separator1 = PredefinedMenuItem::separator(app)?;

    let check_updates = MenuItemBuilder::new("Check for Updates...")
        .id("check_updates")
        .build(app)?;

    let preferences = MenuItemBuilder::new("Preferences...")
        .id("preferences")
        .accelerator("CmdOrCtrl+,")
        .build(app)?;

    let separator2 = PredefinedMenuItem::separator(app)?;

    let quit = MenuItemBuilder::new("Quit YULA")
        .id("quit")
        .accelerator("CmdOrCtrl+Q")
        .build(app)?;

    // Build the menu
    let menu = MenuBuilder::new(app)
        .item(&open)
        .item(&separator1)
        .item(&new_chat)
        .item(&council)
        .item(&separator1)
        .item(&check_updates)
        .item(&preferences)
        .item(&separator2)
        .item(&quit)
        .build()?;

    // Create tray icon
    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| {
            match event.id().as_ref() {
                "open" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "new_chat" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.emit("tray-action", "new-chat");
                    }
                }
                "council" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.emit("tray-action", "council");
                    }
                }
                "check_updates" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("tray-action", "check-updates");
                    }
                }
                "preferences" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.emit("tray-action", "preferences");
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                // Show window on left click
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}
