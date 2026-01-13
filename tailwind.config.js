/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'tokyo-bg': '#1a1b26',
                'tokyo-fg': '#a9b1d6',
                'tokyo-accent': '#7aa2f7',
                'tokyo-card': '#24283b',
            }
        },
    },
    plugins: [],
}
