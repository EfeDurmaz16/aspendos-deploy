"use client"

import * as React from "react"
import {
    Calculator,
    Calendar,
    CreditCard,
    Gear,
    Smiley,
    User,
    Brain,
    ChatCircle,
    House,
    MagnifyingGlass,
    Command as CommandIcon,
    Moon,
    Sun
} from "@phosphor-icons/react"
import { useRouter } from "next/navigation"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { useTheme } from "next-themes"

export function GlobalCommand() {
    const [open, setOpen] = React.useState(false)
    const router = useRouter()
    const { setTheme } = useTheme()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Navigation">
                    <CommandItem
                        onSelect={() => runCommand(() => router.push("/"))}
                    >
                        <House className="mr-2 h-4 w-4" />
                        <span>Home</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => router.push("/chat"))}
                    >
                        <ChatCircle className="mr-2 h-4 w-4" />
                        <span>Chat</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => router.push("/memory"))}
                    >
                        <Brain className="mr-2 h-4 w-4" />
                        <span>Memory</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => router.push("/pricing"))}
                    >
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Pricing</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Theme">
                    <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
                        <Sun className="mr-2 h-4 w-4" />
                        <span>Light</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
                        <Moon className="mr-2 h-4 w-4" />
                        <span>Dark</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
                        <Gear className="mr-2 h-4 w-4" />
                        <span>System</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}
