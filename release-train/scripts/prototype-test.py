from playwright.sync_api import sync_playwright
import os

SCREENSHOT_DIR = '/tmp/prototype-screenshots'
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1400, 'height': 900})
    page = context.new_page()

    # Step 1: Login
    page.goto('http://localhost:5173/login')
    page.wait_for_load_state('networkidle')

    page.fill('#login_username', 'admin')
    page.fill('#login_password', 'admin123')
    page.click('button[type="submit"]')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1500)
    page.screenshot(path=f'{SCREENSHOT_DIR}/02-after-login.png', full_page=True)

    # Step 2: Requirements list page
    page.goto('http://localhost:5173/requirements')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)
    page.screenshot(path=f'{SCREENSHOT_DIR}/03-requirements-list.png', full_page=True)

    # Step 3: Click "新增需求" to show Variant A
    new_req_btn = page.locator('text=新增需求')
    if new_req_btn.count() > 0:
        new_req_btn.first.click()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(800)
        page.screenshot(path=f'{SCREENSHOT_DIR}/04-variant-A-classic-form.png', full_page=True)

    # Step 4: Switch to Variant B via URL
    page.goto('http://localhost:5173/requirements?variant=B')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)

    new_req_btn = page.locator('text=新增需求')
    if new_req_btn.count() > 0:
        new_req_btn.first.click()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(800)
        page.screenshot(path=f'{SCREENSHOT_DIR}/05-variant-B-step-wizard.png', full_page=True)

    # Step 5: Switch to Variant C via URL
    page.goto('http://localhost:5173/requirements?variant=C')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)

    new_req_btn = page.locator('text=新增需求')
    if new_req_btn.count() > 0:
        new_req_btn.first.click()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(800)
        page.screenshot(path=f'{SCREENSHOT_DIR}/06-variant-C-dual-pane.png', full_page=True)

    browser.close()
    print(f'Screenshots saved to {SCREENSHOT_DIR}')
