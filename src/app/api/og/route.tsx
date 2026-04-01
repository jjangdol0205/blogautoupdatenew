import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const top = searchParams.get('top') || '블로그 왕초보 필수';
    const mid = searchParams.get('mid') || '블로그';
    const bottom = searchParams.get('bottom') || '챌린지';
    const bgUrl = searchParams.get('bg');
    const style = searchParams.get('style') || 'blog1';

    let bgGradient = 'linear-gradient(to bottom right, #7C3AED, #0EA5E9)'; // blog1 (Purple/Blue)
    let glowOrb1 = '#F472B6';
    let glowOrb2 = '#34D399';
    let badgeColor = '#4F46E5';
    let badgeBg = 'rgba(79, 70, 229, 0.08)';
    let bottomTextColor = '#2563EB';

    if (style === 'blog2') {
      bgGradient = 'linear-gradient(to bottom right, #059669, #0284C7)'; // Emerald/Blue
      glowOrb1 = '#34D399';
      glowOrb2 = '#FBBF24';
      badgeColor = '#059669';
      badgeBg = 'rgba(5, 150, 105, 0.08)';
      bottomTextColor = '#0ea5e9';
    } else if (style === 'blog3') {
      bgGradient = 'linear-gradient(to right, #f87171, #f97316)'; // Red/Orange
      glowOrb1 = '#fcd34d';
      glowOrb2 = '#f43f5e';
      badgeColor = '#e11d48';
      badgeBg = 'rgba(225, 29, 72, 0.08)';
      bottomTextColor = '#ea580c';
    }

    // 해시태그 형식으로 변환 (앞에 #이 없으면 단어별로 # 추가)
    const topTags = top.includes('#') ? top : `#${top.split(' ').filter(t => t.trim() !== '').join(' #')}`;
    
    // 글자 길이에 따른 동적 폰트 사이즈 (글자 짤림 방지)
    const getFontSize = (text: string) => {
      if (text.length > 12) return 80;
      if (text.length > 8) return 110;
      if (text.length > 5) return 140;
      return 180;
    };
    
    const midSize = getFontSize(mid);
    const bottomSize = getFontSize(bottom);

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: bgUrl ? 'none' : bgGradient,
            backgroundColor: bgUrl ? '#000' : 'transparent',
            fontFamily: 'sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {bgUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={bgUrl} 
              alt="bg" 
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} 
            />
          )}

          {/* Background Text Pattern - Subtle Typography (Hidden if bg exists) */}
          {!bgUrl && (
            <div style={{ position: 'absolute', top: '-10px', left: '40px', display: 'flex', fontSize: 130, fontWeight: 900, color: 'rgba(255, 255, 255, 0.05)', letterSpacing: '0.05em' }}>
              DAILY INSIGHT
            </div>
          )}
          {!bgUrl && (
            <div style={{ position: 'absolute', bottom: '-10px', right: '40px', display: 'flex', fontSize: 130, fontWeight: 900, color: 'rgba(255, 255, 255, 0.05)', letterSpacing: '0.05em' }}>
              TREND INFO
            </div>
          )}

          {/* Glowing Orbs behind the Glass Card */}
          <div style={{ position: 'absolute', top: '100px', left: '150px', width: '300px', height: '300px', borderRadius: '150px', backgroundColor: glowOrb1, opacity: 0.8, filter: 'blur(50px)' }} />
          <div style={{ position: 'absolute', bottom: '100px', right: '150px', width: '350px', height: '350px', borderRadius: '175px', backgroundColor: glowOrb2, opacity: 0.6, filter: 'blur(60px)' }} />

          {/* Inner Premium Glassmorphism Box */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.92)', // 유리를 연상케 하는 반투명 화이트
              width: '880px',
              height: '880px',
              borderRadius: '80px', // 세련된 둥근 모서리
              boxShadow: '0 40px 100px rgba(0,0,0,0.25)', // 깊이감 있는 그림자
              border: '4px solid rgba(255, 255, 255, 0.5)', // 반사되는 느낌의 얇은 테두리
              position: 'relative',
              padding: '40px',
            }}
          >
            {/* Top Hashtags (Sleek Pill Shape) */}
            <div
              style={{
                display: 'flex',
                fontSize: 34,
                color: badgeColor,
                backgroundColor: badgeBg,
                padding: '12px 30px',
                borderRadius: '30px',
                fontWeight: 700,
                marginBottom: '70px',
                letterSpacing: '-0.02em',
              }}
            >
              {topTags}
            </div>

            {/* Mid Huge Text (Dark Slate Navy) */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                textAlign: 'center',
                wordBreak: 'keep-all',
                fontSize: midSize,
                fontWeight: 900,
                color: '#1E293B', // 거의 검정에 가까운 네이비 (가독성 최고)
                lineHeight: 1.15,
                letterSpacing: '-0.05em',
                marginBottom: '15px',
                padding: '0 20px',
              }}
            >
              {mid}
            </div>

            {/* Bottom Huge Text */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                textAlign: 'center',
                wordBreak: 'keep-all',
                fontSize: bottomSize,
                fontWeight: 900,
                color: bottomTextColor,
                lineHeight: 1.15,
                letterSpacing: '-0.05em',
                marginBottom: '80px',
                padding: '0 20px',
              }}
            >
              {bottom}
            </div>

            {/* Small decorative signature at the bottom */}
            <div
              style={{
                position: 'absolute',
                bottom: '50px',
                display: 'flex',
                fontSize: 24,
                color: '#94A3B8',
                fontWeight: 600,
                letterSpacing: '0.08em',
              }}
            >
              @TREND_AUTO_GENERATOR
            </div>
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
