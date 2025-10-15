# -*- coding: utf-8 -*-
"""AnimateDiff LCM - HLSストリーミング版（修正版）
リアルタイムアバター会話システム - セグメント重複再生バグ修正済み
"""

!pip install --upgrade diffusers
!pip install huggingface_hub==0.16.4
!pip install --upgrade diffusers huggingface_hub transformers accelerate

# ============================================
# 1. 環境セットアップ
# ============================================

# 必要なライブラリのインストール
!pip install -q diffusers transformers accelerate imageio[ffmpeg] pillow torch torchvision gtts
!pip install -q ipywidgets flask flask-cors pyngrok
!apt-get install -y ffmpeg

import torch
from diffusers import MotionAdapter, AnimateDiffPipeline, LCMScheduler
from diffusers.utils import load_image
from PIL import Image
import imageio
from google.colab import files
import io
import numpy as np
import ipywidgets as widgets
from IPython.display import display, HTML, clear_output, Image as IPImage
import time
import random
import base64
import threading
import subprocess
import os
import shutil
from pathlib import Path
from flask import Flask, send_from_directory, jsonify, Response, request
from flask_cors import CORS
from pyngrok import ngrok

print("✅ ライブラリのインストール完了")

# ngrok認証設定
print("\n🔑 ngrok認証トークンを設定してください")
authtoken = input("ngrokのauthtokenを入力してください: ")
ngrok.set_auth_token(authtoken)
print("✅ ngrok認証完了")

# ============================================
# 2. HLSストリーミング設定
# ============================================

# HLS出力ディレクトリの設定
HLS_DIR = Path("/content/hls_output")
HLS_DIR.mkdir(exist_ok=True)

# 古いファイルをクリーンアップ
for file in HLS_DIR.glob("*"):
    file.unlink()

print(f"📁 HLS出力ディレクトリ: {HLS_DIR}")

# Flaskアプリの設定
app = Flask(__name__)
CORS(app)  # CORSを有効化

# ストリーミング状態を管理
streaming_state = {
    "active": False,
    "current_playlist": None,
    "mode": "idle",  # "idle" or "talking"
    "should_stop": False,
    "sequence_number": 0,
    "media_sequence": 0,  # 追加: MEDIA-SEQUENCEカウンター
    "segment_info": {}  # 追加: セグメント情報を保存
}

# スレッド用の変数
streaming_thread = None
streaming_lock = threading.Lock()

