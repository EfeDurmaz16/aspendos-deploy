'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { type OmnibarResult, useYulaStore } from '@/stores/yula-store';

// Quick action definitions
const QUICK_ACTIONS: OmnibarResult[] = [
    {
        id: 'action-plan-weekend',
        type: 'action',
        title: 'Plan my weekend',
        description: 'Let Yula help you organize your weekend activities',
        icon: 'calendar',
    },
    {
        id: 'action-remember-receipt',
        type: 'action',
        title: 'Remember this receipt',
        description: 'Store and categorize a receipt in your memory',
        icon: 'receipt',
    },
    {
        id: 'action-summarize',
        type: 'action',
        title: 'Summarize my day',
        description: 'Get a quick overview of your activities today',
        icon: 'sparkle',
    },
    {
        id: 'action-council',
        type: 'action',
        title: 'Start Council mode',
        description: 'Get multiple perspectives on a decision',
        icon: 'users',
    },
];

// Navigation items
const NAVIGATION_ITEMS: OmnibarResult[] = [
    {
        id: 'nav-home',
        type: 'setting',
        title: 'Home',
        description: 'Go to home page',
        icon: 'home',
    },
    {
        id: 'nav-chat',
        type: 'setting',
        title: 'Chat',
        description: 'Open chat interface',
        icon: 'chat',
    },
    {
        id: 'nav-memory',
        type: 'setting',
        title: 'Memory',
        description: 'View your memories',
        icon: 'brain',
    },
    {
        id: 'nav-settings',
        type: 'setting',
        title: 'Settings',
        description: 'Configure Yula',
        icon: 'settings',
    },
];

// Simple fuzzy search implementation
function fuzzyMatch(query: string, text: string): boolean {
    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();

    // Direct substring match
    if (lowerText.includes(lowerQuery)) return true;

    // Fuzzy match - all characters in query appear in order
    let queryIndex = 0;
    for (const char of lowerText) {
        if (char === lowerQuery[queryIndex]) {
            queryIndex++;
            if (queryIndex === lowerQuery.length) return true;
        }
    }

    return false;
}

export function useOmnibar() {
    const router = useRouter();
    const {
        omnibar,
        openOmnibar,
        closeOmnibar,
        toggleOmnibar,
        setOmnibarQuery,
        setOmnibarResults,
        setOmnibarSelectedIndex,
        setOmnibarLoading,
        executeOmnibarAction,
    } = useYulaStore();

    // Keyboard shortcut handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + K to toggle
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                toggleOmnibar();
            }

            // Escape to close
            if (e.key === 'Escape' && omnibar.isOpen) {
                e.preventDefault();
                closeOmnibar();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [toggleOmnibar, closeOmnibar, omnibar.isOpen]);

    // Create action handlers with navigation
    const createNavigationHandler = useCallback(
        (path: string) => () => {
            router.push(path);
        },
        [router]
    );

    // Search function
    const search = useCallback(
        async (query: string) => {
            setOmnibarQuery(query);

            if (!query.trim()) {
                // Show default items when query is empty
                setOmnibarResults([...QUICK_ACTIONS.slice(0, 3), ...NAVIGATION_ITEMS.slice(0, 3)]);
                return;
            }

            setOmnibarLoading(true);

            try {
                // Filter quick actions and navigation
                const matchedActions = QUICK_ACTIONS.filter(
                    (item) =>
                        fuzzyMatch(query, item.title) || fuzzyMatch(query, item.description || '')
                );

                const matchedNav = NAVIGATION_ITEMS.filter(
                    (item) =>
                        fuzzyMatch(query, item.title) || fuzzyMatch(query, item.description || '')
                );

                // TODO: Add memory search here
                // const memoryResults = await searchMemories(query);

                // TODO: Add chat search here
                // const chatResults = await searchChats(query);

                const results: OmnibarResult[] = [
                    ...matchedActions.map((item) => ({
                        ...item,
                        action:
                            item.id === 'action-council'
                                ? () => router.push('/chat?mode=council')
                                : item.id === 'action-plan-weekend'
                                  ? () => router.push('/chat?prompt=Plan+my+weekend')
                                  : item.id === 'action-remember-receipt'
                                    ? () => router.push('/chat?prompt=Remember+this+receipt')
                                    : item.id === 'action-summarize'
                                      ? () => router.push('/chat?prompt=Summarize+my+day')
                                      : undefined,
                    })),
                    ...matchedNav.map((item) => ({
                        ...item,
                        action: createNavigationHandler(
                            item.id === 'nav-home'
                                ? '/'
                                : item.id === 'nav-chat'
                                  ? '/chat'
                                  : item.id === 'nav-memory'
                                    ? '/memory'
                                    : '/settings'
                        ),
                    })),
                ];

                setOmnibarResults(results);
            } finally {
                setOmnibarLoading(false);
            }
        },
        [setOmnibarQuery, setOmnibarResults, setOmnibarLoading, router, createNavigationHandler]
    );

    // Navigation within results
    const navigateResults = useCallback(
        (direction: 'up' | 'down') => {
            const { results, selectedIndex } = omnibar;
            if (results.length === 0) return;

            let newIndex: number;
            if (direction === 'down') {
                newIndex = selectedIndex < results.length - 1 ? selectedIndex + 1 : 0;
            } else {
                newIndex = selectedIndex > 0 ? selectedIndex - 1 : results.length - 1;
            }

            setOmnibarSelectedIndex(newIndex);
        },
        [omnibar, setOmnibarSelectedIndex]
    );

    // Execute selected result
    const executeSelected = useCallback(() => {
        const { results, selectedIndex } = omnibar;
        if (results.length > 0 && results[selectedIndex]) {
            executeOmnibarAction(results[selectedIndex]);
        }
    }, [omnibar, executeOmnibarAction]);

    // Default results (shown when omnibar opens with empty query)
    const defaultResults = useMemo(
        () => [
            ...QUICK_ACTIONS.slice(0, 3).map((item) => ({
                ...item,
                action:
                    item.id === 'action-council'
                        ? () => router.push('/chat?mode=council')
                        : item.id === 'action-plan-weekend'
                          ? () => router.push('/chat?prompt=Plan+my+weekend')
                          : undefined,
            })),
            ...NAVIGATION_ITEMS.slice(0, 3).map((item) => ({
                ...item,
                action: createNavigationHandler(
                    item.id === 'nav-home' ? '/' : item.id === 'nav-chat' ? '/chat' : '/memory'
                ),
            })),
        ],
        [router, createNavigationHandler]
    );

    // Initialize with default results when opening
    useEffect(() => {
        if (omnibar.isOpen && omnibar.query === '' && omnibar.results.length === 0) {
            setOmnibarResults(defaultResults);
        }
    }, [omnibar.isOpen, omnibar.query, omnibar.results.length, defaultResults, setOmnibarResults]);

    return {
        // State
        isOpen: omnibar.isOpen,
        query: omnibar.query,
        results: omnibar.results,
        selectedIndex: omnibar.selectedIndex,
        isLoading: omnibar.isLoading,

        // Actions
        open: openOmnibar,
        close: closeOmnibar,
        toggle: toggleOmnibar,
        search,
        navigateResults,
        executeSelected,
        executeAction: executeOmnibarAction,
    };
}
