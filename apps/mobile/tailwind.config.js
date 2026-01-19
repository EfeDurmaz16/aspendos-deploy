/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./App.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./node_modules/heroui-native/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                background: "#ffffff",
                foreground: "#0a0a0a",
                primary: "#171717",
                "primary-foreground": "#fafafa",
                secondary: "#f5f5f5",
                "secondary-foreground": "#171717",
                muted: "#f5f5f5",
                "muted-foreground": "#737373",
                accent: "#f5f5f5",
                "accent-foreground": "#171717",
                destructive: "#ef4444",
                "destructive-foreground": "#fafafa",
                border: "#e5e5e5",
                input: "#e5e5e5",
                ring: "#0a0a0a",
            },
            fontFamily: {
                sans: ["Figtree_400Regular", "System"],
                mono: ["JetBrainsMono_400Regular", "System"],
            }
        },
    },
    plugins: [],
};
