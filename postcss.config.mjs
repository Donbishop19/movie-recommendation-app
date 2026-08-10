/** PostCSS pipeline: Tailwind CSS v4 runs as a single PostCSS plugin, no separate autoprefixer needed. */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
