# ============================================
# バックグラウンド生成停止スクリプト
# ============================================

import threading
import time

print("="*70)
print("🛑 バックグラウンド生成停止スクリプト")
print("="*70)

# 現在の状態を確認
print("\n📊 現在の状態:")
print("-" * 70)

try:
    print(f"  streaming_state['should_stop']: {streaming_state['should_stop']}")
    print(f"  streaming_state['mode']: {streaming_state['mode']}")
    print(f"  streaming_state['active']: {streaming_state['active']}")
    print(f"  streaming_state['sequence_number']: {streaming_state['sequence_number']}")
    
    # アクティブなスレッド数を確認
    active_threads = threading.active_count()
    print(f"\n  アクティブなスレッド数: {active_threads}")
    
    print("\n  実行中のスレッド一覧:")
    for thread in threading.enumerate():
        print(f"    - {thread.name} (alive: {thread.is_alive()})")
    
except NameError:
    print("  ⚠️ streaming_state が見つかりません")
    print("  システムは起動していない可能性があります")

# 停止処理
print("\n" + "="*70)
print("🛑 停止処理を開始します...")
print("="*70)

try:
    # フラグを立てて停止
    streaming_state["should_stop"] = True
    print("\n✅ ステップ1: 停止フラグを設定しました")
    
    # 少し待機してスレッドが終了するのを待つ
    print("⏳ ステップ2: スレッドの終了を待機中... (最大10秒)")
    
    for i in range(10):
        time.sleep(1)
        # スレッドが終了したか確認
        streaming_thread_alive = False
        for thread in threading.enumerate():
            if 'continuous_idle_streaming' in str(thread) or thread.name == 'Thread':
                if thread.is_alive() and thread != threading.current_thread():
                    streaming_thread_alive = True
                    break
        
        if not streaming_thread_alive:
            print(f"✅ {i+1}秒後: スレッドが正常に終了しました")
            break
        else:
            print(f"⏳ {i+1}秒経過...")
    
    # 最終確認
    print("\n" + "="*70)
    print("📊 停止後の状態:")
    print("-" * 70)
    
    print(f"  streaming_state['should_stop']: {streaming_state['should_stop']}")
    print(f"  streaming_state['mode']: {streaming_state['mode']}")
    
    active_threads = threading.active_count()
    print(f"  アクティブなスレッド数: {active_threads}")
    
    # 生成されたセグメント数を確認
    try:
        segments = list(HLS_DIR.glob("*.ts"))
        print(f"\n  生成済みセグメント数: {len(segments)}")
        print(f"  総シーケンス数: {streaming_state['sequence_number']}")
    except:
        pass
    
    print("\n✅ バックグラウンド生成を停止しました!")
    print("   (UIは引き続き使用可能です)")
    
except NameError as e:
    print(f"\n❌ エラー: {e}")
    print("   システムが起動していない可能性があります")
    
except Exception as e:
    print(f"\n❌ 予期しないエラー: {e}")

print("\n" + "="*70)
print("💡 補足情報")
print("="*70)

print("""
【停止されたもの】
  ✅ バックグラウンドのアイドル動画生成
  ✅ 連続ストリーミング処理

【停止されていないもの】
  ✓ Flaskサーバー (引き続き動作)
  ✓ ngrokトンネル (引き続き動作)
  ✓ チャットUI (引き続き使用可能)
  ✓ 手動でのメッセージ送信による生成 (可能)

【再開する場合】
  以下のコードを実行してください:
  
  streaming_state["should_stop"] = False
  streaming_state["mode"] = "idle"
  streaming_thread = threading.Thread(
      target=continuous_idle_streaming, 
      daemon=True
  )
  streaming_thread.start()
  print("✅ バックグラウンド生成を再開しました")

【完全にシャットダウンする場合】
  以下のコードを実行してください:
  
  # バックグラウンド生成停止 (既に実行済み)
  streaming_state["should_stop"] = True
  
  # ngrok停止
  ngrok.kill()
  
  # Flaskは自動では停止できません
  # ランタイムを再起動してください
""")

print("="*70)