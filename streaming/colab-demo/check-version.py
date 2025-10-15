# ============================================
# 現在の環境の全ライブラリバージョン表示スクリプト
# ============================================

import sys
import subprocess
import json
from datetime import datetime

print("="*70)
print("📦 現在の Python 環境情報")
print("="*70)

# Python バージョン
print(f"\n🐍 Python バージョン: {sys.version}")
print(f"   実行パス: {sys.executable}")

# 重要なライブラリのバージョンを個別に表示
print("\n" + "="*70)
print("🔑 主要ライブラリのバージョン (このプロジェクトで使用)")
print("="*70)

critical_packages = [
    'torch',
    'torchvision',
    'diffusers',
    'transformers',
    'accelerate',
    'imageio',
    'pillow',
    'flask',
    'flask-cors',
    'pyngrok',
    'ipywidgets',
    'numpy',
    'gtts'
]

print("\n主要パッケージ:")
print("-" * 70)
for package in critical_packages:
    try:
        # パッケージをインポートしてバージョン取得
        if package == 'pillow':
            import PIL
            version = PIL.__version__
            print(f"  {package:20s} : {version}")
        elif package == 'flask-cors':
            import flask_cors
            version = flask_cors.__version__ if hasattr(flask_cors, '__version__') else 'N/A'
            print(f"  {package:20s} : {version}")
        else:
            module = __import__(package.replace('-', '_'))
            version = module.__version__ if hasattr(module, '__version__') else 'N/A'
            print(f"  {package:20s} : {version}")
    except ImportError:
        print(f"  {package:20s} : ❌ NOT INSTALLED")
    except Exception as e:
        print(f"  {package:20s} : ⚠️ Error: {str(e)}")

# pip freeze で全パッケージを取得
print("\n" + "="*70)
print("📋 インストール済み全パッケージ (pip freeze)")
print("="*70)

result = subprocess.run(['pip', 'freeze'], capture_output=True, text=True)
all_packages = result.stdout.strip().split('\n')

print(f"\n合計 {len(all_packages)} パッケージがインストールされています\n")

# カテゴリ別に分類
ml_packages = []
web_packages = []
util_packages = []
other_packages = []

ml_keywords = ['torch', 'diffus', 'transform', 'accelerate', 'tensor', 'cuda', 'nn', 'neural']
web_keywords = ['flask', 'ngrok', 'cors', 'requests', 'urllib', 'http']
util_keywords = ['numpy', 'pillow', 'imageio', 'ipython', 'jupyter', 'widget', 'pandas']

for pkg in all_packages:
    pkg_lower = pkg.lower()
    if any(keyword in pkg_lower for keyword in ml_keywords):
        ml_packages.append(pkg)
    elif any(keyword in pkg_lower for keyword in web_keywords):
        web_packages.append(pkg)
    elif any(keyword in pkg_lower for keyword in util_keywords):
        util_packages.append(pkg)
    else:
        other_packages.append(pkg)

print("🤖 機械学習関連パッケージ:")
print("-" * 70)
for pkg in sorted(ml_packages):
    print(f"  {pkg}")

print("\n🌐 Web/ネットワーク関連パッケージ:")
print("-" * 70)
for pkg in sorted(web_packages):
    print(f"  {pkg}")

print("\n🛠 ユーティリティ関連パッケージ:")
print("-" * 70)
for pkg in sorted(util_packages):
    print(f"  {pkg}")

print("\n📦 その他のパッケージ:")
print("-" * 70)
for pkg in sorted(other_packages)[:20]:  # 最初の20個だけ表示
    print(f"  {pkg}")
if len(other_packages) > 20:
    print(f"  ... 他 {len(other_packages) - 20} パッケージ")

# requirements.txt 形式で出力
print("\n" + "="*70)
print("💾 requirements.txt 形式で保存")
print("="*70)

requirements_content = f"""# Python環境のパッケージリスト
# 生成日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
# Python バージョン: {sys.version.split()[0]}

# ============================================
# 主要パッケージ (厳密なバージョン指定)
# ============================================
"""

