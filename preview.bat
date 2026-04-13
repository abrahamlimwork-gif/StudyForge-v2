@echo off
TITLE StudyForge v2 - Preview
echo ==========================================
echo    StudyForge v2 - Local Preview
echo ==========================================
echo.
echo Launching your browser to http://localhost:9002...
echo Starting the development server...
echo.

:: Open the browser first (it will retry/refresh automatically in most modern dev environments or the user can refresh)
start "" "http://localhost:9002"

:: Run the development server
npm run dev
