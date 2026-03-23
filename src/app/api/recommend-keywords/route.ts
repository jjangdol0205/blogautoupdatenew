import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { keyword } = await req.json();

    if (!keyword || keyword.trim() === '') {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
    }

    const customerId = process.env.NAVER_AD_CUSTOMER_ID;
    const accessLicense = process.env.NAVER_AD_ACCESS_LICENSE;
    const secretKey = process.env.NAVER_AD_SECRET_KEY;

    if (!customerId || !accessLicense || !secretKey) {
      return NextResponse.json(
        { error: "네이버 검색광고 API 키가 설정되지 않았습니다. .env.local 파일에 NAVER_AD_CUSTOMER_ID, NAVER_AD_ACCESS_LICENSE, NAVER_AD_SECRET_KEY를 추가해주세요." },
        { status: 500 }
      );
    }

    const timestamp = Date.now().toString();
    const method = "GET";
    const path = "/keywordstool";

    const message = `${timestamp}.${method}.${path}`;
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(message)
      .digest("base64");

    // hintKeywords accepts up to 5 comma-separated keywords, but we just pass the first word of user input to get broader results
    const seedKeyword = keyword.trim().split(' ')[0];
    const apiUrl = `https://api.naver.com${path}?hintKeywords=${encodeURIComponent(seedKeyword)}&showDetail=1`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "X-Timestamp": timestamp,
        "X-API-KEY": accessLicense,
        "X-Customer": customerId,
        "X-Signature": signature,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Naver Ad API Error:", response.status, errText);
      return NextResponse.json(
        { error: `네이버 검색광고 API 호출 실패: ${response.status}`, details: errText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    const keywordList = data.keywordList || [];
    
    // Parse numeric counts (Naver sometimes returns "< 10" for low volume)
    const parseCnt = (val: any) => {
        if (typeof val === 'string' && val.includes('<')) return 5;
        return parseInt(val) || 0;
    };

    const mappedKeywords = keywordList.map((k: any) => {
        const pc = parseCnt(k.monthlyPcQcCnt);
        const mobile = parseCnt(k.monthlyMobileQcCnt);
        const total = pc + mobile;
        return {
            keyword: k.relKeyword,
            monthlyTotalCnt: total,
            pcCnt: pc,
            mobileCnt: mobile,
        };
    });

    // [니치 트래픽 고도화] 진짜 '황금 틈새(롱테일) 키워드'만 강제 필터링
    // 조건 1: 검색량은 200 ~ 15,000 사이 (초대형 인플루언서가 노리지 않는 빈집 타겟)
    // 조건 2: 키워드 길이가 6글자 이상 (장외주식 -> X, 장외주식거래방법 -> O)
    const strictNicheKeywords = mappedKeywords.filter((k: any) => {
      const isNicheTraffic = k.monthlyTotalCnt >= 200 && k.monthlyTotalCnt <= 15000;
      const isLongTail = k.keyword.length >= 6; // 구체적이고 긴 단어 조합만 살아남음
      return isNicheTraffic && isLongTail;
    });

    // 1순위: 진짜 롱테일 + 빈집 키워드
    let targetArray = strictNicheKeywords;

    // 만약 너무 엄격해서 12개가 안 나오면, 검색량 조건만 유지하고 길이는 4글자 이상으로 완화
    if (targetArray.length < 12) {
       targetArray = mappedKeywords.filter((k: any) => 
         k.monthlyTotalCnt >= 200 && k.monthlyTotalCnt <= 30000 && k.keyword.length >= 4
       );
    }

    // 그래도 안 나오면 전체 풀 사용
    if (targetArray.length < 12) {
       targetArray = mappedKeywords;
    }

    // [랜덤성 부여] 조회할 때마다 새로운 키워드가 나타나도록 무작위 셔플 후 상위 12개 추출
    const shuffled = targetArray.sort(() => 0.5 - Math.random());

    // Return top 12 keywords
    return NextResponse.json({ recommendations: shuffled.slice(0, 12) });
  } catch (error: any) {
    console.error("Recommend Keywords API Error:", error);
    return NextResponse.json(
      { error: error?.message || "연관 키워드를 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
