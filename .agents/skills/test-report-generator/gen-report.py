#!/usr/bin/env python3
"""
test-report-generator - 自测报告生成脚本
执行顺序：test-strategy-planner → unit-test-governance → 补充L2/L3/M测试 → test-report-generator

Version 1.3 | 2026-06-30
"""

import os
import sys
import re
import glob
import subprocess
from datetime import datetime
from typing import Dict, List, Optional, Tuple

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


def read_project_config(repo_root: str) -> Dict:
    """
    读取项目公共配置文件
    
    Args:
        repo_root: Git 仓库根目录
    
    Returns:
        Dict: 配置内容，配置不存在时返回默认值
    """
    config_path = os.path.join(repo_root, 'config', 'project-config.yaml')
    
    if HAS_YAML and os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception:
            pass
    
    return {
        'paths': {
            'governance': {
                'test_strategy': 'reports/test-strategy',
                'unit_test_governance': 'reports/unit-test-governance',
                'test_report': 'reports/test-report',
                'evidence': 'evidence'
            },
            'backend': {
                'api_tests': ['**/*.api.test.ts', '**/*.api.spec.ts'],
                'coverage_report': 'release-train/apps/server/coverage'
            },
            'frontend': {
                'ui_tests': ['**/*.e2e.test.ts', '**/*.e2e.spec.ts'],
                'test_results': 'release-train/apps/web/test-results'
            }
        }
    }


def get_git_info() -> Tuple[str, str, str]:
    """
    获取当前 Git 分支和 Commit 信息
    
    Returns:
        Tuple[str, str, str]: (repo_root, git_info, current_branch)
    """
    try:
        repo_root = subprocess.check_output(
            ['git', 'rev-parse', '--show-toplevel'],
            capture_output=True, text=True
        ).strip()
        branch = subprocess.check_output(
            ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
            capture_output=True, text=True, cwd=repo_root
        ).strip()
        commit = subprocess.check_output(
            ['git', 'rev-parse', 'HEAD'],
            capture_output=True, text=True, cwd=repo_root
        ).strip()[:8]
        return repo_root, f"{branch}@{commit}", branch
    except Exception:
        return "", "未知", ""


def get_changed_files(repo_root: str, current_branch: str, base_branch: str = 'main') -> Tuple[List[str], str]:
    """
    获取当前分支相对于 base_branch 的变更文件
    
    Args:
        repo_root: Git 仓库根目录
        current_branch: 当前分支名
        base_branch: 基准分支名
    
    Returns:
        Tuple[List[str], str]: (变更文件列表, merge_base)
    """
    try:
        merged_base = subprocess.check_output(
            ['git', 'merge-base', base_branch, current_branch],
            capture_output=True, text=True, cwd=repo_root
        ).strip()
        diff_output = subprocess.check_output(
            ['git', 'diff', '--name-only', merged_base, current_branch],
            capture_output=True, text=True, cwd=repo_root
        ).strip()
        files = [f.strip() for f in diff_output.split('\n') if f.strip()]
        # 保留前后端及其他应用源代码，排除测试资产；不能只统计后端。
        src_files = [
            f for f in files
            if '/src/' in f
            and f.endswith(('.ts', '.tsx', '.js', '.jsx', '.java', '.kt'))
            and '.test.' not in f
            and '.spec.' not in f
        ]
        return src_files, merged_base[:8]
    except Exception:
        return [], ""


