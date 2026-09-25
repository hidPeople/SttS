import { defineConfig } from 'vite';

// Relative asset URLs allow the same build to run under a packaged desktop WebView.
export default defineConfig({ base: './' });
