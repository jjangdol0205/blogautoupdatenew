import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({});

export const maxDuration = 60; // Vercel 서버리스 함수 타임아웃 최대 연장

export async function POST(req: Request) {
  try {
    const { targetDate, deviceType = 'desktop', targetTeam } = await req.json();

    // 1. 가져올 대상 날짜 세팅 (파라미터가 없으면 '어제' 날짜로 자동 설정)
    let fetchDate = targetDate;
    if (!fetchDate) {
      const today = new Date();
      // 한국 시간 기준으로 서버가 돌아갈 수 있으므로 안전하게 하루 뺌 (미국 경기 시간 고려)
      today.setDate(today.getDate() - 1);
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      fetchDate = `${yyyy}-${mm}-${dd}`; // 형식: YYYY-MM-DD
    }

    // 2. MLB Stats API 호출하여 해당 날짜의 전체 경기 데이터 페치
    const mlbApiUrl = `https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&date=${fetchDate}`;
    const mlbRes = await fetch(mlbApiUrl);
    
    if (!mlbRes.ok) {
        throw new Error("MLB 경기 결과를 가져오는데 실패했습니다.");
    }
    
    const mlbData = await mlbRes.json();
    const games = mlbData.dates?.[0]?.games || [];

    if (games.length === 0) {
        return NextResponse.json({ error: `${fetchDate} 날짜에 예정된 MLB 경기가 없거나 아직 결과가 나오지 않았습니다.` }, { status: 404 });
    }

    // 3. 단일 경기 선정 로직 및 Boxscore 파싱
    let selectedGame = null;
    let focusTeamName = targetTeam || "";

    if (focusTeamName) {
        const teamMap: any = { 
            "다저스":"Dodgers", "양키스":"Yankees", "볼티모어":"Orioles", "보스턴":"Red Sox",
            "화이트삭스":"White Sox", "가디언스":"Guardians", "디트로이트":"Tigers", "휴스턴":"Astros",
            "캔자스시티":"Royals", "에인절스":"Angels", "미네소타":"Twins", "오클랜드":"Athletics",
            "시애틀":"Mariners", "탬파베이":"Rays", "텍사스":"Rangers", "토론토":"Blue Jays",
            "애리조나":"Diamondbacks", "애틀랜타":"Braves", "컵스":"Cubs", "신시내티":"Reds",
            "콜로라도":"Rockies", "마이애미":"Marlins", "밀워키":"Brewers", "메츠":"Mets",
            "필라델피아":"Phillies", "피츠버그":"Pirates", "샌디에이고":"Padres", "파드리스":"Padres",
            "자이언츠":"Giants", "세인트루이스":"Cardinals", "카디널스":"Cardinals",
            "워싱턴":"Nationals", "내셔널스":"Nationals",
            "김하성":"Padres", "이정후":"Giants", "오타니":"Dodgers", "배지환":"Pirates"
        };
        const searchKeyword = teamMap[focusTeamName] || focusTeamName;
        selectedGame = games.find((g: any) => 
            g.teams.away.team.name.toLowerCase().includes(searchKeyword.toLowerCase()) || 
            g.teams.home.team.name.toLowerCase().includes(searchKeyword.toLowerCase())
        );
    }

    if (!selectedGame) selectedGame = games.find((g: any) => g.teams.away.team.name.includes("Dodgers") || g.teams.home.team.name.includes("Dodgers"));
    if (!selectedGame) selectedGame = games.find((g: any) => g.teams.away.team.name.includes("Yankees") || g.teams.home.team.name.includes("Yankees"));
    if (!selectedGame) selectedGame = games[0]; // 최종 폴백

    const gamePk = selectedGame.gamePk;

    // Boxscore 심층 데이터 호출
    const boxRes = await fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`);
    const boxData = await boxRes.json();

    const awayTeam = selectedGame.teams?.away?.team?.name || "어웨이팀";
    const homeTeam = selectedGame.teams?.home?.team?.name || "홈팀";
    const status = selectedGame.status?.detailedState || "완료";

    let gamesSummary = `[선택된 주요 빅매치 집중 분석 데이터]\n`;
    gamesSummary += `경기 상태: ${status}\n`;
    gamesSummary += `최종 스코어: ${awayTeam} ${selectedGame.teams.away.score} - ${selectedGame.teams.home.score} ${homeTeam}\n\n`;
    
    if (selectedGame.decisions) {
        const winner = selectedGame.decisions.winner?.fullName;
        const loser = selectedGame.decisions.loser?.fullName;
        const save = selectedGame.decisions.save?.fullName;
        gamesSummary += `특이사항: ${winner ? `승리투수(${winner}) ` : ''}${loser ? `패전투수(${loser}) ` : ''}${save ? `세이브(${save})` : ''}\n\n`;
    }

    gamesSummary += `--- 팀별 주요 선수 활약상 (박스스코어) ---\n`;
    ['away', 'home'].forEach(t => {
        const teamBox = boxData.teams[t];
        const battersObj = teamBox.players;
        gamesSummary += `\n[${teamBox.team.name}]\n`;
        
        Object.values(battersObj).forEach((p: any) => {
            const stats = p.stats?.batting;
            if (stats && (stats.homeRuns > 0 || stats.rbi > 0 || stats.hits > 1)) {
                gamesSummary += `타자 ${p.person.fullName}: ${stats.hits}안타, ${stats.homeRuns}홈런, ${stats.rbi}타점\n`;
            }
            const pStats = p.stats?.pitching;
            if (pStats && parseFloat(pStats.inningsPitched) > 0) {
                gamesSummary += `투수 ${p.person.fullName}: ${pStats.inningsPitched} 이닝, ${pStats.runs} 자책점, ${pStats.strikeOuts} 탈삼진\n`;
            }
        });
    });

    // 4. Gemini 프롬프트 작성 (기자/칼럼니스트 모드)
    const personaGuidance = `당신은 메이저리그 베테랑 현장 취재 기자이자 인기 스포츠 칼럼니스트입니다.
독자는 20~40대 야구팬들이며, 무미건조한 요약이 아니라 선수 하나하나의 활약상(홈런, 탈삼진)과 승부처를 재밌고 긴장감 있게 묘사하는 문체(~해요, ~입니다, ~폭발했네요!)를 즐겨 씁니다.

[작성 지침 - 중요!]
너무 구구절절 길어지지 않게 다른 일반적인 블로그 정보성 포스팅 수준(약 1000자~1500자 내외)으로 시원하게 길이를 맞추되, 아래 4가지 단락으로 확실하게 구조화하여 **심층 분석의 깊이**를 더해주세요. (단순히 2문단짜리 짧은 글은 절대 금지이며, 각 파트마다 전문 기자의 시선이 담겨야 합니다)

[필수 작성 구조]
1. [경기 도입부]: 오늘 매치의 기대감이나 중요성, 그리고 전체적인 승부의 흐름(누가 끝내 기선제압을 했는지)을 현장감 있게 서술하세요. (친절한 인삿말 포함)
2. [결정적 승부처 해부]: 가장 짜릿했던 이닝이나 터져나온 안타/홈런 순간, 혹은 투수의 엄청난 위기 탈출 상황을 소설이나 중계방송처럼 긴장감 넘치게 해설하세요.
3. [투타 수훈선수 열전]: 제공된 박스스코어 데이터를 기반으로, 오늘 가장 눈부셨던 투수와 타자 1~2명의 기록(이닝, 자책점, 안타수, 타점, 홈런 등 구체적 수치)을 직접 언급하며 칭찬하고 집중 조명하세요.
4. [기자 총평 및 전망]: 경기 관전 소감과 앞으로 각 팀의 행보에 대한 재미있는 기대평으로 마무리하세요.

네이버 블로그 로직에 맞도록 첫 줄에 "안녕하세요, 야구팬 여러분! 오늘의 화제집중 빅매치 소식 전해드립니다." 식의 친절한 인삿말을 반드시 포함하고, 해시태그 규칙(맨 아래에 #MLB #메이저리그 #야구분석 #${awayTeam.replace(/\s/g,'')} #${homeTeam.replace(/\s/g,'')} 등 연관 해시태그 스페이스 구분 5~7개)을 꼭 지켜주세요.
`;

    let visualGuidance = "";
    if (deviceType === 'mobile') {
        visualGuidance = `
[모바일 화면 최적화: 가독성 극대화 및 띄어쓰기 원칙]
- 마크다운 기호(*, #, - 등)는 네이버 블로그 앱 피드에서 깨지므로 **단락 앞에 이모지(⚾, 🔥 등)**를 사용하여 강조하세요.
- 전체 본문을 **오직 <p>, <br>, <b>, <span style="color:색상">** 태그만으로 작성하세요. <h2>, <h3>, <table> 등은 일절 금지됩니다. (나머지 경기 요약도 텍스트 리스트로만 작성)
- 소제목은 위/아래로 딱 한 칸 줄바꿈(<br>)만 허용합니다. <br><br> 같은 두 줄 띄어쓰기 절대 금지.
- 인사말이 끝나는 서론 직후에 반드시 [THUMBNAIL] 이라는 예약어를 단 1번 작성하세요.
- 핵심 포인트 색상 강조: 주목해야 할 득점 순간이나 주요 선수 이름에는 <span style="color: #00c73c;">...</span> 로 눈에 띄게 강조하세요.
`;
    } else {
        visualGuidance = `
[PC 웹 화면 최적화: 세련된 HTML 구조]
- 본문의 모든 일반 텍스트는 <p style='font-size: 16px; line-height: 1.8; margin-bottom: 26px; color: #333; letter-spacing: -0.5px;'>...</p> 태그 안에 작성하세요. 마크다운은 절대 금지입니다.
- 인사말이 끝나는 서론 직후에 반드시 [THUMBNAIL] 예약어를 삽입하세요.
- 하단 나머지 경기 요약 부분은 반드시 HTML <table> <tr> <th> <td> 요소로 깨끗한 표를 만드세요 (border: 1px solid #ddd; 적용).
- 대주제 소제목: <h2 style='font-size: 24px; font-weight: 800; color: #111; margin-top: 50px; margin-bottom: 25px; padding-bottom: 10px; border-bottom: 2px solid #111;'>...</h2>
- HTML 태그에 속성을 넣을 때는 큰따옴표(") 대신 반.드.시 홑따옴표(')를 사용하세요.
`;
    }

    const prompt = `
${personaGuidance}

[실제 수집된 ${fetchDate} 경기 결과 원본 데이터]
${gamesSummary}

${visualGuidance}

[출력 형식 제한]
반드시 아래의 특수 구분자를 사용하여 제목과 본문을 나누어 작성하세요. JSON 형식은 절대 사용하지 마세요.
[TITLE]
(오늘의 박진감, 주요 팀 스토리가 반영된 클릭을 유발하는 어그로성 제목 1줄. 예: "다저스 대역전극! 오타니의 폭주로 끝난 오늘의 MLB 명승부 요약")
[/TITLE]
[CONTENT]
${deviceType === 'mobile' ? "(생성된 블로그 본문을 <p>, <br>, <b> 태그만을 엄격하게 사용한 형태로 작성)" : "(생성된 블로그 본문을 화려한 HTML 태그 및 CSS가 포함된 텍스트로 작성)"}
[/CONTENT]
`;

    const streamRes = await ai.models.generateContentStream({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    });

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    // 5. 오픈그래프 썸네일용 파라미터 생성
    let thumbnailHtml = "";
    try {
      const topParams = encodeURIComponent('#메이저리그 #MLB리뷰');
      const midParams = encodeURIComponent('오늘의 MLB');
      const bottomParams = encodeURIComponent(fetchDate + ' 경기 총정리');
      
      const ogUrl = `${baseUrl}/api/og?top=${topParams}&mid=${midParams}&bottom=${bottomParams}&ext=.png`;

      thumbnailHtml = `<div style="text-align: center; margin-bottom: 24px;">
        <img src="${ogUrl}" alt="MLB 썸네일" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);" />
      </div>`;
    } catch (imgError) {
      console.error("OG Thumbnail Generation Failed:", imgError);
    }

    // 6. SSE 스트림 리스폰스 리턴
    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const metaMsg = JSON.stringify({ type: 'meta', thumbnailHtml, images: [] });
          controller.enqueue(encoder.encode(`data: ${metaMsg}\n\n`));

          for await (const chunk of streamRes) {
            if (chunk.text) {
              const textMsg = JSON.stringify({ type: 'text', text: chunk.text });
              controller.enqueue(encoder.encode(`data: ${textMsg}\n\n`));
            }
          }
          controller.close();
        } catch (e) {
          console.error("MLB Stream Error:", e);
          controller.error(e);
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error: unknown) {
    console.error("MLB API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate MLB post" },
      { status: 500 }
    );
  }
}
