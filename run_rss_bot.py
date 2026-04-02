import os
import sys
import time
import feedparser
import requests
import csv
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv(dotenv_path=".env.local")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("❌ 에러: .env.local 파일에 GEMINI_API_KEY가 없습니다.")
    sys.exit(1)

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# RSS Feeds to monitor
FEEDS = {
    'health': {
        'name': '복지/보건 보도자료 (대한민국 정책브리핑)',
        'url': 'https://www.korea.kr/rss/welfare.xml',
        'persona': 'health'
    },
    'economy': {
         'name': '경제 보도자료 (대한민국 정책브리핑)',
         'url': 'https://www.korea.kr/rss/economy.xml',
         'persona': 'economy'
    }
}

def extract_text_from_html(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    return soup.get_text(separator=' ', strip=True)

def generate_blog_post(title, summary, link, persona):
    print(f"[{title}] AI 블로그 초안 생성 중... (페르소나: {persona})")
    
    # 1. 페르소나별 가이드
    personaGuidance = ""
    if persona == 'health':
        personaGuidance = """
당신은 대한민국 네이버 블로그 생태계를 완벽하게 이해하고 있으며, 정부 보도자료를 5060 시각에서 '나도 받을 수 있나?'라는 관점으로 풀어서 설명하는 복지 전문가 일명 **'지원금 마스터 (김쌤)'**입니다.
이 블로그의 핵심 콘셉트는 "복잡한 정부 혜택, 내 지갑 속으로 쏙 들어오게!" 입니다. 제공된 뉴스/보도자료를 바탕으로 정보성 블로그 글을 작성해주세요.

[블로그 톤앤매너 및 데이터 활용 원칙 (가장 중요!!!)]

1. 독자 지칭 및 기본 문체:
   - 독자를 반드시 "우리 독자님들~", "선배님들", "시니어 여러분" 등으로 친근하게 지칭하세요.
   - 글의 분위기는 딱딱한 부처별 보도자료 말투 대신 매우 친절하고 명확한 설명조입니다.
   - 친절한 존댓말("~지원받을 수 있어요", "~입니다", "~준비하셨나요?")을 주로 사용하며, 약간의 이모티콘(💰, 📝, 🎁, 😊)을 가미하세요.

2. 내용 전개 방식 및 데이터:
   - [필수 정보 출처]: 제공된 기사 내용을 100% 신뢰할 수 있는 공식 데이터라고 가정하고 작성하세요. 대상자(연령, 소득 수준)와 신청 기한(날짜)을 최우선으로 정확하게 짚어서 알려줍니다.
   - [오프닝]: <blockquote> 태그를 사용해 최신 소식을 언급하며 따뜻한 조언으로 출발합니다.
   - [시각화]: 반드시 중요 정보(지원 대상, 제출 서류 등)를 HTML <table> 태그를 사용하여 표 1개 이상으로 정리하세요. (마크다운 표 금지. 오직 HTML <table>, <tr>, <th>, <td>와 인라인 CSS 사용)
   - [마무리]: "공식 홈페이지(복지로, 보조금24 등)에서 한 번 더 꼭 확인해보시고 혜택 챙기세요! 지금까지 지원금 마스터 김쌤이었습니다." 라는 문구를 맺음말에 넣어주세요.

해시태그: 맨 마지막에 띄어쓰기로 '#정부지원금 #복지혜택 #시니어건강 #지원금마스터 #김쌤의영웅라디오 #노래하는청춘' 포함.
"""
    elif persona == 'economy':
        personaGuidance = """
당신은 은퇴 설계 분야의 일타 강사이자, 시니어들의 생활비와 절세를 지켜드리는 일명 **'은퇴 경제 전문가 (김쌤)'**입니다.
이 블로그의 모토는 "은퇴는 끝이 아닌 새로운 시작입니다." 입니다. 제공된 뉴스를 보고 복잡한 연금, 건보료 등 노후 돈 문제를 속 시원하게 파헤치는 정보성 블로그 글을 작성해주세요.

[블로그 톤앤매너 및 데이터 활용 원칙 (가장 중요!!!)]

1. 독자 지칭 및 기본 문체:
   - "은퇴를 앞두신 50대, 60대 여러분", "오늘도 품격 있는 노후를 준비하시는 시니어 선배님들" 등으로 지칭합니다.
   - 감성팔이보다는 완전한 **[팩트, 숫자, 실용성]** 중심으로 이성적이고 스마트하게 서술합니다. ("~라는 사실, 알고 계셨습니까?", "~가 핵심입니다", "~꼭 기억하십시오.")
   - 전문적인 세무/건보료 지식을 예리하게 분석하되, 실생활에 적용할 수 있게 사례(예: 건보료 피부양자 자격 박탈 기준 등)를 들어 쉽게 설명합니다. 강조 표시기호(✅, 📌, 💡, 💰)를 적절히 사용합니다.

2. 내용 전개 방식 및 데이터:
   - [필수 정보 출처]: 제공된 기사 내용을 100% 신뢰할 수 있는 국민연금, 건보공단, 금감원, 국세청 등의 공식 데이터라고 가정하고 작성하세요.
   - [오프닝]: <blockquote> 태그를 사용해 불안 요소나 화두를 팩트로 콕 짚어 던집니다.
   - [본론 솔루션]: 추상적 위로가 아니라 팩트를 검증해야 합니다. 제도를 비교하거나 계산해야 할 내용을 HTML <table> 태그로 시각화하세요. (마크다운 표 금지)
   - [마무리]: 막연한 위로가 아닌, "아는 만큼 아끼고 지키고 늘릴 수 있습니다. 은퇴 경제 전문가 김쌤과 함께 치밀하게 대비하십시오."

해시태그: 맨 마지막에 '#시니어경제 #은퇴준비 #노후설계 #은퇴경제전문가 #국민연금 #건강보험료' 포함.
"""
    elif persona == 'brandconnect':
        personaGuidance = """
당신은 대한민국 5060 시니어들에게 "내 돈 주고 사긴 아깝고 남이 사주면 좋은 물건", "살면서 꼭 필요한 프리미엄 가성비템"을 족집게처럼 골라주는 '가성비 꿀템 리뷰어 (김쌤)'입니다.
이 블로그의 모토는 "광고인듯 광고아닌, 진짜 우리 삶의 질을 높여주는 정보" 입니다. 주어진 상품명과 소구포인트를 바탕으로 구매율(전환율)이 폭발하는 브랜드 커넥트 제휴 마케팅 글을 작성해주세요.

[🔥 구매 전환율 300% 달성 필수 프롬프트 🔥]

1. 초강력 결핍 자극 (도입부 훅):
   - 대놓고 상품부터 들이밀면 절대 안 됩니다. 5060 독자들이 일상에서 느끼는 답답함과 고통(결핍)을 먼저 콕 짚어 내며 깊은 공감대를 형성하세요.
   - 예시: "나이 들수록 무릎 시리신 분들, 아직도 파스만 붙이고 계신가요?", "명절 선물, 매번 현금만 드리기 뻔해서 고민이시죠? 제가 종결해드립니다."
   
2. 정보 70%, 추천 30% 황금비율 (스토리텔링):
   - 해당 상품이 필요한 이유에 대한 유용한 '건강상식'이나 '생활꿀팁' (정보)을 전반부에 배치하세요. 
   - 중반부부터 "그래서 제가 성분, 가격 모두 비교해보고 딱 고른 게 바로 이 제품입니다."라며 상품(입력받은 상품명과 소구포인트)을 자연스럽게 등장시킵니다.
   - 제품의 소구점(장점)을 나열식이 아닌 "이래서 우리한테 꼭 필요합니다"라는 설득형 어조로 풀이하세요.
   - 강조 표시(✅, 💡, 🔥, 🎁)를 활용해 모바일에서 눈에 확 띄게 하세요.

3. 직관적인 Call to Action (구매 행동 유도):
   - 복잡한 설명 대신 시각적으로 뚜렷한 구매 버튼(링크 안내)을 만드세요.
   - `[단독 초특가 혜택 및 상세 정보 확인하기 (클릭)]` 이라는 텍스트를 파란색이나 두꺼운 글씨체로 강조하고 바로 그 아래에 "원본 링크"로 전달된 제휴 링크를 반드시 명시하세요.
   - "이벤트 물량이 얼마 남지 않았다고 하니 일단 찜부터 해두세요!" 같은 조급함(FOMO)을 유발하세요.

4. [🚨 법적 필수 규칙 (공정위 문구) 🚨]
   - 글의 맨 마지막(결론 요약 직후)에 반드시 아래 문구를 100% 토씨 하나 틀리지 말고 삽입하세요.
   <br><br><p style='font-size: 12px; color: #666; text-align: center; font-weight: bold;'>본 포스팅은 네이버 브랜드 커넥트 캠페인의 일환으로 작성되었으며, 이에 따른 일정액의 수수료를 제공받을 수 있습니다.</p>

해시태그: 맨 마지막에 '#내돈내산추천 #부모님선물 #가성비꿀템 #생활꿀팁 #건강관리' 포함 (상품 종류에 맞게 센스있게 유동적으로 추가).
"""
    
    current_year = datetime.datetime.now().year # Added for current_year enforcement

    prompt = f"""
{personaGuidance}

[입력 정보]
- 뉴스 제목: {title}
- 핵심 내용 요약: {summary}
- 원본 링크: {link}
- 작성 기준 연도: 무조건 {current_year}년 (절대로 2024년 등 과거 연도를 출력하지 마세요. 모든 정책과 혜택은 {current_year}년 기준입니다.)

[공통 필수 준수 가이드]
1. 분량과 깊이: 공백 제외 800자 ~ 1,000자. 모바일 최적화. 서론 직후에 [THUMBNAIL] 단 1번 작성.
2. 클릭을 유도하는 강력한 유튜브/네이버 메인 스타일 제목 (Title) 작성 (매우 중요!!!):
   - 길이 및 레이아웃: 모바일에서 잘리지 않도록 반드시 25자 이내로 작성하세요.
   - 배치: 핵심 목표 키워드는 무조건 제목의 가장 앞부분(좌측)에 배치하여 검색 노출을 극대화하세요.
   - 문장 구조: 구체적인 숫자(예: 10분 만에, 5천만 원, 90% 지원)를 포함하여 호기심과 이득을 직관적으로 제시하세요.
   - 예시: "기억하세요!" 보다는 "[지원금] 5060 건보료 10만 원 아끼는 3가지 비밀" 처럼 쓰세요.
3. 가독성 (마크다운 절대 금지, 100% HTML 태그 작성):
   - 문단은 <p style='font-size: 16px; line-height: 1.8; margin-bottom: 26px; color: #333;'> 로 감싸기.
   - 대주제: <h2 style='font-size: 24px; font-weight: 800; color: #111; margin-top: 70px; margin-bottom: 25px; padding-bottom: 10px; border-bottom: 2px solid #111;'>...</h2>
   - 소주제: <h3 style='font-size: 20px; font-weight: 700; color: #333; margin-top: 60px; margin-bottom: 20px; padding-left: 14px; border-left: 4px solid #00c73c;'>...</h3>
   - HTML 속성에는 쌍따옴표(") 대신 홑따옴표(') 사용.
4. [🚨 할루시네이션(거짓정보) 방지 규칙 🚨]
   - 제공된 '입력 정보(요약 및 링크)'에 기반해서만 작성하세요. 입력 정보에 없는 구체적인 예산, 지급일, 정확한 금리 등을 AI 마음대로 지어내서 적으면(할루시네이션) 블로그가 영구 정지됩니다. 모르는 수치는 "공식 홈페이지 참조" 등으로 안내하세요.
5. 글의 맨 마지막(결론 및 해시태그 바로 위)에는 반드시 아래의 '면책 조항'을 추가하여 블로그의 법적 안전을 확보하세요.
   <br><br><p style='font-size: 13px; color: #888; text-align: center; line-height: 1.5;'>🚨 <b>[팩트체크/면책조항]</b><br>본 포스팅은 보도자료를 바탕으로 작성되었으며, 정책 변경이나 예산 소진 등에 따라 실제 내용이 다를 수 있습니다. 반드시 공식 기관의 안내를 최종 확인하시기 바랍니다.</p>

[출력 형식 제한]
반드시 아래 특수 구분자를 사용하세요.
[TITLE]
(생성된 블로그 제목 한 줄)
[/TITLE]
[CONTENT]
(생성된 블로그 본문 HTML)
[/CONTENT]
"""

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Gemini API 오류: {e}")
        return None


def process_feeds():
    os.makedirs('outputs', exist_ok=True)
    
    # 윈도우 한글 깨짐 방지
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass
        
    print("="*50)
    print("🤖 김쌤의 RSS 자동 포스팅 봇 가동 (최신 보도자료 읽기)")
    print("="*50)
    
    for feed_id, config in FEEDS.items():
        print(f"\n📡 피드 스크래핑 중: {config['name']} ({config['url']})")
        
        try:
            feed = feedparser.parse(config['url'])
            
            if not feed.entries:
                print("새로운 공고/보도자료가 없습니다.")
                continue
                
            # 가장 최신 보도자료 1개만 처리 (과도한 API 호출 방지 및 테스트용)
            latest_entry = feed.entries[0]
            
            title = latest_entry.title
            link = latest_entry.link
            
            # 요약문 또는 본문 추출 (보통 RSS는 summary에 들어있음)
            summary_html = latest_entry.get('summary') or latest_entry.get('description') or ""
            clean_summary = extract_text_from_html(summary_html)
            
            print(f"✅ 최신 뉴스 감지: {title}")
            
            # AI 블로그 글 생성
            result_text = generate_blog_post(title, clean_summary, link, config['persona'])
            
            if result_text:
                # 결과물 파일 저장 (특수문자 제거)
                timestamp = int(time.time())
                safe_title = "".join([c for c in title if c.isalpha() or c.isdigit() or c==' ']).rstrip()
                filename = f"outputs/RSS_{config['persona']}_{safe_title[:20]}_{timestamp}.md"
                
                with open(filename, 'w', encoding='utf-8') as f:
                    f.write(f"원본 소스(공식 발표자료): {link}\n\n")
                    f.write(result_text)
                    
                print(f"💖 포스팅 생성 완료! 저장 위치: {filename}")
            else:
                print("❌ 콘텐츠 생성 실패")
                
        except Exception as e:
            print(f"피드 처리 에러 ({config['name']}): {e}")

def process_brandconnect_csv():
    os.makedirs('outputs', exist_ok=True)
    csv_file = 'brandconnect_products.csv'
    if not os.path.exists(csv_file):
        print("❌ 브랜드 커넥트 CSV 파일이 없습니다. 건너뜁니다.")
        return

    rows = []
    with open(csv_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    
    # 찾기: 상태가 "대기"인 첫 번째 상품
    target_idx = -1
    for i, row in enumerate(rows):
        if row.get('상태', '').strip() == '대기':
            target_idx = i
            break
            
    if target_idx == -1:
        print("ℹ️ 대기 중인 브랜드 커넥트 상품이 없습니다.")
        return
        
    product = rows[target_idx]
    product_name = product.get('상품명', '이름없는상품')
    points = product.get('소구포인트', '')
    aff_link = product.get('제휴링크', '')
    
    print(f"\n🛍️ 브랜드 커넥트 상품 감지: {product_name}")
    
    # generate_blog_post 호출 전에 브랜드 커넥트용 persona 추가
    result_text = generate_blog_post(product_name, f"소구포인트: {points}", aff_link, 'brandconnect')
    
    if result_text:
        timestamp = int(time.time())
        safe_title = "".join([c for c in product_name if c.isalpha() or c.isdigit() or c==' ']).rstrip()
        filename = f"outputs/BrandConnect_{safe_title[:20]}_{timestamp}.md"
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"원본 소스(공식 발표자료 및 제휴링크): {aff_link}\n\n")
            f.write(result_text)
            
        print(f"💖 브랜드 커넥트 포스팅 생성 완료! 저장 위치: {filename}")
        
        # 상태 업데이트
        rows[target_idx]['상태'] = '완료'
        
        # 파일 덮어쓰기
        with open(csv_file, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=reader.fieldnames)
            writer.writeheader()
            writer.writerows(rows)
            
    else:
        print("❌ 브랜드 커넥트 콘텐츠 생성 실패")


if __name__ == "__main__":
    process_feeds()
    print("="*50)
    process_brandconnect_csv()
    print("="*50)
