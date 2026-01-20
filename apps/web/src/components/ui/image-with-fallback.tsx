
import { useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Image as ImageIcon } from "lucide-react";

interface ImageWithFallbackProps extends ImgHTMLAttributes<HTMLImageElement> {
    fallbackClassName?: string;
}

export function ImageWithFallback({
    src,
    alt,
    className,
    fallbackClassName,
    ...props
}: ImageWithFallbackProps) {
    const [error, setError] = useState(false);

    if (error || !src) {
        return (
            <div
                className={cn(
                    "flex items-center justify-center bg-zinc-800 rounded-md",
                    className,
                    fallbackClassName
                )}
            >
                <ImageIcon className="w-1/2 h-1/2 text-zinc-600" />
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setError(true)}
            {...props}
        />
    );
}
