import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'YULA - All AI Models, One Memory';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #09090b 100%)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'system-ui, sans-serif',
                    position: 'relative',
                }}
            >
                {/* Gradient overlay */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle at 30% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle at 70% 80%, rgba(16, 185, 129, 0.15) 0%, transparent 50%)',
                    }}
                />

                {/* Logo/Brand */}
                <div
                    style={{
                        fontSize: 72,
                        fontWeight: 800,
                        color: 'white',
                        marginBottom: 24,
                        letterSpacing: '-0.02em',
                    }}
                >
                    YULA
                </div>

                {/* Tagline */}
                <div
                    style={{
                        fontSize: 36,
                        color: '#a1a1aa',
                        marginBottom: 48,
                        textAlign: 'center',
                        maxWidth: 800,
                    }}
                >
                    All AI Models, One Memory
                </div>

                {/* Features row */}
                <div
                    style={{
                        display: 'flex',
                        gap: 32,
                        marginBottom: 48,
                    }}
                >
                    {['GPT-5', 'Claude', 'Gemini', 'Llama', '+8 more'].map((model) => (
                        <div
                            key={model}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: 12,
                                padding: '12px 24px',
                                color: '#e4e4e7',
                                fontSize: 20,
                                fontWeight: 500,
                            }}
                        >
                            {model}
                        </div>
                    ))}
                </div>

                {/* Bottom features */}
                <div
                    style={{
                        display: 'flex',
                        gap: 48,
                        color: '#71717a',
                        fontSize: 18,
                    }}
                >
                    <span>Import ChatGPT History</span>
                    <span>Proactive Reminders</span>
                    <span>Council Mode</span>
                </div>

                {/* URL */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 32,
                        fontSize: 20,
                        color: '#52525b',
                    }}
                >
                    yula.dev
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
