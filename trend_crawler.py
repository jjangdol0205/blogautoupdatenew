import os
import time
import requests
from bs4 import BeautifulSoup
import schedule
import pandas as pd
import google.generativeai as genai
from dotenv import load_dotenv
from datetime import datetime
import subprocess

# .env.local 파일에서 환경변수 로드 (로컬 환경인 경우)
if not os.getenv('GITHUB_ACTIONS_ENV'):
    load_dotenv('.env.local')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

if not GEMINI_API_KEY:
    print("오류: GEMINI_API_KEY가 없습니다. (.env.local 또는 깃허브 시크릿을 확인하세요)")
    exit(1)

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# 저장할 CSV 파일 경로
CSV_FILE = 'collected_trends.csv'

# 다음 뉴스 수집
def fetch_daum_news():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    url = 'https://news.daum.net/'
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        headlines = []
        for a in soup.find_all('a'):
            href = a.get('href', '')
            title = a.text.strip()
            if 'v.daum.net/v/' in href and title and title not in headlines:
                headlines.append(title)
        
        # 중복 제거 및 리스트 반환 (최대 50개)
        unique_headlines = list(dict.fromkeys(headlines))[:50]
        return unique_headlines
    except Exception as e:
        print(f"다음 뉴스 수집 오류: {e}")
        return []

# 네이트판 수집
def fetch_nate_pann():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    url = 'https://pann.nate.com/talk/ranking'
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        stories = []
        # 네이트판 랭킹 제목 추출
        for a in soup.select('dl dt a'):
            title = a.text.strip()
            if title:
                stories.append(title)
                
        # 중복 제거 및 상위 20개 추출
        unique_stories = list(dict.fromkeys(stories))[:20]
        return unique_stories
    except Exception as e:
        print(f"네이트판 수집 오류: {e}")
        return []

# 과거 키워드 로드 (최근 50개)
def get_past_keywords():
    try:
        if os.path.exists(CSV_FILE):
            df = pd.read_csv(CSV_FILE)
            if 'title' in df.columns:
                return df['title'].tail(50).tolist()
    except Exception as e:
        print(f"과거 키워드 로드 실패: {e}")
    return []

# AI 자가 학습 및 전략 수립 (Agonize)
def generate_daily_breakthrough_strategy(past_keywords):
    if not past_keywords:
        return "과거 데이터가 부족하여 기본 9대 카테고리(정치, 복지, 예적금, 연금, 부동산, 세금, 이슈 등)를 유지합니다."
        
    prompt = f"""
    당신은 블로그 트렌드 전략가입니다.
    현재 블로그 조회수가 정체되어 있습니다. 아래는 최근 생성했던 50개의 블로그 키워드 목록입니다.
    
    [최근 50개 키워드 목록]
    {chr(10).join(past_keywords)}
    
    위 키워드들이 왜 독자들의 클릭을 유도하지 못했는지(뻔한 주제, 후킹 부족 등) 뼈아프게 반성(Agonize)하고,
    오늘 조회수 1만뷰를 터트리기 위해 완전히 새롭고 시의성 있는 "블루오션 카테고리 전략 3가지"를 제안해 주세요.
    """
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"전략 수립 중 오류 발생: {e}")
        return "기본 9대 카테고리(정치, 복지, 예적금, 연금, 부동산, 세금, 이슈 등)를 유지합니다."

# Gemini로 황금 키워드 추출 (동적 전략 반영)
def extract_golden_keywords_with_gemini(daum_headlines, nate_stories, strategy):
    all_issues = []
    if daum_headlines:
        all_issues.append("[다음 뉴스 랭킹]")
        all_issues.extend([f"- {h}" for h in daum_headlines])
    if nate_stories:
        all_issues.append("\n[네이트판 인기 스토리]")
        all_issues.extend([f"- {h}" for h in nate_stories])
        
    if not all_issues:
        return []
        
    prompt = f"""
    당신은 대한민국 상위 0.1% 조회수를 이끌어내는 블로그 트렌드 마스터입니다.
    아래는 현재 인터넷에서 가장 뜨거운 실시간 뉴스 및 커뮤니티 썰 목록입니다.
    이 목록을 분석하여, 블로그 포스팅 시 '조회수 1만 뷰 이상'을 달성할 수 있는 "고부가가치 황금 키워드/후킹 제목"을 추출해 주셔야 합니다.
    
    [오늘의 맞춤형 돌파 전략 (AI 자가 반성 기반)]
    {strategy}
    
    위 전략을 바탕으로 기존의 뻔한 주제를 버리고, 사람들의 공포(FOMO), 호기심, 돈, 도파민을 강력하게 자극하는 롱테일 키워드를 기획하세요.
    
    [🚨 치명적 주의사항 (가짜 뉴스 생성 절대 금지) 🚨]
    - 원본 뉴스 제목에 없는 '없는 사실, 조작된 수치, 거짓된 혜택'을 절대 지어내지 마세요.
    - 자극적인 제목을 만들더라도 100% 팩트를 기반으로 해야 하며, 독자를 기만하는 허위 사실을 생성하면 안 됩니다.
    
    [출력 형식]
    돌파 전략에 맞춰 파급력이 클 것 같은 "정제된 키워드(또는 제목)"를 10~15개 정도 뽑아주세요.
    반드시 다음과 같이 "정제된 키워드 | 카테고리명" 형식으로 한 줄씩 출력해주세요. 다른 부연 설명은 절대 적지 마세요.
    (예시: 2026 숨은 정부지원금, 내가 받을 수 있는 혜택 확인하기 | 보조금/지원금/복지)
    
    [실시간 소스 데이터]
    """
    prompt += "\n".join(all_issues)
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        results = []
        for line in text.split('\n'):
            if '|' in line:
                parts = line.split('|', 1)
                title = parts[0].replace('- ', '').strip()
                category = parts[1].strip()
                results.append({'title': title, 'category': category})
        return results
    except Exception as e:
        print(f"Gemini API 오류: {e}")
        return []

