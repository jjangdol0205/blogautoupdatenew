import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');
    const type = searchParams.get('type') || 'economy';
    const bg = searchParams.get('bg'); // Background image URL

    const hasTitle = title && title.length > 0;
    const ogTitle = hasTitle ? title : '당신을 위한 프리미엄 정보';

    // 텍스트 테두리 효과 (Black stroke effect)
    const strokeShadow = '2px 0 0 #000, -2px 0 0 #000, 0 2px 0 #000, 0 -2px 0 #000, 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000';

    let tagText = '은퇴 후 30년, 품격 있는 경제';
    if (type === 'health') {
        tagText = '노래하는 청춘 건강 연구소';
    } else if (type === 'trot') {
        tagText = '트롯 뉴스룸 : 김기자의 취재수첩';
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#111',
            fontFamily: 'sans-serif',
            position: 'relative',
          }}
        >
          {/* Background Image */}
          {bg ? (
            <img 
              src={bg} 
              alt="Background" 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }} 
            />
          ) : (
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              backgroundImage: 'linear-gradient(135deg, #1f1f1f 0%, #050505 100%)'
            }} />
          )}

          {/* Dim Overlay for extremely high text readability */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.45)', // Darken background slightly
          }} />

          {/* Text Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              maxWidth: '1050px',
              textAlign: 'center',
              zIndex: 10,
              gap: '20px',
            }}
          >
            {/* Category / Tag Text (Yellow with black stroke) */}
            <div
              style={{
                fontSize: 32,
                color: '#FFEA00', // Bright Yellow
                fontWeight: 900,
                letterSpacing: '0.05em',
                textShadow: strokeShadow,
                lineHeight: 1.2,
                wordBreak: 'keep-all',
              }}
            >
              {tagText}
            </div>

            {/* Main Title Text (White with black stroke) */}
            <div
              style={{
                fontSize: ogTitle.length > 25 ? 56 : 72,
                fontWeight: 900,
                color: '#FFFFFF', // Pure White
                lineHeight: 1.3,
                wordBreak: 'keep-all',
                letterSpacing: '-0.02em',
                textShadow: strokeShadow,
                padding: '0 40px',
              }}
            >
              {ogTitle}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: unknown) {
    console.log(`${e instanceof Error ? e.message : 'Unknown Error'}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
