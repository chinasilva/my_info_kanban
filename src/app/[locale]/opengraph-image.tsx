import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'nodejs';

// Image metadata
export const alt = 'High-Signal Aggregator';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

// Image generation
export default async function Image({ params }: { params: { locale: string } }) {
    const { locale } = params;
    const isZh = locale === 'zh' || locale === 'tw';

    return new ImageResponse(
        (
            <div
                style={{
                    fontSize: 128,
                    background: '#0d1117',
                    color: 'white',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                    position: 'relative',
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    marginBottom: '40px'
                }}>
                    <span style={{ fontSize: 100 }}>📡</span>
                    <div style={{
                        background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
                        backgroundClip: 'text',
                        color: 'transparent',
                        fontWeight: 'bold'
                    }}>
                        High-Signal
                    </div>
                </div>

                <div style={{
                    fontSize: 48,
                    color: '#8b949e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    {isZh ? '高质量信息聚合平台' : 'Curated Tech & Finance Signals'}
                </div>

                {/* Decorative Grid */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: 'radial-gradient(circle at 25px 25px, #30363d 2%, transparent 0%)',
                    backgroundSize: '50px 50px',
                    zIndex: -1,
                    opacity: 0.5
                }} />
            </div>
        ),
        {
            ...size,
        }
    );
}
