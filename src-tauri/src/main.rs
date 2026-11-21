#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs, io::{self, Write}, path::{Path, PathBuf}, time::Duration};
use tauri::Manager;

#[derive(serde::Deserialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
enum Store { Settings, RunSaves }

impl Store {
    fn path(self, app: &tauri::AppHandle) -> Result<PathBuf, String> {
        let root = app.path().app_local_data_dir().map_err(|_| "StorageUnavailable")?;
        Ok(root.join(match self {
            Store::Settings => "preferences/user-settings.json",
            Store::RunSaves => "saves/run-saves.json",
        }))
    }
}

fn io_code(error: io::Error) -> String {
    match error.raw_os_error() {
        Some(32 | 33) => "EBUSY".into(),
        Some(39 | 112) => "ENOSPC".into(),
        Some(5) => "EACCES".into(),
        _ => format!("{:?}", error.kind()),
    }
}

#[tauri::command]
async fn read_store(app: tauri::AppHandle, store: Store) -> Result<Option<String>, String> {
    match fs::read_to_string(store.path(&app)?) {
        Ok(contents) => Ok(Some(contents)),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(io_code(e)),
    }
}

fn write_atomic(path: &Path, contents: &str) -> io::Result<()> {
    let directory = path.parent().expect("fixed store path has a parent");
    fs::create_dir_all(directory)?;
    let mut staged = tempfile::NamedTempFile::new_in(directory)?;
    staged.write_all(contents.as_bytes())?;
    staged.as_file().sync_all()?;
    for delay in [40, 100, 200] {
        match staged.persist(path) {
            Ok(_) => return Ok(()),
            Err(err) if matches!(err.error.raw_os_error(), Some(5 | 32 | 33)) => {
                staged = err.file;
                std::thread::sleep(Duration::from_millis(delay));
            }
            Err(err) => return Err(err.error),
        }
    }
    staged.persist(path).map(|_| ()).map_err(|e| e.error)
}

#[tauri::command]
async fn write_store(app: tauri::AppHandle, store: Store, contents: Option<String>) -> Result<(), String> {
    let path = store.path(&app)?;
    if let Some(text) = contents {
        let value: serde_json::Value = serde_json::from_str(&text).map_err(|_| "SyntaxError")?;
        let valid = match store {
            Store::Settings => value["settings"].is_object(),
            Store::RunSaves => value["slots"].is_array(),
        };
        if !valid || value["version"].as_u64().unwrap_or(0) == 0 { return Err("SyntaxError".into()); }
        write_atomic(&path, &text).map_err(io_code)
    } else {
        match fs::remove_file(path) {
            Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(()),
            result => result.map_err(io_code),
        }
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .invoke_handler(tauri::generate_handler![read_store, write_store])
        .run(tauri::generate_context!())
        .expect("SttS could not start");
}