@app.route('/')
def index():
    """簡易プレイヤーページ"""
    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Avatar Streaming</title>
        <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
        <style>
            body {{
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                text-align: center;
                background: #f0f0f0;
            }}
            #video {{
                width: 512px;
                height: 512px;
                border: 3px solid #4CAF50;
                border-radius: 8px;
                background: #000;
            }}
            .status {{
                margin: 20px 0;
                padding: 10px;
                background: #fff;
                border-radius: 5px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }}
            .debug {{
                margin-top: 20px;
                padding: 10px;
                background: #f5f5f5;
                border-radius: 5px;
                font-size: 12px;
                text-align: left;
            }}
        </style>
    </head>
    <body>
        <h1>🤖 アバターストリーミング</h1>
        <div class="status">
            <p id="status">ストリーム待機中...</p>
        </div>
        <video id="video" controls></video>
        
        <div class="debug">
            <h3>デバッグ情報</h3>
            <p>プレイリストURL: <span id="playlist-url"></span></p>
            <p>HLS.js対応: <span id="hls-support"></span></p>
            <p>セグメント数: <span id="segment-count">0</span></p>
            <p>Media Sequence: <span id="media-seq">0</span></p>
            <p>最終更新: <span id="last-update">-</span></p>
        </div>
        
        <script>
            var video = document.getElementById('video');
            var statusEl = document.getElementById('status');
            var playlistUrlEl = document.getElementById('playlist-url');
            var hlsSupportEl = document.getElementById('hls-support');
            var segmentCountEl = document.getElementById('segment-count');
            var mediaSeqEl = document.getElementById('media-seq');
            var lastUpdateEl = document.getElementById('last-update');
            
            var streamUrl = window.location.origin + '/hls/stream.m3u8';
            playlistUrlEl.textContent = streamUrl;
            
            var hls = null;
            var checkInterval = null;
            var lastMediaSequence = -1;
            
            hlsSupportEl.textContent = Hls.isSupported() ? 'Yes' : 'No (fallback mode)';
            
            function checkStreamStatus() {{
                fetch('/api/stream-status')
                    .then(res => res.json())
                    .then(data => {{
                        segmentCountEl.textContent = data.segments;
                        mediaSeqEl.textContent = data.media_sequence;
                        lastUpdateEl.textContent = new Date().toLocaleTimeString();
                        
                        if (data.media_sequence !== lastMediaSequence) {{
                            console.log('New media sequence detected:', data.media_sequence);
                            lastMediaSequence = data.media_sequence;
                        }}
                        
                        if (data.streaming && !hls) {{
                            console.log('Stream detected, initializing player...');
                            initPlayer();
                        }}
                    }})
                    .catch(err => console.error('Status check failed:', err));
            }}
            
            function initPlayer() {{
                if (Hls.isSupported()) {{
                    hls = new Hls({{
                        debug: false,
                        enableWorker: true,
                        lowLatencyMode: false,
                        backBufferLength: 30,
                        maxBufferLength: 60,
                        maxMaxBufferLength: 120,
                        maxBufferSize: 60 * 1000 * 1000,
                        maxBufferHole: 0.5,
                        highBufferWatchdogPeriod: 2,
                        nudgeOffset: 0.1,
                        nudgeMaxRetry: 3,
                        maxFragLookUpTolerance: 0.25,
                        liveSyncDurationCount: 3,
                        liveMaxLatencyDurationCount: 10,
                        liveDurationInfinity: true,
                        preferManagedMediaSource: true
                    }});
                    
                    hls.loadSource(streamUrl);
                    hls.attachMedia(video);
                    
                    hls.on(Hls.Events.MANIFEST_PARSED, function() {{
                        console.log('Manifest parsed successfully');
                        statusEl.textContent = '✅ ストリーム接続成功';
                        statusEl.style.color = 'green';
                        video.play().catch(e => {{
                            console.log('Autoplay failed, user interaction required');
                            statusEl.textContent = '▶️ 再生ボタンを押してください';
                        }});
                    }});
                    
                    hls.on(Hls.Events.ERROR, function(event, data) {{
                        console.error('HLS Error:', data);
                        if (data.fatal) {{
                            statusEl.textContent = '❌ エラー: ' + data.type;
                            statusEl.style.color = 'red';
                            
                            switch(data.type) {{
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    console.log('Network error, trying to recover...');
                                    setTimeout(() => hls.startLoad(), 1000);
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    console.log('Media error, trying to recover...');
                                    hls.recoverMediaError();
                                    break;
                                default:
                                    hls.destroy();
                                    hls = null;
                                    setTimeout(initPlayer, 3000);
                                    break;
                            }}
                        }}
                    }});
                }}
                else if (video.canPlayType('application/vnd.apple.mpegurl')) {{
                    video.src = streamUrl;
                    video.addEventListener('loadedmetadata', function() {{
                        statusEl.textContent = '✅ ストリーム接続成功';
                        video.play();
                    }});
                }}
            }}
            
            checkInterval = setInterval(checkStreamStatus, 2000);
            checkStreamStatus();
        </script>
    </body>
    </html>
    '''

@app.route('/hls/<path:filename>')
def serve_hls(filename):
    """HLSファイルを配信"""
    file_path = HLS_DIR / filename
    
    if not file_path.exists():
        return f"File not found: {filename}", 404
    
    # MIMEタイプを設定
    if filename.endswith('.m3u8'):
        mimetype = 'application/vnd.apple.mpegurl'
    elif filename.endswith('.ts'):
        mimetype = 'video/mp2t'
    else:
        mimetype = 'application/octet-stream'
    
    response = send_from_directory(HLS_DIR, filename, mimetype=mimetype)
    
    # キャッシュ制御
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Access-Control-Allow-Origin'] = '*'
    
    return response

@app.route('/api/stream-status')
def stream_status():
    """ストリーム状態を返す"""
    m3u8_path = HLS_DIR / "stream.m3u8"
    m3u8_exists = m3u8_path.exists()
    
    segments = list(HLS_DIR.glob("*.ts"))
    
    return jsonify({
        "streaming": m3u8_exists,
        "segments": len(segments),
        "playlist_exists": m3u8_exists,
        "media_sequence": streaming_state.get("media_sequence", 0)
    })

# Flaskサーバーをバックグラウンドで起動
def run_flask():
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False, threaded=True)

flask_thread = threading.Thread(target=run_flask, daemon=True)
flask_thread.start()

print("✅ Flaskサーバー起動完了")

# ngrokでトンネル作成
time.sleep(2)

# 既存のトンネルをチェック
existing_tunnels = ngrok.get_tunnels()
if existing_tunnels:
    print(f"\n⚠️ 既存のngrokトンネルが見つかりました ({len(existing_tunnels)}個)")
    ngrok.kill()
    time.sleep(2)

# HTTPSトンネルを作成
public_url = ngrok.connect(5000, bind_tls=True)

if hasattr(public_url, 'public_url'):
    public_url_str = public_url.public_url
else:
    public_url_str = str(public_url)

if not public_url_str.startswith('https://'):
    public_url_str = public_url_str.replace('http://', 'https://')

print(f"\n🌐 公開URL: {public_url_str}")
print(f"📺 ストリーミングプレイヤー: {public_url_str}")
print(f"🎯 HLSストリームURL: {public_url_str}/hls/stream.m3u8")

# ============================================
# 3. モデルのロード
# ============================================

print("\n📄 モデルをロード中...")

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"使用デバイス: {device}")

# Motion Adapterのロード
adapter = MotionAdapter.from_pretrained(
    "wangfuyun/AnimateLCM",
    torch_dtype=torch.float16
).to(device)

# AnimateDiff Pipelineのセットアップ
pipe = AnimateDiffPipeline.from_pretrained(
    "emilianJR/epiCRealism",
    motion_adapter=adapter,
    torch_dtype=torch.float16
).to(device)

# LCM Schedulerの設定
pipe.scheduler = LCMScheduler.from_config(pipe.scheduler.config, beta_schedule="linear")

# IP-Adapterをロード
pipe.load_ip_adapter("h94/IP-Adapter", subfolder="models", weight_name="ip-adapter_sd15.bin")
pipe.set_ip_adapter_scale(0.8)

# メモリ最適化
pipe.enable_vae_slicing()

print("✅ モデルのロード完了")

# ============================================
# 4. HLSストリーミング関数（修正版）
# ============================================

def frames_to_hls_stream(frames, fps=24, append=False):
    """フレームをHLS形式でストリーミング配信（修正版）
    
    Args:
        frames: 画像フレームのリスト
        fps: フレームレート
        append: Trueの場合、既存のプレイリストに追加
    """
    global streaming_state
    
    print(f"\n🎬 HLSストリーミング {'追加' if append else '開始'} ({len(frames)} フレーム, {fps}fps)")
    print(f"   動画の長さ: {len(frames)/fps:.2f}秒")
    
    with streaming_lock:
        # 一時的な動画ファイルを作成
        temp_video = HLS_DIR / f"temp_input_{streaming_state['sequence_number']}.mp4"
        imageio.mimsave(str(temp_video), frames, fps=fps, codec='libx264', quality=8)
        
        print(f"✅ 一時動画作成完了: {temp_video}")
        
        # プレイリスト関連の設定
        hls_output = HLS_DIR / "stream.m3u8"
        segment_duration = len(frames) / fps
        
        # 新しいセグメントを生成
        segment_filename = f"stream{streaming_state['sequence_number']:03d}.ts"
        segment_path = HLS_DIR / segment_filename
        
        # FFmpegでセグメント生成（改善されたパラメータ）
        ffmpeg_cmd = [
            'ffmpeg',
            '-y',
            '-i', str(temp_video),
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'zerolatency',
            '-profile:v', 'baseline',
            '-level', '3.0',
            '-g', '30',
            '-keyint_min', '30',
            '-sc_threshold', '0',
            '-f', 'mpegts',
            '-mpegts_copyts', '1',
            '-avoid_negative_ts', 'make_zero',
            str(segment_path)
        ]
        
        try:
            subprocess.run(ffmpeg_cmd, check=True, capture_output=True, text=True)
            print(f"✅ セグメント生成完了: {segment_filename}")
            
            # セグメント情報を記録
            streaming_state["segment_info"][segment_filename] = {
                "duration": segment_duration,
                "sequence": streaming_state["sequence_number"]
            }
            
            # 古いセグメントを削除（最大10セグメントを保持）
            max_segments = 10
            all_segments = sorted(streaming_state["segment_info"].keys(), 
                                key=lambda x: streaming_state["segment_info"][x]["sequence"])
            
            if len(all_segments) > max_segments:
                segments_to_remove = len(all_segments) - max_segments
                
                for i in range(segments_to_remove):
                    old_segment = all_segments[i]
                    old_path = HLS_DIR / old_segment
                    if old_path.exists():
                        old_path.unlink()
                        print(f"🗑️ 古いセグメント削除: {old_segment}")
                    del streaming_state["segment_info"][old_segment]
                
                # MEDIA-SEQUENCEを更新
                streaming_state["media_sequence"] += segments_to_remove
            
            # 残っているセグメントのリストを作成
            remaining_segments = sorted(streaming_state["segment_info"].keys(), 
                                      key=lambda x: streaming_state["segment_info"][x]["sequence"])
            
            # 最大ターゲット持続時間を計算
            max_duration = int(max([info["duration"] for info in streaming_state["segment_info"].values()])) + 1
            
            # プレイリストを生成
            playlist = "#EXTM3U\n"
            playlist += "#EXT-X-VERSION:6\n"
            playlist += f"#EXT-X-TARGETDURATION:{max_duration}\n"
            playlist += f"#EXT-X-MEDIA-SEQUENCE:{streaming_state['media_sequence']}\n"
            
            # 初回のみEVENTタイプを設定
            if not append:
                playlist += "#EXT-X-PLAYLIST-TYPE:EVENT\n"
            
            playlist += "#EXT-X-INDEPENDENT-SEGMENTS\n"
            
            # 各セグメントを追加
            for seg in remaining_segments:
                duration = streaming_state["segment_info"][seg]["duration"]
                playlist += f"#EXTINF:{duration:.6f},\n"
                playlist += f"{seg}\n"
            
            # ライブストリーミング継続中（ENDLISTを付けない）
            
            # UTF-8で書き込み
            with open(hls_output, 'w', encoding='utf-8', newline='\n') as f:
                f.write(playlist)
            
            print(f"📄 プレイリスト更新完了:")
            print(f"   セグメント数: {len(remaining_segments)}")
            print(f"   MEDIA-SEQUENCE: {streaming_state['media_sequence']}")
            print(f"   現在のセグメント: {remaining_segments[-3:] if len(remaining_segments) > 3 else remaining_segments}")
            
            streaming_state["active"] = True
            streaming_state["sequence_number"] += 1
            
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ FFmpegエラー:")
            print(f"   stderr: {e.stderr if e.stderr else 'N/A'}")
            return False
        finally:
            # 一時ファイルを削除
            if temp_video.exists():
                temp_video.unlink()

def continuous_idle_streaming():
    """連続的にアイドル動画を生成してストリーミング（改善版）"""
    global streaming_state
    
    print("🔄 連続アイドルストリーミング開始...")
    
    last_generation_time = time.time()
    min_interval = 1.5  # 最小生成間隔（秒）
    
    while not streaming_state["should_stop"]:
        # トーキングモードの場合は待機
        if streaming_state["mode"] == "talking":
            time.sleep(0.5)
            continue
        
        # 最小間隔を確保
        elapsed = time.time() - last_generation_time
        if elapsed < min_interval:
            time.sleep(min_interval - elapsed)
        
        print("\n🔹 アイドル動画生成中...")
        
        try:
            # アイドル動画を生成
            idle_frames, idle_fps = generate_avatar_animation_simple("idle", "neutral")
            
            # ストリームに追加
            frames_to_hls_stream(idle_frames, fps=idle_fps, append=True)
            
            print("✅ アイドルセグメント追加完了")
            
            last_generation_time = time.time()
            
        except Exception as e:
            print(f"❌ アイドル生成エラー: {e}")
            time.sleep(2)
    
    print("🛑 連続ストリーミング停止")

def generate_avatar_animation_simple(expression_type="talking", emotion="neutral"):
    """簡易版アニメーション生成（スレッドセーフ）"""
    global last_frame, fixed_seed
    
    with streaming_lock:
        if fixed_seed is None:
            fixed_seed = random.randint(0, 2147483647)
        
        emotion_prompts = {
            "happy": "smiling face, happy expression, bright eyes, gentle smile",
            "sad": "sad expression, slightly downcast eyes, subtle frown, melancholic look",
            "angry": "angry expression, furrowed brows, intense gaze, stern look",
            "excited": "laughing, joyful expression, wide smile, cheerful, animated happiness",
            "neutral": "calm expression, neutral face, composed look",
            "thinking": "thoughtful expression, slight head tilt, contemplative look"
        }
        
        motion_prompts = {
            "talking": "mouth opening and closing rhythmically, lips moving up and down, jaw moving, talking motion, speaking animation",
            "dance": "body swaying gently, shoulders moving, head bobbing slightly, dancing motion, rhythmic movement, joyful body language",
            "idle": "subtle breathing motion, natural blinking, mouth closed, lips relaxed, no mouth movement, slight head movement"
        }
        
        emotion_desc = emotion_prompts.get(emotion, emotion_prompts["neutral"])
        motion_desc = motion_prompts.get(expression_type, motion_prompts["talking"])
        
        if expression_type == "dance":
            prompt = f"""
            A person dancing, {motion_desc},
            natural blinking during dance, eyes blinking occasionally,
            {emotion_desc},
            expressive facial movements, animated face, dynamic motion,
            photorealistic, high quality, 8K resolution, smooth animation, motion
            """
            num_frames = 16
            num_inference_steps = 3
            guidance_scale = 1.5
            fps = 8
            
        elif expression_type == "talking" or expression_type == "talk":
            prompt = f"""
            A person speaking and talking, {motion_desc},
            natural blinking during speech, eyes blinking occasionally,
            {emotion_desc},
            subtle facial expressions, natural lip movements, animated face,
            photorealistic, high quality, 8K resolution, smooth animation, motion
            """
            num_frames = 16
            num_inference_steps = 3
            guidance_scale = 1.5
            fps = 8
            
        else:  # idle
            prompt = f"""
            A person in idle state, {motion_desc},
            natural blinking, eyes blinking gently and naturally,
            {emotion_desc},
            natural resting face, gentle animation,
            photorealistic, high quality, 8K resolution, smooth animation, subtle motion
            """
            num_frames = 12
            num_inference_steps = 3
            guidance_scale = 1.2
            fps = 6
        
        negative_prompt = """
        low quality, worst quality, blurry, distorted, deformed,
        static, frozen, unnatural movements, artificial, stiff, motionless,
        eyes wide open without blinking, static eyes, no eye movement
        """
        
        pipe.set_ip_adapter_scale(0.9)
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        
        output = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            ip_adapter_image=init_image,
            num_frames=num_frames,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            generator=torch.Generator(device=device).manual_seed(fixed_seed)
        )
        
        frames = output.frames[0]
        last_frame = frames[-1]
        
        return frames, fps

# ============================================
# 5. 画像アップロード
# ============================================

print("\n📤 アバターの初期画像をアップロードしてください")
uploaded = files.upload()

# アップロードされた画像を読み込む
uploaded_filename = list(uploaded.keys())[0]
init_image = Image.open(io.BytesIO(uploaded[uploaded_filename]))

# 画像のリサイズ
init_image = init_image.convert("RGB").resize((256, 256))

print(f"✅ 画像アップロード完了: {uploaded_filename}")
print(f"   画像サイズ: {init_image.size}")

display(init_image)

# ============================================
# 6. アバター会話システムのセットアップ
# ============================================

# デモ応答リスト
demo_responses = [
    {"text": "こんにちは!今日はどんなご用件でしょうか?", "emotion": "happy"},
    {"text": "なるほど、それは興味深いですね!", "emotion": "excited"},
    {"text": "承知しました。詳しく教えていただけますか?", "emotion": "neutral"},
    {"text": "素晴らしいアイデアだと思います!", "emotion": "excited"},
    {"text": "そうですね、一緒に考えてみましょう。", "emotion": "thinking"},
    {"text": "ご質問ありがとうございます。お答えしますね。", "emotion": "happy"},
    {"text": "その件については、いくつか選択肢があります。", "emotion": "neutral"},
    {"text": "わかりました!すぐに対応させていただきます。", "emotion": "happy"},
    {"text": "申し訳ございません、もう一度確認させてください。", "emotion": "sad"},
    {"text": "それは困りましたね...何か解決策を考えましょう。", "emotion": "sad"},
]

# デバッグコマンドの定義
DEBUG_COMMANDS = {
    "/happy": {"emotion": "happy", "text": "😊 嬉しい表情で話します！"},
    "/angry": {"emotion": "angry", "text": "😠 怒った表情で話します！"},
    "/sad": {"emotion": "sad", "text": "😢 悲しい表情で話します..."},
    "/excited": {"emotion": "excited", "text": "😆 笑顔で話します！"},
    "/smile": {"emotion": "happy", "text": "😄 笑顔です！"},
    "/thinking": {"emotion": "thinking", "text": "🤔 考え中..."},
    "/neutral": {"emotion": "neutral", "text": "😐 普通の表情です"},
    "/dance": {"emotion": "excited", "text": "💃 楽しく踊ります！", "motion": "dance"},
    "/talk": {"emotion": "neutral", "text": "💬 普通に話します", "motion": "talk"},
    "/idle": {"emotion": "neutral", "text": "😌 待機状態です", "motion": "idle"},
    "/help": {"emotion": None, "text": "📋 利用可能なコマンド:\n/happy, /angry, /sad, /excited, /smile, /thinking, /neutral, /dance, /talk, /idle"}
}

# チャット応答関数
def process_chat_message(user_message):
    """ユーザーメッセージに対する応答を生成"""
    
    # デバッグコマンドのチェック
    if user_message.startswith('/'):
        command = user_message.lower().strip()
        
        if command in DEBUG_COMMANDS:
            cmd_data = DEBUG_COMMANDS[command]
            
            if cmd_data["emotion"] is None:
                return cmd_data["text"], None
            
            print(f"🛠 デバッグコマンド実行: {command}")
            print(f"   感情: {cmd_data['emotion']}")
            if "motion" in cmd_data:
                print(f"   モーション: {cmd_data['motion']}")
            
            return cmd_data["text"], cmd_data["emotion"], cmd_data.get("motion", "talking")
        else:
            return f"❌ 未知のコマンド: {command}\n/help で利用可能なコマンドを確認できます", "neutral", "talking"
    
    # 通常の応答
    response = random.choice(demo_responses)
    response_text = response["text"]
    emotion = response["emotion"]
    
    print(f"\n💬 ユーザー: {user_message}")
    print(f"🤖 アバター: {response_text} [感情: {emotion}]")
    
    return response_text, emotion, "talking"

# プログレスバー表示エリア
progress_area = widgets.Output(layout=widgets.Layout(height='80px', border='1px solid #ddd', padding='10px'))

# 最後のフレームを保存する変数
last_frame = None
fixed_seed = None

# アニメーション生成関数
def generate_avatar_animation_with_progress(expression_type="talking", emotion="neutral"):
    """アバターアニメーションを生成してHLS配信"""
    global last_frame, fixed_seed
    
    # 初回のみシードを生成
    if fixed_seed is None:
        fixed_seed = random.randint(0, 2147483647)
        print(f"🎲 シードを生成: {fixed_seed}")
    
    # プログレスバー表示
    with progress_area:
        clear_output(wait=True)
        progress_bar = widgets.IntProgress(
            value=0,
            min=0,
            max=100,
            description='生成中:',
            bar_style='info',
            orientation='horizontal',
            layout=widgets.Layout(width='90%')
        )
        progress_label = widgets.HTML(value='<p>🎬 アニメーション生成を開始...</p>')
        display(widgets.VBox([progress_label, progress_bar]))
    
    # 感情に応じたプロンプト設定
    emotion_prompts = {
        "happy": "smiling face, happy expression, bright eyes, gentle smile",
        "sad": "sad expression, slightly downcast eyes, subtle frown, melancholic look",
        "angry": "angry expression, furrowed brows, intense gaze, stern look",
        "excited": "laughing, joyful expression, wide smile, cheerful, animated happiness",
        "neutral": "calm expression, neutral face, composed look",
        "thinking": "thoughtful expression, slight head tilt, contemplative look"
    }
    
    emotion_desc = emotion_prompts.get(emotion, emotion_prompts["neutral"])
    
    # 表情タイプに応じたプロンプト設定
    if expression_type == "talking":
        prompt = f"""
        A person speaking and talking, mouth opening and closing rhythmically,
        lips moving up and down, jaw moving, mouth open mouth close repeatedly,
        talking motion, speaking animation, lip sync motion,
        natural blinking during speech, eyes blinking occasionally,
        {emotion_desc},
        subtle facial expressions, natural lip movements, animated face,
        photorealistic, high quality, 8K resolution, smooth animation, motion
        """
        num_frames = 32
        num_inference_steps = 4
        guidance_scale = 1.5
        fps = 16
        
    else:  # idle
        prompt = f"""
        A person in idle state, subtle breathing motion,
        natural blinking, eyes blinking gently and naturally,
        {emotion_desc},
        mouth closed, lips relaxed, no mouth movement,
        slight head movement, natural resting face, gentle animation,
        photorealistic, high quality, 8K resolution, smooth animation, subtle motion
        """
        num_frames = 24
        num_inference_steps = 4
        guidance_scale = 1.2
        fps = 12
    
    negative_prompt = """
    low quality, worst quality, blurry, distorted, deformed,
    static, frozen, unnatural movements, artificial, stiff, motionless,
    eyes wide open without blinking, static eyes, no eye movement,
    mouth closed when talking, static mouth, no lip movement when speaking
    """
    
    progress_bar.value = 10
    progress_label.value = f'<p>📝 プロンプト設定完了 [感情: {emotion}]</p>'
    
    progress_bar.value = 30
    
    start_image = last_frame if last_frame is not None else init_image
    
    if last_frame is not None:
        progress_label.value = '<p>🔄 前のフレームから継続してアニメーション生成中...</p>'
    else:
        progress_label.value = '<p>🔄 初期画像からアニメーション生成中...</p>'
    
    # アニメーション生成
    pipe.set_ip_adapter_scale(0.9)
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    output = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        ip_adapter_image=init_image,
        num_frames=num_frames,
        num_inference_steps=num_inference_steps,
        guidance_scale=guidance_scale,
        generator=torch.Generator(device=device).manual_seed(fixed_seed)
    )
    
    progress_bar.value = 70
    progress_label.value = '<p>✅ 生成完了! HLSストリーミング準備中...</p>'
    
    frames = output.frames[0]
    
    # 最後のフレームを保存
    last_frame = frames[-1]
    
    # HLSストリーミング配信
    progress_bar.value = 85
    progress_label.value = '<p>📡 HLSストリーミング配信中...</p>'
    
    success = frames_to_hls_stream(frames, fps=fps)
    
    if success:
        progress_bar.value = 100
        progress_bar.bar_style = 'success'
        progress_label.value = '<p>✨ ストリーミング配信開始!</p>'
    else:
        progress_bar.bar_style = 'danger'
        progress_label.value = '<p>❌ ストリーミング配信エラー</p>'
    
    return frames, fps

# ============================================
# 7. チャットインターフェース構築
# ============================================

print("\n" + "="*50)
print("💬 リアルタイムアバター会話システム (HLS配信)")
print("="*50)

# ストリーミングプレイヤーリンク表示
streaming_link = widgets.HTML(
    value=f'''
    <div style="border:2px solid #2196F3; padding:15px; background:#e3f2fd; margin:10px 0; border-radius:5px;">
        <h3>📺 ストリーミングプレイヤー</h3>
        <p>以下のURLでストリーミング視聴できます:</p>
        <a href="{public_url_str}" target="_blank" style="font-size:16px; color:#2196F3;">
            {public_url_str}
        </a>
        <p style="margin-top:10px; font-size:14px;">
            <strong>HLSストリームURL（外部プレイヤー用）:</strong><br>
            <code style="background:#f0f0f0; padding:5px; border-radius:3px;">{public_url_str}/hls/stream.m3u8</code>
        </p>
        <p style="margin-top:10px; font-size:12px; color:#666;">
            ※ 新しいタブで開いてください。メッセージ送信後、数秒で配信が始まります。
        </p>
    </div>
    ''',
    layout=widgets.Layout(width='100%')
)

# 初期idle動画を生成
print("\n🎬 初期idle動画を生成中...")
idle_frames, idle_fps = generate_avatar_animation_with_progress("idle", "neutral")

# 初回のストリーム作成
print("📡 初回ストリーミング開始...")
frames_to_hls_stream(idle_frames, fps=idle_fps, append=False)

print("✅ 初期idle動画の配信開始")

# 連続ストリーミングスレッドを開始
streaming_state["should_stop"] = False
streaming_state["mode"] = "idle"
streaming_thread = threading.Thread(target=continuous_idle_streaming, daemon=True)
streaming_thread.start()

print("🔄 連続アイドルストリーミングが開始されました")

# プログレスバーを待機状態に戻す
with progress_area:
    clear_output(wait=True)
    print("待機中...")

# ウィジェット作成
chat_input = widgets.Text(
    value='',
    placeholder='メッセージを入力してください...',
    description='あなた:',
    disabled=False,
    layout=widgets.Layout(width='80%')
)

send_button = widgets.Button(
    description='送信',
    disabled=False,
    button_style='success',
    tooltip='メッセージを送信',
    icon='paper-plane'
)

# チャット履歴表示エリア
chat_history = widgets.HTML(
    value='<div style="border:1px solid #ddd; padding:10px; height:250px; overflow-y:scroll; background:#f9f9f9;"><p><b>アバター:</b> こんにちは!何でも聞いてくださいね。</p></div>',
    layout=widgets.Layout(height='270px')
)

# ステータス表示
status_label = widgets.HTML(
    value='<p style="color:#666; font-size:12px;">💡 メッセージを入力してEnterキーまたは送信ボタンを押してください</p>'
)

# 送信ボタンのイベントハンドラ
def on_send_clicked(b):
    global streaming_state
    
    user_message = chat_input.value.strip()
    
    if not user_message:
        return
    
    chat_input.value = ''
    send_button.disabled = True
    chat_input.disabled = True
    
    status_label.value = '<p style="color:#ff6600; font-size:12px;">🎬 アバターが応答を生成中...</p>'
    
    # チャット履歴に追加
    current_history = chat_history.value
    current_history = current_history.replace('</div>', f'<p><b>あなた:</b> {user_message}</p></div>')
    chat_history.value = current_history
    
    # トーキングモードに切り替え
    streaming_state["mode"] = "talking"
    
    # アバター応答生成
    print("\n" + "="*50)
    print("🎬 アバター応答を生成中...")
    
    # チャット応答テキストと感情を生成
    result = process_chat_message(user_message)
    
    # /helpコマンドの場合は動画生成せずにテキストのみ表示
    if len(result) == 2 and result[1] is None:
        response_text = result[0]
        
        # チャット履歴にヘルプを追加
        current_history = chat_history.value
        current_history = current_history.replace('</div>', f'<p><b>システム:</b><br>{response_text.replace(chr(10), "<br>")}</p></div>')
        chat_history.value = current_history
        
        # アイドルモードに戻す
        streaming_state["mode"] = "idle"
        
        # ボタンを再度有効化
        send_button.disabled = False
        chat_input.disabled = False
        status_label.value = '<p style="color:#666; font-size:12px;">💡 メッセージを入力してEnterキーまたは送信ボタンを押してください</p>'
        return
    
    response_text, emotion, motion_type = result
    
    # 話しているアニメーションを生成してHLS配信
    print(f"   📹 アニメーション生成中... [感情: {emotion}, モーション: {motion_type}]")
    talking_frames, talking_fps = generate_avatar_animation_with_progress(motion_type, emotion)
    
    # トーキング動画をストリームに追加
    frames_to_hls_stream(talking_frames, fps=talking_fps, append=True)
    
    print("="*50 + "\n")
    
    # アイドルモードに戻す
    streaming_state["mode"] = "idle"
    
    # プログレスバーを待機状態に戻す
    with progress_area:
        clear_output(wait=True)
        print("待機中...")
    
    # チャット履歴にアバター応答を追加
    current_history = chat_history.value
    current_history = current_history.replace('</div>', f'<p><b>アバター:</b> {response_text}</p></div>')
    chat_history.value = current_history
    
    # ボタンを再度有効化
    send_button.disabled = False
    chat_input.disabled = False
    
    status_label.value = '<p style="color:#666; font-size:12px;">💡 メッセージを入力してEnterキーまたは送信ボタンを押してください</p>'

# Enterキーでも送信できるように
def on_text_submit(text_widget):
    on_send_clicked(None)

send_button.on_click(on_send_clicked)
chat_input.on_submit(on_text_submit)

# インターフェース表示
print("\n📱 チャットインターフェースを表示します\n")

interface_box = widgets.VBox([
    widgets.HTML('<h2>🤖 アバター会話システム (HLSストリーミング版)</h2>'),
    streaming_link,
    widgets.HTML('<div style="padding:5px; background:#fff3cd; margin:10px 0 5px 0;"><b>⏳ 生成状況</b></div>'),
    progress_area,
    widgets.HBox([chat_input, send_button]),
    status_label,
    widgets.HTML('<hr style="margin:20px 0;">'),
    widgets.HTML('<div style="padding:5px; background:#e3f2fd; margin-bottom:5px;"><b>💬 会話履歴</b></div>'),
    chat_history
], layout=widgets.Layout(border='3px solid #2196F3', padding='15px'))

display(interface_box)

# ============================================
# 8. 使い方ガイド
# ============================================

print("\n" + "="*50)
print("📖 使い方ガイド")
print("="*50)
print(f"\n1. 上記のリンクをクリックして新しいタブでプレイヤーを開く")
print(f"   URL: {public_url_str}")
print(f"\n2. プレイヤーが「ストリーム待機中...」と表示される")
print(f"\n3. このColab画面でメッセージを送信すると...")
print(f"   → アバターがアニメーション生成")
print(f"   → 自動的にHLS配信開始")
print(f"   → プレイヤーで再生が始まる（約2-3秒後）")
print(f"\n💡 Tips:")
print(f"   - 初回は既にidle動画が配信されています")
print(f"   - 生成完了まで数秒かかります")
print(f"   - セグメント単位で配信されるため、スムーズな再生が可能")
print(f"   - 古いセグメントは自動的に削除されます")
print(f"\n🛠 デバッグコマンド:")
print(f"   /help - 利用可能なコマンド一覧")
print(f"   /happy, /sad, /angry - 感情の変更")
print(f"   /dance, /talk, /idle - モーションの変更")
print("="*50)