for package in critical_packages:
    try:
        if package == 'pillow':
            import PIL
            version = PIL.__version__
            requirements_content += f"{package}=={version}\n"
        elif package == 'flask-cors':
            import flask_cors
            if hasattr(flask_cors, '__version__'):
                requirements_content += f"{package}=={flask_cors.__version__}\n"
            else:
                # pip freezeから取得
                for pkg in all_packages:
                    if pkg.lower().startswith('flask-cors'):
                        requirements_content += f"{pkg}\n"
                        break
        else:
            module = __import__(package.replace('-', '_'))
            if hasattr(module, '__version__'):
                requirements_content += f"{package}=={module.__version__}\n"
            else:
                # pip freezeから取得
                for pkg in all_packages:
                    if pkg.lower().startswith(package.lower()):
                        requirements_content += f"{pkg}\n"
                        break
    except:
        pass

requirements_content += "\n# ============================================\n"
requirements_content += "# その他の依存パッケージ (全リスト)\n"
requirements_content += "# ============================================\n"
requirements_content += "\n".join(sorted(all_packages))

# ファイルに保存
with open('/content/requirements.txt', 'w') as f:
    f.write(requirements_content)

print("\n✅ requirements.txt を /content/requirements.txt に保存しました")
print("\n📥 ダウンロード用コマンド:")
print("   from google.colab import files")
print("   files.download('/content/requirements.txt')")

# CUDAバージョン確認
print("\n" + "="*70)
print("🖥️ CUDA/GPU 情報")
print("="*70)

try:
    import torch
    print(f"\nPyTorch CUDA利用可能: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"CUDA バージョン: {torch.version.cuda}")
        print(f"cuDNN バージョン: {torch.backends.cudnn.version()}")
        print(f"GPU デバイス数: {torch.cuda.device_count()}")
        for i in range(torch.cuda.device_count()):
            print(f"  GPU {i}: {torch.cuda.get_device_name(i)}")
            print(f"    メモリ: {torch.cuda.get_device_properties(i).total_memory / 1024**3:.2f} GB")
except Exception as e:
    print(f"⚠️ CUDA情報の取得に失敗: {e}")

# システム情報
print("\n" + "="*70)
print("💻 システム情報")
print("="*70)

try:
    result = subprocess.run(['cat', '/proc/version'], capture_output=True, text=True)
    print(f"\nカーネル: {result.stdout.strip()}")
except:
    pass

try:
    result = subprocess.run(['free', '-h'], capture_output=True, text=True)
    print(f"\nメモリ情報:\n{result.stdout}")
except:
    pass

# 簡易インストールコマンド生成
print("\n" + "="*70)
print("🚀 この環境を再現するためのコマンド")
print("="*70)

print("\n# 主要パッケージのみインストール (推奨)")
print("-" * 70)
install_commands = []
for package in critical_packages:
    try:
        if package == 'pillow':
            import PIL
            install_commands.append(f"pip install {package}=={PIL.__version__}")
        elif package == 'flask-cors':
            for pkg in all_packages:
                if pkg.lower().startswith('flask-cors'):
                    install_commands.append(f"pip install {pkg}")
                    break
        else:
            module = __import__(package.replace('-', '_'))
            if hasattr(module, '__version__'):
                install_commands.append(f"pip install {package}=={module.__version__}")
    except:
        install_commands.append(f"pip install {package}")

print("pip install " + " ".join([cmd.split()[-1] for cmd in install_commands]))

print("\n# または requirements.txt から一括インストール")
print("-" * 70)
print("pip install -r requirements.txt")

print("\n" + "="*70)
print("✅ バージョン情報の出力完了")
print("="*70)

# ダウンロード
print("\n📥 requirements.txt をダウンロードしますか? (y/n)")
download_choice = input().strip().lower()
if download_choice == 'y':
    from google.colab import files
    files.download('/content/requirements.txt')
    print("✅ ダウンロード開始!")