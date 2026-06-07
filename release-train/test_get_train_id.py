#!/usr/bin/env python3
"""获取第一个火车的ID"""
from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    print("=" * 60)
    print("获取火车和班次ID")
    print("=" * 60)
    
    # 1. 登录
    print("\n1. 登录...")
    page.goto(f'{BASE_URL}/login', timeout=10000)
    page.wait_for_load_state('domcontentloaded')
    page.fill('input[placeholder="用户名"]', 'puhuiqianduan_ba')
    page.fill('input[placeholder="密码"]', '123456')
    page.click('button:has-text("登 录")')
    page.wait_for_url('**/dashboard', timeout=10000)
    print("   ✓ 登录成功")
    
    # 2. 跳转到版本火车页面
    print("\n2. 跳转到版本火车页面...")
    page.goto(f'{BASE_URL}/trains')
    page.wait_for_load_state('domcontentloaded')
    time.sleep(3)
    
    # 3. 检查表格行中的ID
    print("\n3. 检查表格数据...")
    rows = page.locator('table tbody tr')
    if rows.count() >= 2:
        # 检查第一行（数据行）
        first_row = rows.nth(1)
        
        # 尝试获取行元素的data-row-key属性
        row_key = first_row.get_attribute('data-row-key')
        print(f"   data-row-key: {row_key}")
        
        # 检查表格单元格
        cells = first_row.locator('td')
        for i in range(cells.count()):
            cell = cells.nth(i)
            cell_text = cell.inner_text()
            # 检查单元格中的链接
            links = cell.locator('a')
            if links.count() > 0:
                link_text = links.first.text_content()
                link_href = links.first.get_attribute('href')
                print(f"   列 {i+1}: {link_text} -> href={link_href}")
            else:
                print(f"   列 {i+1}: {cell_text[:50]}")
        
        # 检查表格行的data-source属性
        data_source = first_row.get_attribute('data-source')
        if data_source:
            print(f"\n   data-source: {data_source[:200]}...")
    else:
        print(f"   ✗ 没有找到数据行（只有{rows.count()}行）")
    
    # 4. 检查API调用
    print("\n4. 检查API响应...")
    # 拦截API响应
    api_responses = []
    def handle_response(response):
        if '/api/trains' in response.url:
            api_responses.append(response)
    
    page.on('response', handle_response)
    page.reload()
    page.wait_for_load_state('domcontentloaded')
    time.sleep(2)
    
    if api_responses:
        for resp in api_responses:
            if resp.status == 200:
                try:
                    data = resp.json()
                    if 'data' in data and len(data['data']) > 0:
                        first_train = data['data'][0]
                        print(f"   第一个火车:")
                        print(f"   - ID: {first_train.get('id')}")
                        print(f"   - 名称: {first_train.get('name')}")
                        
                        # 检查是否有班次
                        if 'schedules' in first_train:
                            schedules = first_train['schedules']
                            print(f"   - 班次数: {len(schedules)}")
                            if schedules:
                                first_schedule = schedules[0]
                                print(f"   - 第一个班次:")
                                print(f"     - ID: {first_schedule.get('id')}")
                                print(f"     - 名称: {first_schedule.get('name')}")
                except Exception as e:
                    print(f"   解析失败: {e}")
    else:
        print("   ✗ 未找到API响应")
    
    # 截图
    page.screenshot(path='trains-list.png')
    print("\n   截图已保存: trains-list.png")
    
    # 保持浏览器打开
    time.sleep(10)
    
    browser.close()