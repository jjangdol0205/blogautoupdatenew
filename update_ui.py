import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. activeSite 제거 및 activeBlogStyle 기본값 변경
content = content.replace(
    "  const [activeSite, setActiveSite] = useState<'site1' | 'site2' | 'site3'>('site1');\n  const [activeBlogStyle, setActiveBlogStyle] = useState('site1_bot1');",
    "  const [activeBlogStyle, setActiveBlogStyle] = useState('bot1');"
)

# 2. H1 제목 변경
old_h1 = """          <h1 className={`heading-1 mb-6 transition-colors duration-300 ${activeSite === 'site1' ? 'text-[#005a2b]' : activeSite === 'site2' ? 'text-blue-700' : 'text-purple-700'}`}>
            {activeSite === 'site1' && <>키워드 하나로 끝내는<br />메인/종합 블로그 자동화</>}
            {activeSite === 'site2' && <>키워드 하나로 끝내는<br />IT/재테크 블로그 자동화</>}
            {activeSite === 'site3' && <>키워드 하나로 끝내는<br />트렌드/라이프 블로그 자동화</>}
          </h1>"""
new_h1 = """          <h1 className="heading-1 mb-6 transition-colors duration-300 text-[#005a2b]">
            키워드 하나로 끝내는<br />수익형 블로그 포스팅 자동화
          </h1>"""
content = content.replace(old_h1, new_h1)

# 3. 봇 버튼 영역 전체 변경
# 찾을 영역: {/* Site Selection Tabs */} 부터 renderTrendBlock 호출 전까지
pattern = r"                \{\/\* Site Selection Tabs \*\/\}.*?renderTrendBlock\(aiTrends, \"AI 황금 키워드 TOP 5\", <Lightbulb className=\"w-3 h-3\"\/>, activeSite === 'site1' \? 'purple' : activeSite === 'site2' \? 'blue' : 'red', activeBlogStyle\)\}"

new_bot_section = """                {/* 6 Core Bot Modes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-slate-300 rounded-md overflow-hidden">
                  <button type="button" onClick={() => fetchAiTrendMiner('bot1')} disabled={isAnyLoading} className={`w-full px-4 py-4 bg-white border-b md:border-r border-slate-300 hover:bg-slate-50 flex flex-col items-start gap-1 transition-colors ${activeBlogStyle === 'bot1' ? 'bg-green-50/50' : ''}`}>
                    <div className="flex items-center gap-1">
                      {isTrendLoading && activeBlogStyle === 'bot1' ? <Loader2 className="w-4 h-4 animate-spin text-green-600" /> : <Sparkles className="w-4 h-4 text-black" />}
                      <span className="text-[14px] font-bold text-slate-900 text-left">1호기 (지원금/복지)</span>
                    </div>
                    <span className="text-[12px] font-normal text-slate-600 leading-tight text-left">보조금/캐시백 및 미신청 손실 공포</span>
                  </button>
                  <button type="button" onClick={() => fetchAiTrendMiner('bot2')} disabled={isAnyLoading} className={`w-full px-4 py-4 bg-white border-b border-slate-300 hover:bg-slate-50 flex flex-col items-start gap-1 transition-colors ${activeBlogStyle === 'bot2' ? 'bg-green-50/50' : ''}`}>
                    <div className="flex items-center gap-1">
                      {isTrendLoading && activeBlogStyle === 'bot2' ? <Loader2 className="w-4 h-4 animate-spin text-green-600" /> : <Sparkles className="w-4 h-4 text-black" />}
                      <span className="text-[14px] font-bold text-slate-900 text-left">2호기 (예적금/특판)</span>
                    </div>
                    <span className="text-[12px] font-normal text-slate-600 leading-tight text-left">고금리 특판 마감/기회비용 공포</span>
                  </button>
                  <button type="button" onClick={() => fetchAiTrendMiner('bot3')} disabled={isAnyLoading} className={`w-full px-4 py-4 bg-white border-b md:border-r border-slate-300 hover:bg-slate-50 flex flex-col items-start gap-1 transition-colors ${activeBlogStyle === 'bot3' ? 'bg-green-50/50' : ''}`}>
                    <div className="flex items-center gap-1">
                      {isTrendLoading && activeBlogStyle === 'bot3' ? <Loader2 className="w-4 h-4 animate-spin text-green-600" /> : <Sparkles className="w-4 h-4 text-black" />}
                      <span className="text-[14px] font-bold text-slate-900 text-left">3호기 (연금/시니어)</span>
                    </div>
                    <span className="text-[12px] font-normal text-slate-600 leading-tight text-left">국민연금 개혁 및 건보료 폭탄 방어</span>
                  </button>
                  <button type="button" onClick={() => fetchAiTrendMiner('bot4')} disabled={isAnyLoading} className={`w-full px-4 py-4 bg-white border-b border-slate-300 hover:bg-slate-50 flex flex-col items-start gap-1 transition-colors ${activeBlogStyle === 'bot4' ? 'bg-green-50/50' : ''}`}>
                    <div className="flex items-center gap-1">
                      {isTrendLoading && activeBlogStyle === 'bot4' ? <Loader2 className="w-4 h-4 animate-spin text-green-600" /> : <Sparkles className="w-4 h-4 text-black" />}
                      <span className="text-[14px] font-bold text-slate-900 text-left">4호기 (부동산/청약)</span>
                    </div>
                    <span className="text-[12px] font-normal text-slate-600 leading-tight text-left">로또 무순위 청약 및 벼락거지 공포</span>
                  </button>
                  <button type="button" onClick={() => fetchAiTrendMiner('bot5')} disabled={isAnyLoading} className={`w-full px-4 py-4 bg-white md:border-r border-b md:border-b-0 border-slate-300 hover:bg-slate-50 flex flex-col items-start gap-1 transition-colors ${activeBlogStyle === 'bot5' ? 'bg-green-50/50' : ''}`}>
                    <div className="flex items-center gap-1">
                      {isTrendLoading && activeBlogStyle === 'bot5' ? <Loader2 className="w-4 h-4 animate-spin text-green-600" /> : <Sparkles className="w-4 h-4 text-black" />}
                      <span className="text-[14px] font-bold text-slate-900 text-left">5호기 (도파민/이슈)</span>
                    </div>
                    <span className="text-[12px] font-normal text-slate-600 leading-tight text-left">화제의 인물, 논란, 대중의 관음증 자극</span>
                  </button>
                  <button type="button" onClick={() => fetchAiTrendMiner('bot6')} disabled={isAnyLoading} className={`w-full px-4 py-4 bg-white border-slate-300 hover:bg-slate-50 flex flex-col items-start gap-1 transition-colors ${activeBlogStyle === 'bot6' ? 'bg-green-50/50' : ''}`}>
                    <div className="flex items-center gap-1">
                      {isTrendLoading && activeBlogStyle === 'bot6' ? <Loader2 className="w-4 h-4 animate-spin text-green-600" /> : <Sparkles className="w-4 h-4 text-black" />}
                      <span className="text-[14px] font-bold text-slate-900 text-left">6호기 (세금/절세)</span>
                    </div>
                    <span className="text-[12px] font-normal text-slate-600 leading-tight text-left">환급금 찾기 및 세금 신고 누락 가산세 공포</span>
                  </button>
                </div>

                {renderTrendBlock(aiTrends, "AI 황금 키워드 TOP 5", <Lightbulb className="w-3 h-3"/>, 'emerald', activeBlogStyle)}"""

content = re.sub(pattern, new_bot_section, content, flags=re.DOTALL)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("UI updated successfully.")
