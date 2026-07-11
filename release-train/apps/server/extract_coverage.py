import json
import glob

def extract_train_service_coverage():
    all_functions = {}
    
    for file_path in glob.glob('coverage/.tmp/coverage-*.json'):
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            if isinstance(data, list):
                for item in data:
                    url = item.get('url', '')
                    if 'train.service.ts' in url and 'unit.test' not in url:
                        print(f"Found train.service.ts in {file_path}")
                        print(f"URL: {url}")
                        functions = item.get('functions', [])
                        print(f"Functions count: {len(functions)}")
                        for func in functions:
                            func_name = func.get('functionName', '')
                            if func_name and func_name != '':
                                if func_name not in all_functions:
                                    all_functions[func_name] = {
                                        'covered': 0,
                                        'total': 0
                                    }
                                
                                for range_info in func.get('ranges', []):
                                    count = range_info.get('count', 0)
                                    all_functions[func_name]['total'] += 1
                                    if count > 0:
                                        all_functions[func_name]['covered'] += 1
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
    
    if not all_functions:
        print("No train.service.ts functions found in coverage data")
        return
    
    print("\ntrain.service.ts 函数覆盖情况:")
    print("-" * 80)
    print(f"{'函数名':<50} {'覆盖数':<10} {'总数':<10} {'覆盖率':<10}")
    print("-" * 80)
    
    total_covered = 0
    total_count = 0
    
    for func_name, stats in sorted(all_functions.items()):
        covered = stats['covered']
        total = stats['total']
        coverage = (covered / total * 100) if total > 0 else 0
        print(f"{func_name:<50} {covered:<10} {total:<10} {coverage:.1f}%")
        total_covered += covered
        total_count += total
    
    print("-" * 80)
    overall_coverage = (total_covered / total_count * 100) if total_count > 0 else 0
    print(f"{'总计':<50} {total_covered:<10} {total_count:<10} {overall_coverage:.1f}%")

if __name__ == '__main__':
    extract_train_service_coverage()