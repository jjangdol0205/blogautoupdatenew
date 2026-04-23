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

    let bgGradient = 'linear-gradient(to bottom right, #1E1B4B, #4F46E5)';
    let glowOrb1 = '#818CF8';
    let glowOrb2 = '#C084FC';
    let badgeColor = '#4338CA';
    let badgeBg = 'rgba(67, 56, 202, 0.1)';
    let bottomTextColor = '#8B5CF6';

    // Site 1
    if (style === 'site1_bot1' || style === 'blog1') {
      bgGradient = 'linear-gradient(to bottom right, #1E1B4B, #4F46E5)'; // Deep Indigo/Purple
      glowOrb1 = '#818CF8'; glowOrb2 = '#C084FC'; badgeColor = '#4338CA'; badgeBg = 'rgba(67, 56, 202, 0.1)'; bottomTextColor = '#8B5CF6';
    } else if (style === 'site1_bot2' || style === 'blog2') {
      bgGradient = 'linear-gradient(to bottom right, #0F172A, #06B6D4)'; // Tech Midnight/Cyan
      glowOrb1 = '#22D3EE'; glowOrb2 = '#818CF8'; badgeColor = '#0891B2'; badgeBg = 'rgba(8, 145, 178, 0.1)'; bottomTextColor = '#06B6D4';
    } else if (style === 'site1_bot3' || style === 'blog3') {
      bgGradient = 'linear-gradient(to right, #BE123C, #F43F5E)'; // Vibrant Coral/Rose
      glowOrb1 = '#FDA4AF'; glowOrb2 = '#FB7185'; badgeColor = '#E11D48'; badgeBg = 'rgba(225, 29, 72, 0.1)'; bottomTextColor = '#F43F5E';
    } 
    // Site 2
    else if (style === 'site2_bot1') {
      bgGradient = 'linear-gradient(to bottom right, #064E3B, #10B981)'; // Emerald/Forest
      glowOrb1 = '#34D399'; glowOrb2 = '#6EE7B7'; badgeColor = '#047857'; badgeBg = 'rgba(4, 120, 87, 0.1)'; bottomTextColor = '#10B981';
    } else if (style === 'site2_bot2') {
      bgGradient = 'linear-gradient(to bottom right, #7C2D12, #F59E0B)'; // Sunset Orange/Gold
      glowOrb1 = '#FCD34D'; glowOrb2 = '#FBBF24'; badgeColor = '#B45309'; badgeBg = 'rgba(180, 83, 9, 0.1)'; bottomTextColor = '#F59E0B';
    } else if (style === 'site2_bot3') {
      bgGradient = 'linear-gradient(to bottom right, #1E293B, #F472B6)'; // Slate/Neon Pink
      glowOrb1 = '#FBCFE8'; glowOrb2 = '#F9A8D4'; badgeColor = '#DB2777'; badgeBg = 'rgba(219, 39, 119, 0.1)'; bottomTextColor = '#F472B6';
    }
    // Site 3
    else if (style === 'site3_bot1') {
      bgGradient = 'linear-gradient(to bottom right, #172554, #3B82F6)'; // Royal Blue/Sky
      glowOrb1 = '#93C5FD'; glowOrb2 = '#60A5FA'; badgeColor = '#1D4ED8'; badgeBg = 'rgba(29, 78, 216, 0.1)'; bottomTextColor = '#3B82F6';
    } else if (style === 'site3_bot2') {
      bgGradient = 'linear-gradient(to bottom right, #4A044E, #D946EF)'; // Deep Magenta/Peach
      glowOrb1 = '#F0ABFC'; glowOrb2 = '#E879F9'; badgeColor = '#A21CAF'; badgeBg = 'rgba(162, 28, 175, 0.1)'; bottomTextColor = '#D946EF';
    } else if (style === 'site3_bot3') {
      bgGradient = 'linear-gradient(to bottom right, #000000, #451A03)'; // Monochrome Black/Gold
      glowOrb1 = '#FDE047'; glowOrb2 = '#FEF08A'; badgeColor = '#854D0E'; badgeBg = 'rgba(133, 77, 14, 0.1)'; bottomTextColor = '#CA8A04';
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
