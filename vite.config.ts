import { defineConfig } from 'vite';

export default defineConfig({
  // Optional: Configure server options
  server: {
    port: 3050, // Default port
    open: true // Automatically open in browser
  },
  // Optional: Configure build options
  build: {
    // Output directory (default is 'dist')
    // outDir: 'dist',
  },
  // Ensure assets are handled correctly
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.wav', '**/*.mp3', '**/*.ogg']
}); 