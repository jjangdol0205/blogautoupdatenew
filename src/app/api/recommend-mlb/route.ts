import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({});

export const maxDuration = 60; // 넉넉하게 60초 허용

export async function POST(req: Request) {
  try {
    const { targetDate } = await req.json();

    let fetchDate = targetDate;
    if (!fetchDate) {
      const today = new Date();
      today.setDate(today.getDate() - 1);
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      fetchDate = `${yyyy}-${mm}-${dd}`;
    }

    const mlbApiUrl = `https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&date=${fetchDate}`;
    const mlbRes = await fetch(mlbApiUrl);
    
    if (!mlbRes.ok) throw new Error("MLB 경기 스케줄을 가져오는데 실패했습니다.");
    
    const mlbData = await mlbRes.json();
    const games = mlbData.dates?.[0]?.games || [];

    if (games.length === 0) {
        return NextResponse.json({ error: `${fetchDate} 날짜에 대기 중이거나 완료된 경기가 없습니다.` }, { status: 404 });
    }

    // 경기 스냅샷 요약 준비
    let snapshot = `[${fetchDate} 기준 MLB 스코어보드]\n`;
    games.forEach((g: any, i: number) => {
        const away = g.teams?.away?.team?.name || "어웨이";
        const awayScore = g.teams?.away?.score ?? 0;
        const home = g.teams?.home?.team?.name || "홈";
        const homeScore = g.teams?.home?.score ?? 0;
        const status = g.status?.detailedState || "상태불명";
        snapshot += `${i+1}. [${status}] ${away} (${awayScore}) vs ${home} (${homeScore})\n`;
    });

    const prompt = `당신은 날카로운 안목을 가진 메이저리그 스포츠 편집장입니다.
다음은 ${fetchDate}에 열린 메이저리그 모든 경기의 요약 스코어보드입니다.

${snapshot}

위 결과들을 살펴보시고, 블로그 기사로 다루었을 때 독자 반응(조회수)이 가장 폭발적일 '최고 명승부' 또는 '인기팀 이슈' 경기 딱 3~4개를 신중하게 골라주세요.
1점 차 투수전이나 피말리는 타격전, 혹은 LA 다저스나 양키스 같은 글로벌 최고 인기팀의 성적에 우선순위를 두세요.

결과는 반드시 아래 JSON 배열 형식으로만 응답해야 합니다. 설명을 덧붙이거나 마크다운 기호(\`\`\`json)를 포함하지 마세요.
[
  { 
    "targetTeam": "분석 대상으로 넘길 팀 이름 영문명 (예: Dodgers, Yankees, Padres 등 찾기 쉽도록)",
    "koreanTeamName": "다저스",
    "title": "클릭하고 싶게 만드는 도발적인 한국어 헤드라인 (예: 9회말 기적! 다저스의 짜릿한 끝내기 역전승)",
    "reason": "왜 이 경기가 오늘 가장 흥미로운지 전문가의 시선으로 분석한 1~2문장의 핵심 이유"
  }
]
`;

    const transRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.3, responseMimeType: "application/json" },
    });
    
    const text = transRes.text?.trim() || "[]";
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let recommendations = [];
    try {
        recommendations = JSON.parse(cleaned);
    } catch (e) {
        console.error("Failed to parse recommendations:", e);
        // 강력한 폴백을 설정
        const dodgersGame = games.find((g: any) => g.teams.home.team.name.includes("Dodgers") || g.teams.away.team.name.includes("Dodgers"));
        if(dodgersGame) {
           recommendations.push({
               targetTeam: "Dodgers", koreanTeamName: "다저스", title: "오늘의 다저스 경기 요약 (오류 대체 분석)", reason: "추천 엔진 복구 중. 수동으로 다저스 경기를 지정했습니다."
           });
        }
    }

    return NextResponse.json({ recommendations });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
