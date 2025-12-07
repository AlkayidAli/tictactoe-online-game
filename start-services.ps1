# Start all services in separate PowerShell windows
$root = Split-Path $MyInvocation.MyCommand.Path -Parent

function Start-ServiceWindow($path, $cmd) {
  $full = Join-Path $root $path
  Start-Process powershell -ArgumentList "-NoProfile -Command cd `"$full`"; $cmd" -WindowStyle Normal
}

Start-ServiceWindow "services/user-service" "npm install; npm start"
Start-ServiceWindow "services/game-service" "npm install; npm start"
Start-ServiceWindow "services/room-service" "npm install; npm start"
