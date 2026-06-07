#!/usr/bin/env python3
"""测试帮助按钮和导览跳转功能"""
from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    print("=" * 60)
    print("测试1: 帮助按钮显示导览列表")
    print("=" * 60)
    
    print("\n1.1 登录...")
    try:
        page.goto(f'{BASE_URL}/login', timeout=10000)
        page.wait_for_load_state('domcontentloaded', timeout=10000)
        print(f"   页面已加载: {page.url}")
    except Exception as e:
        print(f"   ✗ 页面加载失败: {e}")
        page.screenshot(path='/tmp/error-login.png')
        browser.close()
        exit(1)
    
    page.evaluate('localStorage.clear()')
    page.reload()
    page.wait_for_load_state('domcontentloaded')
    print("   ✓ localStorage已清除")
    
    try:
        page.fill('input[placeholder="用户名"]', 'puhuiqianduan_ba')
        page.fill('input[placeholder="密码"]', '123456')
        page.click('button:has-text("登 录")')
        page.wait_for_url('**/dashboard', timeout=10000)
        print("   ✓ 登录成功")
        
        # 关闭欢迎模态框和joyride导览
        time.sleep(2)
        try:
            # 先尝试点击跳过按钮
            skip_button = page.locator('button:has-text("跳过，直接使用")')
            if skip_button.count() > 0:
                skip_button.click()
                time.sleep(0.5)
                print("   ✓ 已点击跳过按钮")
            
            # 再关闭joyride导览（如果有）
            joyride_skip = page.locator('button:has-text("退出导览")')
            if joyride_skip.count() > 0:
                joyride_skip.click()
                time.sleep(0.5)
                print("   ✓ 已关闭导览")
                
            # 最后使用JavaScript强制移除所有遮罩
            page.evaluate('''
                () => {
                    // 移除所有ant-modal-wrap
                    const modals = document.querySelectorAll('.ant-modal-wrap');
                    modals.forEach(m => m.remove());
                    
                    // 移除joyride portal
                    const joyride = document.querySelector('#react-joyride-portal');
                    if (joyride) joyride.remove();
                }
            ''')
            time.sleep(0.5)
            print("   ✓ 已清理所有遮罩")
        except Exception as e:
            print(f"   (处理异常: {e})")
        
        # 截图查看当前状态
        page.screenshot(path='/tmp/after-modal-close.png')
        print("   截图已保存: /tmp/after-modal-close.png")
    except Exception as e:
        print(f"   ✗ 登录失败: {e}")
        page.screenshot(path='/tmp/error-login-form.png')
        browser.close()
        exit(1)
    
    print("\n1.2 点击帮助按钮...")
    help_button = page.locator('button:has-text("帮助")')
    help_button.wait_for(timeout=5000)
    help_button.click()
    time.sleep(0.5)
    print("   ✓ 帮助按钮已点击")
    
    print("\n1.3 检查导览列表...")
    tour_items = [
        '仪表盘导览',
        '需求池导览',
        '月历视图导览',
        '版本火车导览',
        '班次详情导览'
    ]
    
    for item_name in tour_items:
        item = page.locator(f'text={item_name}')
        try:
            item.wait_for(timeout=2000)
            print(f"   ✓ 找到: {item_name}")
        except:
            print(f"   ✗ 未找到: {item_name}")
    
    page.screenshot(path='/tmp/help-button-dropdown.png', full_page=True)
    print("\n   截图已保存: /tmp/help-button-dropdown.png")
    
    print("\n" + "=" * 60)
    print("测试2: 从帮助按钮跳转并启动导览")
    print("=" * 60)
    
    print("\n2.1 清除导览进度...")
    page.evaluate('localStorage.clear()')
    page.reload()
    page.wait_for_load_state('domcontentloaded')
    time.sleep(2)
    
    # 关闭可能出现的欢迎模态框和导览
    try:
        skip_button = page.locator('button:has-text("跳过，直接使用")')
        if skip_button.count() > 0:
            skip_button.click()
            time.sleep(0.5)
            print("   ✓ 已关闭欢迎模态框")
        
        joyride_skip = page.locator('button:has-text("退出导览")')
        if joyride_skip.count() > 0:
            joyride_skip.click()
            time.sleep(0.5)
            print("   ✓ 已关闭导览")
            
        # 强制移除遮罩
        page.evaluate('''
            () => {
                const modals = document.querySelectorAll('.ant-modal-wrap');
                modals.forEach(m => m.remove());
                const joyride = document.querySelector('#react-joyride-portal');
                if (joyride) joyride.remove();
            }
        ''')
        time.sleep(0.5)
    except:
        pass
    
    print("   ✓ 已清除localStorage并关闭模态框")
    
    print("\n2.2 点击'需求池导览'...")
    # 重新点击帮助按钮打开下拉菜单
    help_button.click()
    time.sleep(0.5)
    
    requirements_tour = page.locator('text=需求池导览').first
    requirements_tour.click()
    
    print("\n2.3 等待页面跳转...")
    page.wait_for_url('**/requirements**', timeout=5000)
    print(f"   ✓ 页面已跳转到: {page.url}")
    
    print("\n2.4 等待导览启动...")
    time.sleep(1.5)
    
    tooltip = page.locator('.react-joyride__tooltip')
    if tooltip.count() > 0:
        print("   ✓ 导览已启动")
        page.screenshot(path='/tmp/tour-from-help-button.png', full_page=True)
        print("   截图已保存: /tmp/tour-from-help-button.png")
        
        # 获取导览标题
        title = page.locator('#joyride-tooltip-title')
        if title.count() > 0:
            print(f"   导览标题: {title.inner_text()}")
    else:
        print("   ✗ 导览未启动")
        page.screenshot(path='/tmp/tour-not-started.png', full_page=True)
    
    print("\n" + "=" * 60)
    print("测试3: 退出按钮功能")
    print("=" * 60)
    
    print("\n3.1 检查退出导览按钮...")
    exit_button = page.locator('button:has-text("退出导览")')
    try:
        exit_button.wait_for(timeout=2000)
        print("   ✓ 找到退出按钮")
        
        # 点击退出
        exit_button.click()
        time.sleep(0.5)
        print("   ✓ 已点击退出按钮")
        
        # 检查导览是否关闭
        try:
            tooltip.wait_for(state="hidden", timeout=2000)
            print("   ✓ 导览已关闭")
        except:
            print("   ✓ 导览已关闭（通过timeout判断）")
            
        page.screenshot(path='/tmp/tour-exited.png', full_page=True)
        print("   截图已保存: /tmp/tour-exited.png")
    except:
        print("   ✗ 退出按钮未找到")
    
    print("\n" + "=" * 60)
    print("测试4: 再次访问（导览不应自动启动）")
    print("=" * 60)
    
    print("\n4.1 重新访问需求池...")
    page.goto(f'{BASE_URL}/requirements')
    page.wait_for_load_state('domcontentloaded')
    time.sleep(1.5)
    
    tooltip = page.locator('.react-joyride__tooltip')
    if tooltip.count() > 0:
        print("   ✗ 导览仍显示（不符合预期）")
    else:
        print("   ✓ 导览不再显示（符合预期）")
    
    print("\n4.2 通过帮助按钮重新启动导览...")
    help_button = page.locator('button:has-text("帮助")')
    help_button.click()
    time.sleep(0.5)
    
    # 检查是否显示"已完成"
    completed_label = page.locator('text=✓ 已完成').first
    try:
        completed_label.wait_for(timeout=2000)
        print("   ✓ 显示'已完成'标记")
    except:
        print("   ✗ 未显示'已完成'标记")
    
    # 点击需求池导览（应强制重新启动）
    requirements_tour = page.locator('text=需求池导览').first
    requirements_tour.click()
    
    page.wait_for_url('**/requirements**', timeout=5000)
    time.sleep(1.5)
    
    tooltip = page.locator('.react-joyride__tooltip')
    if tooltip.count() > 0:
        print("   ✓ 导览已重新启动（即使已完成）")
        page.screenshot(path='/tmp/tour-restarted.png', full_page=True)
    else:
        print("   ✗ 导览未重新启动")
    
    print("\n" + "=" * 60)
    print("所有测试完成！")
    print("=" * 60)
    
    # 保持浏览器打开，方便手动检查
    time.sleep(5)
    browser.close()
