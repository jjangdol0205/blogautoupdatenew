import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const top = searchParams.get('top') || '블로그 왕초보 필수';
    const mid = searchParams.get('mid') || '블로그';
    const bottom = searchParams.get('bottom') || '챌린지';

    // 해시태그 형식으로 변환 (앞에 #이 없으면 단어별로 # 추가)
    const topTags = top.includes('#') ? top : `#${top.split(' ').filter(t => t.trim() !== '').join(' #')}`;

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#38A169', // 산뜻한 녹색 바탕
            fontFamily: 'sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background Text Pattern */}
          <div style={{ position: 'absolute', top: '-10px', left: '40px', display: 'flex', fontSize: 130, fontWeight: 900, color: 'rgba(0, 0, 0, 0.04)', letterSpacing: '0.05em' }}>
            BLOG POST
          </div>
          <div style={{ position: 'absolute', bottom: '-10px', right: '40px', display: 'flex', fontSize: 130, fontWeight: 900, color: 'rgba(0, 0, 0, 0.04)', letterSpacing: '0.05em' }}>
            BLOG POST
          </div>

          {/* Inner White Rounded Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF',
              width: '880px',
              height: '880px',
              borderRadius: '120px', // 매우 둥근 사각형
              boxShadow: '0 40px 80px rgba(0,0,0,0.15)',
              position: 'relative',
              padding: '40px',
            }}
          >
            {/* Top Hashtags */}
            <div
              style={{
                display: 'flex',
                fontSize: 36,
                color: '#555555',
                fontWeight: 600,
                marginBottom: '70px',
                letterSpacing: '-0.02em',
              }}
            >
              {topTags}
            </div>

            {/* Mid Huge Text (Green) */}
            <div
              style={{
                display: 'flex',
                fontSize: mid.length > 5 ? 150 : 200,
                fontWeight: 900,
                color: '#2b8f58', // 더 진하고 선명한 녹색
                lineHeight: 1.05,
                letterSpacing: '-0.05em',
                marginBottom: '10px',
              }}
            >
              {mid}
            </div>

            {/* Bottom Huge Text (Black) */}
            <div
              style={{
                display: 'flex',
                fontSize: bottom.length > 5 ? 150 : 200,
                fontWeight: 900,
                color: '#111111',
                lineHeight: 1.05,
                letterSpacing: '-0.05em',
                marginBottom: '80px',
              }}
            >
              {bottom}
            </div>

            {/* Small decorative text at the bottom */}
            <div
              style={{
                position: 'absolute',
                bottom: '60px',
                display: 'flex',
                fontSize: 24,
                color: '#aaaaaa',
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}
            >
              @TREND_AUTO_GENERATOR
            </div>
            
            {/* Decorative dots to emulate the floating emojis vibe (for broad topic safety) */}
            <div style={{ position: 'absolute', display: 'flex', left: '100px', top: '380px', width: '40px', height: '40px', borderRadius: '20px', backgroundColor: '#fde047', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
            <div style={{ position: 'absolute', display: 'flex', right: '120px', bottom: '280px', width: '50px', height: '50px', borderRadius: '25px', backgroundColor: '#ef4444', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
            <div style={{ position: 'absolute', display: 'flex', right: '160px', top: '180px', width: '24px', height: '24px', borderRadius: '12px', backgroundColor: '#3b82f6', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1080,
      }
    );
  } catch (e: unknown) {
    console.log(`${e instanceof Error ? e.message : 'Unknown Error'}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
