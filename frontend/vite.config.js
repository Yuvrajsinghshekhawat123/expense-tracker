 import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})


/*
1. You add the Tailwind plugin in vite.config.js because Vite needs to process Tailwind CSS during the build/dev process.

1️⃣ What Vite Does
  . Vite is a build tool.
  . It processes things like:
      React JSX → JavaScript
      CSS → Browser-ready CSS
      Tailwind directives → actual CSS utilities

  . But Vite does not know Tailwind automatically.
  . So we add the plugin:
      plugins: [react(), tailwindcss()]

  . This tells Vite:
      "Use Tailwind while building CSS"





*/