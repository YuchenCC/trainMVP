from playwright.sync_api import sync_playwright
import requests

BASE_URL = 'http://localhost:5173'
API_URL = 'http://localhost:3000'

def get_token_and_user_id(username, password):
    res = requests.post(f'{API_URL}/api/auth/login', json={
        'username': username,
        'password': password
    })
    data = res.json()['data']
    return data['token'], data['user']['id']

def create_requirement(token, ba_id, title):
    systems_res = requests.get(f'{API_URL}/api/systems', headers={
        'Authorization': f'Bearer {token}'
    })
    system_id = systems_res.json()['data'][0]['id']
    
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

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # 创建需求
        ba_token, ba_id = get_token_and_user_id('ba', 'BAPass123!')
        req_id = create_requirement(ba_token, ba_id, f'E2E测试需求_{int(page.evaluate("Date.now()"))}')
        print(f"需求ID: {req_id}")
        
        # BA 登录
        page.goto(f'{BASE_URL}/login')
        page.wait_for_load_state('networkidle')
        page.fill('input[placeholder="用户名"]', 'ba')
        page.fill('input[placeholder="密码"]', 'BAPass123!')
        page.click('button.ant-btn-primary')
        page.wait_for_function('localStorage.getItem("token") !== null')
        
        # 进入需求详情页
        page.goto(f'{BASE_URL}/requirements/{req_id}')
        page.wait_for_load_state('networkidle')
        
        import time
        time.sleep(2)
        
        # 关闭导览
        try:
            page.click('button:has-text("跳过，直接使用")', timeout=5000)
            page.wait_for_load_state('networkidle')
            print("已跳过导览")
        except:
            pass
        
        time.sleep(1)
        
        # 检查所有按钮
        buttons = page.locator('button').all()
        print(f"\n按钮数量: {len(buttons)}")
        for i, btn in enumerate(buttons):
            try:
                text = btn.text_content().strip() if btn.text_content() else ''
                if text and len(text) > 0:
                    print(f"  Button {i}: '{text}'")
            except:
                pass
        
        # 检查状态标签
        status_tags = page.locator('.ant-tag').all()
        print(f"\n状态标签数量: {len(status_tags)}")
        for i, tag in enumerate(status_tags):
            try:
                text = tag.text_content().strip() if tag.text_content() else ''
                print(f"  Tag {i}: '{text}'")
            except:
                pass
        
        browser.close()

if __name__ == '__main__':
    main()