@echo off
echo Starting QQ VideoGen...
start "" /B cmd /c "timeout /t 2 /nobreak > nul && start http://localhost:3000"
node server/index.js
