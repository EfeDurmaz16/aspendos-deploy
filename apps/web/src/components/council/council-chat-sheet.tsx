'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CouncilChat } from './council-chat';

interface CouncilChatSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CouncilChatSheet({ isOpen, onClose }: CouncilChatSheetProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    {/* Sheet */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 z-50 h-full w-full max-w-lg"
                    >
                        <CouncilChat
                            className="h-full rounded-none rounded-l-2xl"
                            onClose={onClose}
                        />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
