const { heroui } = require("heroui-native");

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./App.{js,jsx,ts,tsx}",
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
        "./node_modules/heroui-native/**/*.{js,jsx,ts,tsx}", // Check if this path is correct for your node_modules structure
    ],
    theme: {
        extend: {
            colors: {
                background: "#ffffff",
                foreground: "#0a0a0a",
                card: "#ffffff",
                "card-foreground": "#0a0a0a",
                popover: "#ffffff",
                "popover-foreground": "#0a0a0a",
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
                // Custom
            },
            fontFamily: {
                sans: ["Figtree"],
                mono: ["JetBrains Mono"],
            },
        },
    },
    plugins: [heroui()],
};
