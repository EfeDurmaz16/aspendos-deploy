/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: "class",
    content: [
        "./App.{js,jsx,ts,tsx}",
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                background: "var(--color-background)",
                foreground: "var(--color-foreground)",
                card: "var(--color-card)",
                "card-foreground": "var(--color-card-foreground)",
                popover: "var(--color-popover)",
                "popover-foreground": "var(--color-popover-foreground)",
                primary: "var(--color-primary)",
                "primary-foreground": "var(--color-primary-foreground)",
                secondary: "var(--color-secondary)",
                "secondary-foreground": "var(--color-secondary-foreground)",
                muted: "var(--color-muted)",
                "muted-foreground": "var(--color-muted-foreground)",
                accent: "var(--color-accent)",
                "accent-foreground": "var(--color-accent-foreground)",
                destructive: "var(--color-destructive)",
                "destructive-foreground": "var(--color-destructive-foreground)",
                border: "var(--color-border)",
                input: "var(--color-input)",
                ring: "var(--color-ring)",
            },
            fontFamily: {
                sans: ["System"],
                mono: ["Menlo"],
            },
        },
    },
    plugins: [],
};
