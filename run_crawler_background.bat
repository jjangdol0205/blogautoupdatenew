@echo off
cd /d "d:\autoblog3"
:: pythonw를 사용하면 검은색 CMD 창 없이 백그라운드에서 조용히 실행됩니다.
start "" pythonw trend_crawler.py
