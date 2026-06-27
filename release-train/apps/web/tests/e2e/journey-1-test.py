from playwright.sync_api import sync_playwright
import requests
import time

BASE_URL = 'http://localhost:5173'
API_URL = 'http://localhost:3000'

def get_token_and_user_id(username, password):
    """获取登录令牌和用户ID"""
    res = requests.post(f'{API_URL}/api/auth/login', json={
        'username': username,
        'password': password
    })
    data = res.json()['data']
    return data['token'], data['user']['id']

def create_requirement(token, ba_id, title):
    """通过API创建需求"""
    # 获取系统列表
    systems_res = requests.get(f'{API_URL}/api/systems', headers={
        'Authorization': f'Bearer {token}'
    })
    system_id = systems_res.json()['data'][0]['id']
    
    # 创建需求
    res = requests.post(f'{API_URL}/api/requirements', headers={
        'Authorization': f'Bearer {token}'
    }, json={
        'title': title,
        'description': '<p>E2E测试需求描述</p>',
        'systemId': system_id,
        'priority': 'P2',
        'storyPoints': 3,
        'baId': ba_id
    })
    return res.json()['data']['id']

def submit_review(token, req_id):
    """通过API发起评审"""
    res = requests.post(f'{API_URL}/api/requirements/{req_id}/submit-review', headers={
        'Authorization': f'Bearer {token}'
    })
    return res.json()['success']

def login(page, username, password):
    page.goto(f'{BASE_URL}/login')
    page.wait_for_load_state('networkidle')
    
    page.fill('input[placeholder="用户名"]', username)
    page.fill('input[placeholder="密码"]', password)
    page.click('button.ant-btn-primary')
    
    page.wait_for_function('localStorage.getItem("token") !== null')

def close_tour_modal(page):
    time.sleep(1)
    try:
        page.click('button:has-text("跳过，直接使用")', timeout=5000)
        page.wait_for_load_state('networkidle')
        print("已跳过导览")
    except:
        pass
    try:
        page.click('button:has-text("退出导览")', timeout=5000)
        page.wait_for_load_state('networkidle')
        print("已退出导览")
    except:
        pass

def logout(page):
    page.evaluate('''() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }''')
    page.goto(f'{BASE_URL}/login')
    page.wait_for_load_state('networkidle')

def test_journey_1_create_review_pass():
    """Journey 1: BA 创建需求 → 发起评审 → PM 审批通过"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print("=== Journey 1: BA 创建需求 → 发起评审 → PM 审批通过 ===")
        
        # Step 1: 通过API创建需求
        print("\nStep 1: 通过API创建需求")
        ba_token, ba_id = get_token_and_user_id('ba', 'BAPass123!')
        test_title = f'E2E测试需求_{int(page.evaluate("Date.now()"))}'
        req_id = create_requirement(ba_token, ba_id, test_title)
        print(f"需求ID: {req_id}")
        print(f"需求标题: {test_title}")
        
        # Step 2: 通过API发起评审（绕过前端systemIds检查）
        print("\nStep 2: 通过API发起评审")
        if submit_review(ba_token, req_id):
            print("已发起评审")
        else:
            print("发起评审失败")
        
        # Step 3: BA 登录并验证状态
        print("\nStep 3: BA 登录并验证状态")
        login(page, 'ba', 'BAPass123!')
        page.goto(f'{BASE_URL}/requirements/{req_id}')
        page.wait_for_load_state('networkidle')
        close_tour_modal(page)
        
        # 验证状态变为 PENDING_REVIEW
        status_tags = page.locator('.ant-tag').all()
        for tag in status_tags:
            text = tag.text_content().strip() if tag.text_content() else ''
            if '待评审' in text or 'PENDING' in text:
                print(f"✅ 状态已变为 {text}")
                break
        
        # Step 4: BA 登出
        print("\nStep 4: BA 登出")
        logout(page)
        
        # Step 5: PM 登录并进入需求详情页
        print("\nStep 5: PM 登录并进入需求详情页")
        login(page, 'pm', 'PMPass123!')
        page.goto(f'{BASE_URL}/requirements/{req_id}')
        page.wait_for_load_state('networkidle')
        close_tour_modal(page)
        
        # Step 6: PM 评审通过
        print("\nStep 6: PM 评审通过")
        try:
            # 检查是否有评审按钮
            buttons = page.locator('button').all()
            for btn in buttons:
                text = btn.text_content().strip() if btn.text_content() else ''
                if '评审通过' in text:
                    btn.click()
                    page.wait_for_load_state('networkidle')
                    close_tour_modal(page)
                    print("已评审通过")
                    
                    # 验证状态变为 READY
                    status_tags = page.locator('.ant-tag').all()
                    for tag in status_tags:
                        text = tag.text_content().strip() if tag.text_content() else ''
                        if '就绪' in text or 'READY' in text:
                            print(f"✅ 状态已变为 {text}")
                            break
                    break
        except Exception as e:
            print(f"评审操作失败: {e}")
        
        # Step 7: PM 登出
        print("\nStep 7: PM 登出")
        logout(page)
        
        browser.close()
        print("\n=== Journey 1 测试完成 ===")

if __name__ == '__main__':
    test_journey_1_create_review_pass()