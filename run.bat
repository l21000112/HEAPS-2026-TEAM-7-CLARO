@echo off
set "ROOT=%~dp0"

start "Frontend - Expo" /D "%ROOT%frontend" cmd /k "npx expo start"
start "Backend - Dev" /D "%ROOT%backend" cmd /k "npm run dev"