def parse_unit_test_governance(report_path: str) -> Optional[Dict]:
    """
    解析 unit-test-governance 报告，提取 L1 门禁结论
    
    Args:
        report_path: unit-test-governance 报告路径
    
    Returns:
        Dict: 包含门禁摘要、L1覆盖现状、需补充清单等
    """
    if not os.path.exists(report_path):
        return None
    
    with open(report_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    result = {
        'gate_summary': [],
        'l1_coverage_status': [],
        'need_supplement': [],
        'final_decision': '未知',
        'report_stage': '未知'
    }
    
    # 兼容旧四列表格和当前治理模板的两列表格。
    gate_pattern = re.compile(r'^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$')
    summary_pattern = re.compile(r'^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$')
    in_gate_section = False
    for line in content.split('\n'):
        if '## 1. 单测门禁摘要' in line or '## 单测门禁摘要' in line:
            in_gate_section = True
            continue
        if in_gate_section and line.startswith('##'):
            in_gate_section = False
        if in_gate_section and line.startswith('|'):
            match = gate_pattern.match(line)
            if match and '门禁项' not in line and '项目' not in line:
                result['gate_summary'].append({
                    'item': match.group(1),
                    'current': match.group(2),
                    'required': match.group(3),
                    'status': match.group(4)
                })
                continue
            summary_match = summary_pattern.match(line)
            if summary_match and summary_match.group(1).strip() == '报告阶段':
                result['report_stage'] = summary_match.group(2).strip()
                continue
            if summary_match and summary_match.group(1) in ('单测通过率', '增量覆盖率', '覆盖率门禁', '最终结论'):
                item = summary_match.group(1).strip()
                current = summary_match.group(2).strip()
                required = {'单测通过率': '100%', '增量覆盖率': '>80%'}.get(item, '-')
                result['gate_summary'].append({
                    'item': item,
                    'current': current,
                    'required': required,
                    'status': '待复核'
                })
    
    # 提取最终决策
    decision_match = re.search(r'(?:最终决策|决策|最终结论)[：:\s]*\|?\s*([^|\n]+)', content)
    if decision_match:
        result['final_decision'] = decision_match.group(1).strip()
    
    # 提取需补充单测清单
    # 格式：| 优先级 | 文件 | 检查点/变更逻辑 | 建议测试用例名 | 推荐测试层级 |
    supplement_pattern = re.compile(r'\| (P\d) \| (.+) \| (.+) \| (.+) \| (L\d) \|')
    in_supplement_section = False
    for line in content.split('\n'):
        if '## 6. 需补充单测清单' in line or '## 需补充单测清单' in line:
            in_supplement_section = True
            continue
        if in_supplement_section and line.startswith('##'):
            in_supplement_section = False
        if in_supplement_section and line.startswith('|'):
            match = supplement_pattern.match(line)
            if match and '优先级' not in line:
                result['need_supplement'].append({
                    'priority': match.group(1),
                    'file': match.group(2),
                    'checkpoint': match.group(3),
                    'test_name': match.group(4),
                    'level': match.group(5)
                })
    
    # 提取自测检查点 L1 覆盖现状
    # 格式：| 检查点 | 优先级 | 现有单测是否已覆盖 | 证据来源 |
    checkpoint_pattern = re.compile(r'\| (.+) \| (P\d) \| (.+) \| (.+) \|')
    in_checkpoint_section = False
    for line in content.split('\n'):
        if '## 5. 自测检查点 L1 覆盖现状' in line or '## 自测检查点 L1 覆盖现状' in line:
            in_checkpoint_section = True
            continue
        if in_checkpoint_section and line.startswith('##'):
            in_checkpoint_section = False
        if in_checkpoint_section and line.startswith('|'):
            match = checkpoint_pattern.match(line)
            if match and '检查点' not in line:
                result['l1_coverage_status'].append({
                    'checkpoint': match.group(1),
                    'priority': match.group(2),
                    'covered': match.group(3),
                    'evidence': match.group(4)
                })
    
    return result


def parse_test_strategy(report_path: str) -> Optional[Dict]:
    """
    解析 test-strategy-planner 报告，提取 L2/L3/M 策略
    
    Args:
        report_path: 测试策略报告路径
    
    Returns:
        Dict: 包含策略标题、L2/L3/M 测试范围等
    """
    if not os.path.exists(report_path):
        return None
    
    with open(report_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    result = {
        'title': '',
        'l1_cases': [],
        'l2_apis': [],
        'l3_journeys': [],
        'm_manual': [],
        'coverage_targets': {}
    }
    
    # 提取标题
    title_match = re.search(r'^#\s*(.+)$', content, re.MULTILINE)
    if title_match:
        result['title'] = title_match.group(1)

    # 解析 planner 当前主报告第 3 节案例矩阵，避免依赖旧的 L2/L3 独立章节。
    in_case_matrix = False
    for line in content.split('\n'):
        if '## 3. 测试案例分层策略与需求-案例覆盖矩阵' in line:
            in_case_matrix = True
            continue
        if in_case_matrix and line.startswith('##'):
            in_case_matrix = False
        if in_case_matrix and line.startswith('|'):
            cells = [cell.strip() for cell in line.strip().strip('|').split('|')]
            if len(cells) >= 8 and '测试案例' not in cells[1] and '---' not in cells[0]:
                level = cells[3]
                # planner 的第 3 节只提供策略与执行准备，不能把优先级或待办当作执行覆盖证据。
                case = {
                    'case': cells[1],
                    'goal': cells[2],
                    'level': level,
                    'execution_preparation': cells[5]
                }
                if 'L1 后端单测' in level:
                    result['l1_cases'].append(case)
                if 'L2' in level:
                    result['l2_apis'].append({
                        'path': cells[1],
                        'method': level,
                        'test_file': '',
                        'execution_preparation': cells[5]
                    })
                if 'L3' in level:
                    result['l3_journeys'].append({
                        'name': cells[1],
                        'test_file': '',
                        'execution_preparation': cells[5]
                    })
                if 'M' in level:
                    result['m_manual'].append({
                        'item': cells[1],
                        'evidence_file': '',
                        'execution_preparation': cells[5]
                    })
    
    # 提取 L2 API 测试范围
    # 格式：| API 路径 | 测试方式 | 测试文件 | 覆盖逻辑 |
    api_pattern = re.compile(r'\| `([^`]+)` \| (.+) \| (.+) \| (.+) \|')
    in_l2_section = False
    for line in content.split('\n'):
        if '## L2' in line or 'L2 接口自动化' in line:
            in_l2_section = True
            continue
        if in_l2_section and line.startswith('##'):
            in_l2_section = False
        if in_l2_section and line.startswith('|'):
            match = api_pattern.match(line)
            if match and 'API 路径' not in line:
                result['l2_apis'].append({
                    'path': match.group(1),
                    'method': match.group(2),
                    'test_file': match.group(3),
                    'coverage': match.group(4)
                })
    
    # 提取 L3 UI 测试范围
    # 格式：| Journey | 测试文件 | 测试状态 | 截图证据 |
    journey_pattern = re.compile(r'\| (.+Journey.+) \| (.+) \| (.+) \| (.+) \|')
    in_l3_section = False
    for line in content.split('\n'):
        if '## L3' in line or 'L3 UI 自动化' in line:
            in_l3_section = True
            continue
        if in_l3_section and line.startswith('##'):
            in_l3_section = False
        if in_l3_section and line.startswith('|'):
            match = journey_pattern.match(line)
            if match and 'Journey' not in line:
                result['l3_journeys'].append({
                    'name': match.group(1),
                    'test_file': match.group(2),
                    'status': match.group(3),
                    'evidence': match.group(4)
                })
    
    # 提取 M 人工验证范围
    # 格式：| 验证项 | 证据文件 | 验证结果 |
    manual_pattern = re.compile(r'\| (.+) \| (.+) \| (.+) \|')
    in_m_section = False
    for line in content.split('\n'):
        if '## M' in line or 'M 人工验证' in line:
            in_m_section = True
            continue
        if in_m_section and line.startswith('##'):
            in_m_section = False
        if in_m_section and line.startswith('|'):
            match = manual_pattern.match(line)
            if match and '验证项' not in line:
                result['m_manual'].append({
                    'item': match.group(1),
                    'evidence_file': match.group(2),
                    'result': match.group(3)
                })
    
    # 提取覆盖率目标
    target_pattern = re.compile(r'(\S+覆盖率)\s*[≥>]\s*(\d+)%')
    for match in target_pattern.finditer(content):
        result['coverage_targets'][match.group(1)] = int(match.group(2))
    
    return result


def find_l2_api_tests(project_root: str, configured_patterns: Optional[List[str]] = None) -> List[str]:
    """
    检索 L2 API 测试文件
    
    Args:
        project_root: 项目根目录
    
    Returns:
        List[str]: API 测试文件路径列表
    """
    patterns = configured_patterns or [
        '**/*.api.test.ts', '**/*.api.spec.ts', '**/api/**/*.test.ts', '**/__tests__/api*.ts'
    ]
    
    test_files = []
    for pattern in patterns:
        files = glob.glob(os.path.join(project_root, pattern), recursive=True)
        test_files.extend(files)
    
    return list(set(test_files))


def find_l3_ui_tests(project_root: str, configured_patterns: Optional[List[str]] = None, result_dir: Optional[str] = None) -> Tuple[List[str], Optional[str]]:
    """
    检索 L3 UI 测试文件和 playwright 报告
    
    Args:
        project_root: 项目根目录
    
    Returns:
        Tuple[List[str], Optional[str]]: (UI测试文件列表, playwright报告路径)
    """
    patterns = configured_patterns or ['**/*.e2e.test.ts', '**/*.e2e.spec.ts']
    
    test_files = []
    for pattern in patterns:
        files = glob.glob(os.path.join(project_root, pattern), recursive=True)
        test_files.extend(files)
    
    playwright_report = None
    report_candidates = [os.path.join(project_root, 'playwright-report', 'index.html')]
    if result_dir:
        report_candidates.append(os.path.join(project_root, result_dir, 'playwright-report', 'index.html'))
    for report_path in report_candidates:
        if os.path.exists(report_path):
            playwright_report = report_path
            break
    
    return list(set(test_files)), playwright_report


def find_manual_evidence(scope: str, project_root: str, evidence_base_dir: str = 'evidence') -> Dict:
    """
    检索人工验证证据目录
    
    Args:
        scope: 需求范围标识
        project_root: 项目根目录
        evidence_base_dir: 证据基目录（从配置读取）
    
    Returns:
        Dict: 包含 summary.md、截图、日志等证据
    """
    evidence_dir = os.path.join(project_root, evidence_base_dir, scope)
    
    result = {
        'summary': None,
        'screenshots': [],
        'logs': [],
        'status': '待复核'
    }
    
    if not os.path.exists(evidence_dir):
        return result
    
    # 检索 summary.md
    summary_files = glob.glob(os.path.join(evidence_dir, '**', 'summary.md'), recursive=True)
    if summary_files:
        result['summary'] = summary_files[0]
        try:
            with open(summary_files[0], 'r', encoding='utf-8') as summary_file:
                summary = summary_file.read()
            if re.search(r'(?:结论|验证结果|状态)\s*[：:]\s*(?:通过|已通过)', summary):
                result['status'] = '已通过'
            elif re.search(r'(?:结论|验证结果|状态)\s*[：:]\s*(?:不通过|失败|阻塞)', summary):
                result['status'] = '未通过'
        except OSError:
            result['status'] = '待复核'
    
    # 检索截图
    screenshot_files = glob.glob(os.path.join(evidence_dir, '**', '*.png'), recursive=True)
    result['screenshots'] = screenshot_files
    
    # 检索日志
    log_files = glob.glob(os.path.join(evidence_dir, '**', '*.log'), recursive=True)
    result['logs'] = log_files
    
    return result


def generate_report(
    scope: str,
    unit_gov: Optional[Dict],
    test_strategy: Optional[Dict],
    l2_tests: List[str],
    l3_tests: List[str],
    playwright_report: Optional[str],
    manual_evidence: Dict,
    git_info: Tuple[str, str, str],
    changed_files: Tuple[List[str], str]
) -> str:
    """
    生成最终自测报告
    
    Args:
        scope: 需求范围标识
        unit_gov: unit-test-governance 报告解析结果
        test_strategy: test-strategy 报告解析结果
        l2_tests: L2 API 测试文件列表
        l3_tests: L3 UI 测试文件列表
        playwright_report: playwright 报告路径
        manual_evidence: 人工验证证据
        git_info: Git 信息 (repo_root, git_info, current_branch)
        changed_files: 变更文件 (文件列表, merge_base)
    
    Returns:
        str: 生成的报告内容
    """
    repo_root, git_branch_commit, current_branch = git_info
    changed_file_list, merge_base = changed_files
    
    now = datetime.now()
    date_str = now.strftime('%Y%m%d')
    time_str = now.strftime('%Y-%m-%d %H:%M:%S')
    
    report = f"""# ST-{scope}-自测报告_{date_str}

## 基本信息

| 项目 | 内容 |
| --- | --- |
| 报告编号 | ST-{date_str}-001 |
| 生成时间 | {time_str} |
| 执行环境 | Node.js / macOS |
| Git 分支/Commit | {git_branch_commit} |
| 测试人员 | 开发人员 |

"""
    
    # 测试策略概览
    if test_strategy:
        report += f"""## 测试策略概览

本次测试基于 **{test_strategy['title']}**，采用三层叠加覆盖策略：

| 层级 | 工具 | 覆盖范围 | 目标 |
|------|------|---------|------|
| **L1 单元测试** | Vitest | service.ts 纯函数、校验逻辑 | 增量覆盖率 >80%，通过率 100% |
| **L2 接口自动化** | Vitest + Supertest | API 契约、鉴权、参数、状态流转 | 按策略和真实执行结果判定 |
| **L3 UI 自动化** | Playwright | 关键用户旅程、UI 交互 | 覆盖核心用户旅程 |
| **M 人工验证** | SIT 环境 + 截图 | 低频 UI、截图确认 | 保留可审计证据 |

### 覆盖率目标
| 指标 | 目标值 |
|------|-------|
| L1 增量覆盖率 | >80% |
| L1 单测通过率 | 100% |

"""
    
    # L1 单元测试门禁结论（直接引用最终版 unit-test-governance）
    if unit_gov:
        report += """## L1 单元测试门禁结论
（直接引用最终版 unit-test-governance 报告）

| 门禁项 | 当前值 | 达标要求 | 状态 |
|--------|--------|----------|------|
"""
        for gate in unit_gov['gate_summary']:
            report += f"| {gate['item']} | {gate['current']} | {gate['required']} | {gate['status']} |\n"
        
        decision = unit_gov['final_decision']
        decision_status = '✅' if decision in ('通过', '✅ 通过') and unit_gov.get('report_stage') == '最终版' else '⚠️'
        report += f"| 最终决策 | {decision} | - | {decision_status} |\n"
        
        # 需补充单测清单
        if unit_gov['need_supplement']:
            report += """
**需补充单测清单**（来自 unit-test-governance）：

| 优先级 | 文件 | 检查点/变更逻辑 | 建议测试用例名 | 推荐测试层级 |
|--------|------|----------|------------|------|
"""
            for item in unit_gov['need_supplement']:
                report += f"| {item['priority']} | {item['file']} | {item['checkpoint']} | {item['test_name']} | {item['level']} |\n"
        else:
            report += "\n**需补充单测清单**：无\n"
    else:
        report += """## L1 单元测试门禁结论
⚠️ 未提供 unit-test-governance 报告，无法评估 L1 门禁状态。

"""
    
    # L2 接口自动化覆盖分析
    report += """## L2 接口自动化覆盖分析
（检索最新 API 测试文件）

"""
    if l2_tests:
        report += "| API 路径 | 测试文件 | 测试状态 | 覆盖逻辑 |\n"
        report += "|----------|----------|----------|----------|\n"
        for test_file in l2_tests:
            short_path = test_file.split('/src/')[-1] if '/src/' in test_file else test_file
            report += f"| 待分析 | {short_path} | ⚠️ 已发现文件，未取得执行结果 | 待复核 |\n"
    elif test_strategy and test_strategy['l2_apis']:
        report += "| API 路径 | 测试文件 | 测试状态 | 覆盖逻辑 |\n"
        report += "|----------|----------|----------|----------|\n"
        for api in test_strategy['l2_apis']:
            report += f"| `{api['path']}` | {api['test_file']} | ⚠️ 仅有测试策略，未取得执行证据 | {api['execution_preparation']} |\n"
    else:
        report += "⚠️ 未找到 L2 API 测试文件。\n"
    
    # L3 UI 自动化覆盖分析
    report += "\n## L3 UI 自动化覆盖分析\n"
    report += "（检索最新 Playwright 测试文件和报告）\n\n"
    
    if l3_tests or playwright_report:
        report += "| Journey | 测试文件 | 测试状态 | 截图证据 |\n"
        report += "|---------|----------|----------|----------|\n"
        for test_file in l3_tests:
            short_path = test_file.split('/src/')[-1] if '/src/' in test_file else test_file
            report += f"| 待分析 | {short_path} | ⚠️ 已发现文件，未取得执行结果 | 待复核 |\n"
        if playwright_report:
            report += f"| Playwright 报告 | {playwright_report.split('/')[-2]} | ⚠️ 已发现报告，未取得执行结论 | 待复核 |\n"
    elif test_strategy and test_strategy['l3_journeys']:
        report += "| Journey | 测试文件 | 测试状态 | 截图证据 |\n"
        report += "|---------|----------|----------|----------|\n"
        for journey in test_strategy['l3_journeys']:
            report += f"| {journey['name']} | {journey['test_file']} | ⚠️ 仅有测试策略，未取得执行证据 | {journey['execution_preparation']} |\n"
    else:
        report += "⚠️ 未找到 L3 UI 测试文件或 Playwright 报告。\n"
    
    # M 人工验证证据汇总
    report += "\n## M 人工验证证据汇总\n"
    report += "（读取 `{paths.governance.evidence}/{scope}/` 目录，路径从配置读取）\n\n"
    
    if manual_evidence['summary'] or manual_evidence['screenshots'] or manual_evidence['logs']:
        report += "| 验证项 | 证据文件 | 验证结果 |\n"
        report += "|--------|----------|----------|\n"
        if manual_evidence['summary']:
            report += f"| 人工验证摘要 | summary.md | {manual_evidence['status']} |\n"
        if manual_evidence['screenshots']:
            for screenshot in manual_evidence['screenshots']:
                # 从任意 evidence_base_dir 中提取相对路径
                parts = screenshot.split('/')
                if 'evidence' in parts:
                    idx = parts.index('evidence')
                    short_path = '/'.join(parts[idx+1:])
                else:
                    short_path = os.path.basename(screenshot)
                report += f"| 截图证据 | {short_path} | 已提供证据，结论待复核 |\n"
        if manual_evidence['logs']:
            for log in manual_evidence['logs']:
                parts = log.split('/')
                if 'evidence' in parts:
                    idx = parts.index('evidence')
                    short_path = '/'.join(parts[idx+1:])
                else:
                    short_path = os.path.basename(log)
                report += f"| 日志证据 | {short_path} | 已提供证据，结论待复核 |\n"
    elif test_strategy and test_strategy['m_manual']:
        report += "| 验证项 | 证据文件 | 验证结果 |\n"
        report += "|--------|----------|----------|\n"
        for item in test_strategy['m_manual']:
            report += f"| {item['item']} | {item['evidence_file']} | ⚠️ 仅有测试策略，未取得执行证据 |\n"
    else:
        report += "⚠️ 未找到人工验证证据目录。\n"
    
    # 测试结果明细
    report += "\n## 测试结果明细\n"
    report += "（整合策略对照表 + 最新测试文件覆盖分析 + 人工验证证据）\n\n"
    report += "| 测试案例编号 | 测试方式 | 测试文件 | 执行结果 | 覆盖状态 |\n"
    report += "|--------------|----------|----------|----------|----------|\n"
    report += "| 待补充 | 待分析 | 待执行 | 待确认 | 待判定 |\n"
    
    # 自测检查点覆盖摘要（双报告整合）
    report += "\n## 自测检查点覆盖摘要（双报告整合）\n\n"
    report += "| 检查点 | 层级 | 优先级 | 覆盖状态 | 证据来源 |\n"
    report += "|--------|------|--------|----------|----------|\n"
    
    if unit_gov and unit_gov['l1_coverage_status']:
        for checkpoint in unit_gov['l1_coverage_status']:
            report += f"| {checkpoint['checkpoint']} | L1 | {checkpoint['priority']} | {checkpoint['covered']} | {checkpoint['evidence']} |\n"
    
    # L2/L3/M 检查点（基于测试分析判定）
    if test_strategy:
        for api in test_strategy['l2_apis']:
            report += f"| API: {api['path']} | L2 | P1 | 待判定 | 策略待执行：{api['execution_preparation']} |\n"
        for journey in test_strategy['l3_journeys']:
            report += f"| UI: {journey['name']} | L3 | P1 | 待判定 | 策略待执行：{journey['execution_preparation']} |\n"
        for item in test_strategy['m_manual']:
            report += f"| 人工: {item['item']} | M | P2 | 待判定 | 策略待执行：{item['execution_preparation']} |\n"
    
    # 执行概要
    report += "\n## 执行概要\n\n"
    report += "| 指标 | 值 | 状态 |\n"
    report += "|------|-----|------|\n"
    report += f"| L1 总测试数 | 待统计 | 待执行 |\n"
    report += f"| L1 通过数 | 待统计 | 待执行 |\n"
    report += f"| L2 API 测试数 | {len(l2_tests)} | {'✅' if l2_tests else '⚠️'} |\n"
    report += f"| L3 UI 测试数 | {len(l3_tests)} | {'✅' if l3_tests else '⚠️'} |\n"
    report += f"| M 人工验证数 | {len(manual_evidence['screenshots']) + len(manual_evidence['logs'])} | {'✅' if manual_evidence['summary'] else '⚠️'} |\n"
    
    # 结论
    report += "\n## 结论\n\n"
    report += "| 项目 | 状态 |\n"
    report += "|------|------|\n"
    
    l1_passed = bool(unit_gov and unit_gov.get('report_stage') == '最终版' and unit_gov.get('final_decision') in ('通过', '✅ 通过'))
    l1_pending = bool(unit_gov and unit_gov.get('report_stage') != '最终版')
    l1_status = '✅ 通过' if l1_passed else ('⚠️ 待复核' if l1_pending else '⚠️ 未通过/阻塞')
    l2_status = '⚠️ 待复核' if l2_tests else '⚠️ 缺失'
    l3_status = '⚠️ 待复核' if l3_tests or playwright_report else '⚠️ 缺失'
    m_status = '✅ 已完成' if manual_evidence['status'] == '已通过' else ('⚠️ 未通过' if manual_evidence['status'] == '未通过' else '⚠️ 待复核')
    
    report += f"| L1 单测门禁 | {l1_status} |\n"
    report += f"| L2 API 自动化 | {l2_status} |\n"
    report += f"| L3 UI 自动化 | {l3_status} |\n"
    report += f"| M 人工验证 | {m_status} |\n"
    
    # 整体交付建议
    has_l2_strategy = bool(test_strategy and test_strategy['l2_apis'])
    has_l3_strategy = bool(test_strategy and test_strategy['l3_journeys'])
    has_m_strategy = bool(test_strategy and test_strategy['m_manual'])
    optional_layers_clear = ((not has_l2_strategy or l2_status.startswith('✅')) and
                             (not has_l3_strategy or l3_status.startswith('✅')) and
                             (not has_m_strategy or m_status.startswith('✅')))
    if l1_status.startswith('✅') and optional_layers_clear:
        delivery = '可提测'
    elif l1_status.startswith('⚠️'):
        delivery = '不建议提测'
    else:
        delivery = '有条件提测'
    
    report += f"| 整体交付建议 | {delivery} |\n"
    
    return report


def select_latest_report(paths: List[str]) -> Optional[str]:
    """按版本、日期和文件修改时间选择最新报告，避免随机取第一个文件。"""
    if not paths:
        return None

    def key(path: str) -> Tuple[float, str, float]:
        name = os.path.basename(path)
        version_match = re.search(r'_v(\d+(?:\.\d+)?)_', name)
        date_match = re.search(r'_(\d{8})\.md$', name)
        version = float(version_match.group(1)) if version_match else 0.0
        date = date_match.group(1) if date_match else ''
        return version, date, os.path.getmtime(path)

    return max(paths, key=key)


def next_report_path(output_dir: str, scope: str, date_str: str) -> str:
    """生成不覆盖旧文件的递增版本路径。"""
    pattern = os.path.join(output_dir, f'ST-{scope}-自测报告_v*_{date_str}.md')
    versions = []
    for path in glob.glob(pattern):
        match = re.search(r'_v(\d+(?:\.\d+)?)_', os.path.basename(path))
        if match:
            versions.append(float(match.group(1)))
    next_version = (max(versions) + 0.1) if versions else 1.0
    return os.path.join(output_dir, f'ST-{scope}-自测报告_v{next_version:.1f}_{date_str}.md')


def validate_generated_report(path: str) -> List[str]:
    """验证报告已落盘且包含固定输出结构。"""
    errors = []
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        return ['报告文件不存在或为空']
    try:
        with open(path, 'r', encoding='utf-8') as report_file:
            content = report_file.read()
    except (OSError, UnicodeError) as exc:
        return [f'报告读取失败: {exc}']

    required_sections = [
        '## 基本信息', '## 测试策略概览', '## L1 单元测试门禁结论',
        '## L2 接口自动化覆盖分析', '## L3 UI 自动化覆盖分析',
        '## M 人工验证证据汇总', '## 测试结果明细',
        '## 自测检查点覆盖摘要（双报告整合）', '## 执行概要', '## 结论'
    ]
    for section in required_sections:
        if section not in content:
            errors.append(f'缺少章节: {section}')
    for header in ('| 门禁项 | 当前值 | 达标要求 | 状态 |', '| 测试案例编号 | 测试方式 | 测试文件 | 执行结果 | 覆盖状态 |'):
        if header not in content:
            errors.append(f'缺少关键表头: {header}')
    return errors


def main():
    """
    主函数：检索文件并生成报告
    """
    # 解析命令行参数
    if len(sys.argv) < 2:
        print("使用方法: python gen-report.py <scope>")
        print("示例: python gen-report.py T2-US2.3")
        sys.exit(1)
    
    scope = sys.argv[1]
    
    # 获取项目根目录
    repo_root = os.getcwd()
    
    # 读取项目配置
    config = read_project_config(repo_root)
    paths = config.get('paths', {})
    governance_paths = paths.get('governance', {})
    
    test_strategy_dir = governance_paths.get('test_strategy', 'reports/test-strategy')
    unit_gov_dir = governance_paths.get('unit_test_governance', 'reports/unit-test-governance')
    evidence_dir = governance_paths.get('evidence', 'evidence')
    
    # 检索文件（使用 ST- 前缀统一命名格式）
    test_strategy_pattern = f"{test_strategy_dir}/ST-{scope}-测试策略_*.md"
    unit_gov_pattern = f"{unit_gov_dir}/ST-{scope}-单测治理_*.md"
    
    test_strategy_path = None
    unit_gov_path = None
    
    # 检索测试策略报告
    strategy_files = glob.glob(test_strategy_pattern)
    test_strategy_path = select_latest_report(strategy_files)
    
    # 检索单测治理报告
    gov_files = glob.glob(unit_gov_pattern)
    unit_gov_path = select_latest_report(gov_files)
    
    # 检索 L2/L3 测试文件
    backend_config = paths.get('backend', {})
    frontend_config = paths.get('frontend', {})
    l2_tests = find_l2_api_tests(repo_root, backend_config.get('api_tests'))
    l3_tests, playwright_report = find_l3_ui_tests(
        repo_root,
        frontend_config.get('ui_tests'),
        frontend_config.get('test_results')
    )
    
    # 检索人工验证证据
    manual_evidence = find_manual_evidence(scope, repo_root, evidence_dir)
    
    # 获取 Git 信息
    git_info = get_git_info()
    changed_files = ([], "")
    if git_info[0] and git_info[2] and git_info[2] != "HEAD":
        changed_files = get_changed_files(git_info[0], git_info[2])
    
    # 输出确认清单
    print("=" * 60)
    print("文件检索结果：")
    print("=" * 60)
    print(f"测试策略报告: {test_strategy_path or '⚠️ 未找到'}")
    print(f"单测治理报告: {unit_gov_path or '⚠️ 未找到'}")
    print(f"L2 API 测试文件数: {len(l2_tests)}")
    print(f"L3 UI 测试文件数: {len(l3_tests)}")
    print(f"Playwright 报告: {playwright_report or '⚠️ 未找到'}")
    print(f"人工验证证据: {manual_evidence['summary'] or '⚠️ 未找到'}")
    print("=" * 60)
    
    # 解析报告
    unit_gov = parse_unit_test_governance(unit_gov_path) if unit_gov_path else None
    test_strategy = parse_test_strategy(test_strategy_path) if test_strategy_path else None
    
    # 生成报告
    report = generate_report(
        scope,
        unit_gov,
        test_strategy,
        l2_tests,
        l3_tests,
        playwright_report,
        manual_evidence,
        git_info,
        changed_files
    )
    
    # 输出报告
    output_dir = governance_paths.get('test_report', 'reports/test-report')
    os.makedirs(output_dir, exist_ok=True)
    
    date_str = datetime.now().strftime('%Y%m%d')
    output_path = next_report_path(output_dir, scope, date_str)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(report)
    
    validation_errors = validate_generated_report(output_path)
    if validation_errors:
        print(f"\n报告已生成但输出自检失败: {output_path}")
        for error in validation_errors:
            print(f"- {error}")
        sys.exit(2)
    print(f"\n报告已生成并通过输出自检: {output_path}")


if __name__ == '__main__':
    main()
