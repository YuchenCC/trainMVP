import requests
import json

BASE_URL = 'http://localhost:3000/api'

def create_user(username, password, role, displayName):
    print(f"创建用户: {username} ({role})")
    try:
        # 先尝试删除已存在的用户
        requests.delete(f"{BASE_URL}/users/{username}", headers={'Authorization': f'Bearer {admin_token}'})
    except:
        pass
    
    # 创建用户
    payload = {
        'username': username,
        'password': password,
        'displayName': displayName,
        'email': f'{username}@test.com',
        'role': role
    }
    
    try:
        # 尝试管理员登录
        login_res = requests.post(f"{BASE_URL}/auth/login", json={'username': 'admin', 'password': 'AdminPass123!'})
        if login_res.status_code == 200:
            admin_token = login_res.json()['data']['token']
            res = requests.post(f"{BASE_URL}/users", json=payload, headers={'Authorization': f'Bearer {admin_token}'})
            print(f"  状态: {res.status_code}")
            return res.status_code == 200
        else:
            print(f"  管理员登录失败，尝试直接注册")
            res = requests.post(f"{BASE_URL}/auth/register", json=payload)
            print(f"  状态: {res.status_code}")
            return res.status_code == 200
    except Exception as e:
        print(f"  创建失败: {e}")
        return False

def create_system(name):
    print(f"创建系统: {name}")
    try:
        login_res = requests.post(f"{BASE_URL}/auth/login", json={'username': 'admin', 'password': 'AdminPass123!'})
        if login_res.status_code == 200:
            admin_token = login_res.json()['data']['token']
            res = requests.post(f"{BASE_URL}/systems", json={'name': name, 'description': 'E2E测试系统'}, headers={'Authorization': f'Bearer {admin_token}'})
            print(f"  状态: {res.status_code}")
            if res.status_code == 200:
                return res.json()['data']['id']
        else:
            print("  管理员登录失败")
    except Exception as e:
        print(f"  创建失败: {e}")
    return None

def login(username, password):
    print(f"登录: {username}")
    try:
        res = requests.post(f"{BASE_URL}/auth/login", json={'username': username, 'password': password})
        if res.status_code == 200:
            token = res.json()['data']['token']
            print(f"  成功")
            return token
        else:
            print(f"  失败: {res.status_code}")
            return None
    except Exception as e:
        print(f"  失败: {e}")
        return None

def main():
    print("=== 初始化 E2E 测试数据 ===")
    
    # 创建测试用户
    users = [
        {'username': 'ba', 'password': 'BAPass123!', 'role': 'BA', 'displayName': '测试BA'},
        {'username': 'pm', 'password': 'PMPass123!', 'role': 'PM', 'displayName': '测试PM'},
        {'username': 'project_mgr', 'password': 'PMgrPass123!', 'role': 'PROJECT_MGR', 'displayName': '测试项目经理'},
        {'username': 'test_mgr', 'password': 'TestPass123!', 'role': 'TEST_MGR', 'displayName': '测试经理'},
    ]
    
    for user in users:
        create_user(user['username'], user['password'], user['role'], user['displayName'])
    
    # 创建测试系统
    system_id = create_system('E2E测试系统')
    
    # 验证登录
    print("\n=== 验证登录 ===")
    for user in users:
        token = login(user['username'], user['password'])
        if token:
            print(f"  {user['username']}: ✅ 登录成功")
        else:
            print(f"  {user['username']}: ❌ 登录失败")
    
    print("\n=== 测试数据初始化完成 ===")

if __name__ == '__main__':
    main()