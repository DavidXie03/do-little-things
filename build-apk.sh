#!/bin/bash

#================================================================
#  做件小事 - 一键打包 APK 脚本
#  用法: ./build-apk.sh [debug|release]
#  默认构建 debug 版本
#================================================================

set -e  # 遇到错误立即退出

# ---- 颜色定义 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ---- 工具函数 ----
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }
step()    { echo -e "\n${CYAN}━━━ Step $1: $2 ━━━${NC}"; }

# ---- 配置 ----
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
ANDROID_DIR="${PROJECT_DIR}/android"
BUILD_TYPE="${1:-debug}"  # 默认 debug
APP_NAME="做件小事"
OUTPUT_DIR="${PROJECT_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

cd "$PROJECT_DIR"

echo -e "${CYAN}"
echo "╔══════════════════════════════════════╗"
echo "║      ${APP_NAME} APK 打包工具        ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"
info "构建类型: ${BUILD_TYPE}"
info "项目目录: ${PROJECT_DIR}"
echo ""

# ---- Step 1: 环境检查 ----
step 1 "环境检查"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    error "未找到 Node.js，请先安装 Node.js"
fi
info "Node.js $(node -v)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    error "未找到 npm"
fi
info "npm $(npm -v)"

# 检查 Java
if ! command -v java &> /dev/null; then
    error "未找到 Java，请安装 JDK 17+"
fi
JAVA_VER=$(java -version 2>&1 | head -1)
info "Java: ${JAVA_VER}"

# 检查 Android SDK
if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
    # 尝试从 local.properties 读取
    if [ -f "${ANDROID_DIR}/local.properties" ]; then
        SDK_DIR=$(grep "sdk.dir" "${ANDROID_DIR}/local.properties" | cut -d'=' -f2)
        if [ -n "$SDK_DIR" ] && [ -d "$SDK_DIR" ]; then
            export ANDROID_HOME="$SDK_DIR"
            info "Android SDK (from local.properties): ${ANDROID_HOME}"
        else
            error "Android SDK 路径无效: ${SDK_DIR}"
        fi
    else
        # macOS 默认路径
        DEFAULT_SDK="$HOME/Library/Android/sdk"
        if [ -d "$DEFAULT_SDK" ]; then
            export ANDROID_HOME="$DEFAULT_SDK"
            info "Android SDK (默认路径): ${ANDROID_HOME}"
        else
            error "未找到 Android SDK，请设置 ANDROID_HOME 环境变量"
        fi
    fi
else
    ANDROID_HOME="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
    info "Android SDK: ${ANDROID_HOME}"
fi

success "环境检查通过"

# ---- Step 2: 安装依赖 ----
step 2 "检查依赖"

if [ ! -d "node_modules" ]; then
    info "安装 npm 依赖..."
    npm install
else
    info "node_modules 已存在，跳过安装"
fi

success "依赖就绪"

# ---- Step 3: 前端构建 ----
step 3 "构建前端项目 (Vite)"

info "运行 vite build..."
npx vite build

if [ ! -d "dist" ]; then
    error "前端构建失败，dist 目录不存在"
fi

FILE_COUNT=$(find dist -type f | wc -l | tr -d ' ')
info "dist 目录: ${FILE_COUNT} 个文件"
success "前端构建完成"

# ---- Step 4: Capacitor 同步 ----
step 4 "同步到 Android (Capacitor)"

info "运行 capacitor sync android..."
npx cap sync android

success "Capacitor 同步完成"

# ---- Step 5: Gradle 构建 APK ----
step 5 "构建 APK (Gradle)"

cd "$ANDROID_DIR"

# 确保 gradlew 有执行权限
chmod +x gradlew

if [ "$BUILD_TYPE" = "release" ]; then
    info "构建 Release APK..."
    ./gradlew assembleRelease --no-daemon -q
    APK_SOURCE="app/build/outputs/apk/release/app-release-unsigned.apk"
    APK_FILENAME="${APP_NAME}-release-${TIMESTAMP}.apk"
    
    # release 也可能叫 app-release.apk
    if [ ! -f "$APK_SOURCE" ]; then
        APK_SOURCE="app/build/outputs/apk/release/app-release.apk"
    fi
else
    info "构建 Debug APK..."
    ./gradlew assembleDebug --no-daemon -q
    APK_SOURCE="app/build/outputs/apk/debug/app-debug.apk"
    APK_FILENAME="${APP_NAME}-debug.apk"
fi

cd "$PROJECT_DIR"

APK_FULL_SOURCE="${ANDROID_DIR}/${APK_SOURCE}"

if [ ! -f "$APK_FULL_SOURCE" ]; then
    error "APK 未找到: ${APK_FULL_SOURCE}"
fi

success "Gradle 构建完成"

# ---- Step 6: 拷贝 APK 到项目根目录 ----
step 6 "导出 APK"

APK_OUTPUT="${OUTPUT_DIR}/${APK_FILENAME}"
cp "$APK_FULL_SOURCE" "$APK_OUTPUT"

# 获取 APK 大小
APK_SIZE=$(du -h "$APK_OUTPUT" | cut -f1 | tr -d ' ')

success "APK 已导出"

# ---- 完成 ----
echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          打包完成！                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "  📦 文件: ${CYAN}${APK_OUTPUT}${NC}"
echo -e "  📏 大小: ${CYAN}${APK_SIZE}${NC}"
echo -e "  🏷️  类型: ${CYAN}${BUILD_TYPE}${NC}"
echo ""

# 如果是 macOS，在 Finder 中显示
if [ "$(uname)" = "Darwin" ]; then
    info "在 Finder 中打开..."
    open -R "$APK_OUTPUT" 2>/dev/null || true
fi

echo -e "${GREEN}Done!${NC}"
