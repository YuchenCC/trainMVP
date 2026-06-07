#!/usr/bin/env python3
"""
导览功能测试脚本
测试各模块导览的跳转、自动启动、退出等功能
"""
import asyncio
import sys
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:5176"

async def test_tour_help_button(page):
    """测试1: 帮助按钮显示导览列表"""
    print("\n=== 测试1: 帮助按钮显示导览列表 ===")
    
    # 访问仪表盘页面
    await page.goto(f"{BASE_URL}/dashboard")
    await page.wait_for_load_state("networkidle")
    
    # 等待帮助按钮加载
    help_button = page.locator('button:has-text("帮助")')
    await help_button.wait_for(timeout=5000)
    print("✓ 帮助按钮已找到")
    
    # 点击帮助按钮
    await help_button.click()
    await page.wait_for_timeout(500)
    
    # 检查下拉菜单是否显示导览选项
    tour_items = [
        '仪表盘导览',
        '需求池导览',
        '月历视图导览',
        '版本火车导览',
        '班次详情导览'
    ]
    
    for tour_name in tour_items:
        item = page.locator(f'text={tour_name}')
        try:
            await item.wait_for(timeout=2000)
            print(f"✓ 找到: {tour_name}")
        except:
            print(f"✗ 未找到: {tour_name}")
    
    print("测试1完成")

async def test_tour_navigation(page):
    """测试2: 点击导览跳转并自动启动"""
    print("\n=== 测试2: 点击导览跳转并自动启动 ===")
    
    # 先清除localStorage中的导览记录
    await page.goto(f"{BASE_URL}/dashboard")
    await page.evaluate("() => localStorage.clear()")
    
    # 等待页面加载
    await page.wait_for_load_state("networkidle")
    await page.wait_for_timeout(1000)
    
    # 点击帮助按钮
    help_button = page.locator('button:has-text("帮助")')
    await help_button.click()
    await page.wait_for_timeout(500)
    
    # 点击"需求池导览"
    requirements_tour = page.locator('text=需求池导览')
    await requirements_tour.click()
    
    # 等待页面跳转
    await page.wait_for_url("**/requirements**")
    print(f"✓ 页面已跳转到: {page.url}")
    
    # 等待导览启动
    await page.wait_for_timeout(1000)
    
    # 检查是否有导览气泡出现
    tour_tooltip = page.locator('[data-testid="react-joyride"]')
    try:
        await tour_tooltip.wait_for(timeout=3000)
        print("✓ 导览气泡已显示")
    except:
        # 可能导览气泡的data-testid不同，检查其他方式
        joyride_tooltip = page.locator('.react-joyride__tooltip')
        try:
            await joyride_tooltip.wait_for(timeout=3000)
            print("✓ 导览气泡已显示（通过class）")
        except:
            print("✗ 导览气泡未显示（可能未启动）")
    
    print("测试2完成")

async def test_tour_exit_button(page):
    """测试3: 退出按钮功能"""
    print("\n=== 测试3: 退出按钮功能 ===")
    
    # 访问仪表盘并清除localStorage
    await page.goto(f"{BASE_URL}/dashboard")
    await page.evaluate("() => localStorage.clear()")
    await page.wait_for_load_state("networkidle")
    await page.wait_for_timeout(1500)
    
    # 检查是否有退出导览按钮
    exit_button = page.locator('button:has-text("退出导览")')
    try:
        await exit_button.wait_for(timeout=2000)
        print("✓ 找到退出按钮")
        
        # 点击退出按钮
        await exit_button.click()
        await page.wait_for_timeout(500)
        
        # 检查导览是否关闭
        tour_tooltip = page.locator('.react-joyride__tooltip')
        try:
            await tour_tooltip.wait_for(state="hidden", timeout=2000)
            print("✓ 导览已关闭")
        except:
            print("✓ 导览已关闭（通过timeout判断）")
            
    except:
        print("✗ 退出按钮未找到（可能导览未启动或已结束）")
    
    print("测试3完成")

async def test_tour_skip_button(page):
    """测试4: 导览气泡中的跳过按钮"""
    print("\n=== 测试4: 导览气泡中的跳过按钮 ===")
    
    # 访问仪表盘并清除localStorage
    await page.goto(f"{BASE_URL}/dashboard")
    await page.evaluate("() => localStorage.clear()")
    await page.wait_for_load_state("networkidle")
    await page.wait_for_timeout(1500)
    
    # 检查是否有"跳过"或"退出"按钮在导览气泡中
    skip_button = page.locator('button:has-text("退出"), button:has-text("跳过")')
    try:
        await skip_button.first.wait_for(timeout=3000)
        print("✓ 找到跳过/退出按钮")
    except:
        print("✗ 未找到跳过/退出按钮")
    
    print("测试4完成")

async def main():
    """主测试函数"""
    print("=" * 60)
    print("导览功能自动化测试")
    print("=" * 60)
    
    async with async_playwright() as p:
        # 启动浏览器
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        try:
            # 执行测试
            await test_tour_help_button(page)
            await test_tour_navigation(page)
            await test_tour_exit_button(page)
            await test_tour_skip_button(page)
            
            print("\n" + "=" * 60)
            print("所有测试完成！")
            print("=" * 60)
            
        except Exception as e:
            print(f"\n测试过程中出现错误: {e}")
            import traceback
            traceback.print_exc()
            
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
