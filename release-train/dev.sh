#!/bin/bash
# ========== 版本火车 - 服务管理脚本 ==========
# 用法:
#   bash dev.sh start         启动全部服务（build shared + server + web）
#   bash dev.sh stop          停止全部服务
#   bash dev.sh restart       重启全部服务
#   bash dev.sh start:server  仅启动后端
#   bash dev.sh start:web     仅启动前端
#   bash dev.sh stop:server   仅停止后端
#   bash dev.sh stop:web      仅停止前端
#   bash dev.sh status        查看服务状态

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_PORT=3000
WEB_PORT=5173

# ========== 工具函数 ==========

# 根据端口杀掉进程
kill_port() {
  local port=$1
  local label=$2
  local pid=$(lsof -ti :"$port" 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "  → 停止 $label (端口 $port, PID $pid)..."
    kill "$pid" 2>/dev/null
    sleep 1
    # 如果还在，强制杀
    if lsof -ti :"$port" &>/dev/null; then
      kill -9 "$(lsof -ti :$port)" 2>/dev/null
    fi
    echo "  ✓ $label 已停止"
  else
    echo "  ○ $label 未运行"
  fi
}

# 检查端口是否被占用
check_port() {
  local port=$1
  lsof -ti :"$port" &>/dev/null && echo "running" || echo "stopped"
}

# ========== 启动命令 ==========

start_server() {
  echo "[启动后端] 端口 $SERVER_PORT"
  if [ "$(check_port $SERVER_PORT)" = "running" ]; then
    echo "  ⚠ 端口 $SERVER_PORT 已被占用，先停止..."
    kill_port $SERVER_PORT "后端"
  fi
  cd "$PROJECT_DIR"
  nohup pnpm dev:server > "$PROJECT_DIR/server.log" 2>&1 &
  echo "  ✓ 后端已启动 (日志: server.log, PID: $!)"
}

start_web() {
  echo "[启动前端] 端口 $WEB_PORT"
  if [ "$(check_port $WEB_PORT)" = "running" ]; then
    echo "  ⚠ 端口 $WEB_PORT 已被占用，先停止..."
    kill_port $WEB_PORT "前端"
  fi
  cd "$PROJECT_DIR"
  nohup pnpm dev:web > "$PROJECT_DIR/web.log" 2>&1 &
  echo "  ✓ 前端已启动 (日志: web.log, PID: $!)"
}

build_shared() {
  echo "[编译 shared]"
  cd "$PROJECT_DIR"
  pnpm build:shared
  echo "  ✓ shared 编译完成"
}

# ========== 停止命令 ==========

stop_server() {
  kill_port $SERVER_PORT "后端"
}

stop_web() {
  kill_port $WEB_PORT "前端"
}

# ========== 状态 ==========

show_status() {
  echo "========== 服务状态 =========="
  local srv=$(check_port $SERVER_PORT)
  local web=$(check_port $WEB_PORT)
  echo "后端 (:$SERVER_PORT):  $([ "$srv" = "running" ] && echo '✓ 运行中' || echo '✗ 未运行')"
  echo "前端 (:$WEB_PORT):  $([ "$web" = "running" ] && echo '✓ 运行中' || echo '✗ 未运行')"
  echo ""
  echo "访问地址: http://localhost:$WEB_PORT"
  echo "日志文件: server.log / web.log"
}

# ========== 主逻辑 ==========

case "${1:-}" in
  start)
    build_shared
    start_server
    sleep 2
    start_web
    echo ""
    show_status
    ;;
  stop)
    echo "[停止全部服务]"
    stop_server
    stop_web
    echo "✓ 全部已停止"
    ;;
  restart)
    echo "[重启全部服务]"
    stop_server
    stop_web
    sleep 1
    build_shared
    start_server
    sleep 2
    start_web
    echo ""
    show_status
    ;;
  start:server)
    build_shared
    start_server
    ;;
  start:web)
    start_web
    ;;
  stop:server)
    stop_server
    ;;
  stop:web)
    stop_web
    ;;
  status)
    show_status
    ;;
  *)
    echo "版本火车 - 服务管理脚本"
    echo ""
    echo "用法: bash dev.sh <命令>"
    echo ""
    echo "命令:"
    echo "  start         启动全部服务"
    echo "  stop          停止全部服务"
    echo "  restart       重启全部服务"
    echo "  start:server  仅启动后端"
    echo "  start:web     仅启动前端"
    echo "  stop:server   仅停止后端"
    echo "  stop:web      仅停止前端"
    echo "  status        查看服务状态"
    echo ""
    echo "示例:"
    echo "  bash dev.sh start          # 首次启动"
    echo "  bash dev.sh stop           # 停止所有"
    echo "  bash dev.sh status         # 查看状态"
    ;;
esac
