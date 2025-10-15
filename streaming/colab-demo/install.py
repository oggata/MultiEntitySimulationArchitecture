# ============================================
# ステップ1: 完全クリーンアップと再インストール
# ============================================

# 完全にアンインストール
!pip uninstall -y transformers diffusers accelerate -q
!pip cache purge

# 最新の互換バージョンをインストール
!pip install transformers==4.44.2 -q
!pip install diffusers==0.30.3 -q  
!pip install accelerate==0.34.2 -q
!pip install imageio[ffmpeg] pillow gtts -q
!pip install ipywidgets flask flask-cors pyngrok -q
!apt-get install -y ffmpeg > /dev/null 2>&1

print("✅ ライブラリインストール完了")
print("\n⚠️⚠️⚠️ 重要 ⚠️⚠️⚠️")
print("今すぐランタイムを再起動してください!")
print("メニュー: ランタイム → セッションを再起動")