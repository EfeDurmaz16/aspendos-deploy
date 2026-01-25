//! YULA OS Desktop Application Entry Point
//!
//! This is the main entry point for the Tauri application.
//! All heavy lifting is done in lib.rs for better testability.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    yula_desktop_lib::run();
}
