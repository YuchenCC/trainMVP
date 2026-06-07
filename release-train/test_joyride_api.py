#!/usr/bin/env python3
"""测试Joyride的不同配置"""
from playwright.sync_api import sync_playwright
import time
import subprocess

BASE_URL = "http://localhost:5173"
API_URL = "http://localhost:3000/api"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    # 监听控制台输出
    page.on('console', lambda msg: print(f'[Console] {msg.text}'))
    
    print("=" * 60)
    print("检查Joyride API")
    print("=" * 60)
    
    # 登录
    page.goto(f'{BASE_URL}/login', timeout=10000)
    page.wait_for_load_state('domcontentloaded')
    page.fill('input[placeholder="用户名"]', 'puhuiqianduan_ba')
    page.fill('input[placeholder="密码"]', '123456')
    page.click('button:has-text("登 录")')
    page.wait_for_url('**/dashboard', timeout=10000)
    
    # 处理模态框
    time.sleep(2)
    page.keyboard.press('Escape')
    time.sleep(1)
    page.reload()
    page.wait_for_load_state('domcontentloaded')
    time.sleep(3)
    
    # 检查window对象中是否有Joyride相关信息
    print("\n检查Joyride配置...")
    # 直接访问页面注入脚本检查
    joyride_info = page.evaluate("""
        () => {
            // 检查Joyride的React元素
            const joyrideElements = document.querySelectorAll('[class*="joyride"]');
            const info = {
                joyrideElementCount: joyrideElements.length,
                joyrideElementClasses: Array.from(joyrideElements).map(el => el.className),
            };
            return info;
        }
    """)
    
    print(f"   Joyride元素数: {joyride_info['joyrideElementCount']}")
    
    # 检查Joyride的props
    # 获取react dev tools信息
    props_info = page.evaluate("""
        () => {
            const joyride = document.querySelector('[data-testid*="joyride"]');
            if (joyride) {
                // 尝试获取React的props
                const key = Object.keys(joyride).find(key => key.startsWith('__react'));
                if (key && joyride[key]) {
                    return { hasReactProps: true };
                }
            }
            return { hasReactProps: false };
        }
    """)
    
    print(f"   有React Props: {props_info['hasReactProps']}")
    
    # 现在让我尝试不同的Joyride配置
    # 先检查源代码中Joyride的使用
    print("\n检查当前页面的Joyride配置...")
    
    # 现在尝试修改TourProvider组件
    # 让我读取当前的TourProvider代码
    import os
    tour_provider_path = "/Users/laiyang/Library/Application Support/TRAE SOLO CN/ModularData/ai-agent/work-mode-projects/版本火车/release-train/apps/web/src/tour/TourProvider.tsx"
    if os.path.exists(tour_provider_path):
        with open(tour_provider_path, 'r') as f:
            print(f"\n当前TourProvider代码:")
            print(f.read()[:500])
    
    browser.close()
    
    print("\n尝试查找Joyride文档...")
    print("-" * 60)
    print("让我检查Joyride的类型定义...")
    
    # 尝试查找Joyride类型文件
    import glob
    joyride_types = glob.glob("/Users/laiyang/Library/Application Support/TRAE SOLO CN/ModularData/ai-agent/work-mode-projects/版本火车/release-train/apps/web/node_modules/react-joyride/**/*.d.ts", recursive=True)
    if joyride_types:
        for f in joyride_types[:3]:
            print(f"\n找到类型文件: {f}")
            try:
                with open(f, 'r') as type_f:
                    content = type_f.read()
                    if 'showSkip' in content or 'skipButton' in content:
                        print("   ✓ 包含skip相关配置")
                        # 查找相关类型
                        import re
                        matches = re.findall(r'(showSkip|skipButton|ShowSkipButton)[^,\n}]+', content)
                        if matches:
                            print(f"   找到的配置: {matches}")
            except:
                pass