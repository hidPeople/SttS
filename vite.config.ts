import { defineConfig } from 'vite';
import { userSettingsFilePlugin } from './scripts/user-settings-server.mjs';

// Relative asset URLs allow the same build to run under a packaged desktop WebView.
export default defineConfig({ base: './', plugins: [userSettingsFilePlugin()] });