def run_crawler():
    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 크롤링 및 키워드 정제 시작...")
    
    new_data = []
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M')
    
    print("다음 뉴스 수집 중...")
    daum_headlines = fetch_daum_news()
    print(f"수집된 다음 헤드라인 수: {len(daum_headlines)}")
    
    print("네이트판 인기 스토리 수집 중...")
    nate_stories = fetch_nate_pann()
    print(f"수집된 네이트판 스토리 수: {len(nate_stories)}")
    
    if daum_headlines or nate_stories:
        print("\n[AI 조회수 정체 돌파 전략 수립 중 (Agonizing)...]")
        past_keywords = get_past_keywords()
        strategy = generate_daily_breakthrough_strategy(past_keywords)
        print("================== [AI 오늘의 반성 및 전략] ==================")
        print(strategy)
        print("==============================================================\n")
        
        print("Gemini API로 맞춤형 황금 키워드 추출 중...")
        refined_keywords = extract_golden_keywords_with_gemini(daum_headlines, nate_stories, strategy)
        
        for item in refined_keywords:
            new_data.append({
                'timestamp': timestamp,
                'source': 'AI Refined',
                'category': item['category'],
                'title': item['title']
            })
        
    # 3. CSV 저장 및 중복 제거
    if new_data:
        df_new = pd.DataFrame(new_data)
        
        if os.path.exists(CSV_FILE):
            df_old = pd.read_csv(CSV_FILE)
            df_combined = pd.concat([df_old, df_new], ignore_index=True)
            # 같은 출처, 카테고리, 제목이면 중복으로 보고 제거
            df_combined.drop_duplicates(subset=['source', 'category', 'title'], keep='last', inplace=True)
        else:
            df_combined = df_new
            
        df_combined.to_csv(CSV_FILE, index=False, encoding='utf-8-sig')
        print(f"총 {len(df_new)}개의 새로운 트렌드가 {CSV_FILE}에 저장되었습니다. (누적: {len(df_combined)}개)")
        
        # 4. GitHub 자동 푸시
        push_to_github()
    else:
        print("수집된 데이터가 없습니다.")

def push_to_github():
    print("GitHub로 변경사항을 푸시합니다...")
    try:
        # GitHub Actions 환경일 경우 봇 계정 설정
        if os.getenv('GITHUB_ACTIONS_ENV'):
            subprocess.run(['git', 'config', '--global', 'user.name', 'github-actions[bot]'], check=True, cwd=os.getcwd())
            subprocess.run(['git', 'config', '--global', 'user.email', 'github-actions[bot]@users.noreply.github.com'], check=True, cwd=os.getcwd())
            
        # git add
        subprocess.run(['git', 'add', CSV_FILE], check=True, cwd=os.getcwd(), capture_output=True)
        
        # git commit
        commit_msg = f"Auto-update trends: {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        res = subprocess.run(['git', 'commit', '-m', commit_msg], cwd=os.getcwd(), capture_output=True)
        
        if res.returncode == 0:
            # git push
            subprocess.run(['git', 'push'], check=True, cwd=os.getcwd(), capture_output=True)
            print("GitHub 푸시 완료!")
        else:
            print("커밋할 새로운 변경사항이 없습니다.")
    except subprocess.CalledProcessError as e:
        print(f"Git 명령 실행 중 오류 발생: {e}")
        
if __name__ == "__main__":
    if os.getenv('GITHUB_ACTIONS_ENV'):
        # 클라우드 환경: 딱 한 번만 실행 후 종료
        run_crawler()
    else:
        # 로컬 환경: 처음 1회 실행 후 15분 간격 무한 반복
        run_crawler()
        schedule.every(15).minutes.do(run_crawler)
        print("\n15분 간격 트렌드 크롤러가 시작되었습니다. (종료하려면 Ctrl+C를 누르세요)")
        while True:
            schedule.run_pending()
            time.sleep(60)
