'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X, Check, Warning, Info } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';

export interface Toast {
    id: string;
    title?: string;
    description?: string;
    variant: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
    open: boolean;
}

type ToastActionElement = React.ReactElement<any>;

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id' | 'open'>) => void;
    removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<Toast[]>([]);

    const addToast = React.useCallback(
        (toast: Omit<Toast, 'id' | 'open'>) => {
            const id = Math.random().toString(36).substr(2, 9);
            const newToast: Toast = { ...toast, id, open: true };
            setToasts((prev) => [...prev, newToast]);

            if (toast.duration ?? 4000 > 0) {
                setTimeout(() => {
                    removeToast(id);
                }, toast.duration ?? 4000);
            }
        },
        []
    );

    const removeToast = React.useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

const toastVariants = cva(
    'pointer-events-auto relative flex w-full max-w-sm items-center justify-between gap-3 rounded-lg border px-4 py-3 shadow-lg',
    {
        variants: {
            variant: {
                success:
                    'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200',
                error: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-200',
                warning:
                    'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200',
                info: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200',
            },
        },
        defaultVariants: {
            variant: 'info',
        },
    }
);

interface ToastProps extends VariantProps<typeof toastVariants> {
    toast: Toast;
    onClose: (id: string) => void;
}

const toastIconMap = {
    success: Check,
    error: X,
    warning: Warning,
    info: Info,
};

function ToastMessage({ toast, onClose }: ToastProps) {
    const IconComponent = toastIconMap[toast.variant];

    return (
        <div className={cn(toastVariants({ variant: toast.variant }))}>
            <div className="flex items-start gap-3">
                <IconComponent className="h-5 w-5 flex-shrink-0 mt-0.5" weight="bold" />
                <div className="flex-1">
                    {toast.title && (
                        <p className="font-medium leading-none mb-1">{toast.title}</p>
                    )}
                    {toast.description && (
                        <p className="text-sm opacity-90">{toast.description}</p>
                    )}
                </div>
            </div>
            <button
                onClick={() => onClose(toast.id)}
                className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 rounded"
                aria-label="Close toast"
            >
                <X className="h-4 w-4" weight="bold" />
            </button>
        </div>
    );
}

interface ToastContainerProps {
    toasts: Toast[];
    removeToast: (id: string) => void;
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
    return (
        <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:max-w-[420px]">
            {toasts.map((toast) => (
                <div key={toast.id} className="mb-2 animate-fade-up">
                    <ToastMessage toast={toast} onClose={removeToast} />
                </div>
            ))}
        </div>
    );
}

export { toastVariants };
