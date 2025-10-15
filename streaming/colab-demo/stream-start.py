# -*- coding: utf-8 -*-
"""AnimateDiff LCM - HLSストリーミング完全版(修正済み)"""

# ============================================
# 1. 必要なライブラリのインストール
# ============================================

!pip install -q imageio[ffmpeg] pillow gtts
!pip install -q ipywidgets flask flask-cors pyngrok
!apt-get install -y ffmpeg > /dev/null 2>&1

import torch
from diffusers import MotionAdapter, AnimateDiffPipeline, LCMScheduler
from diffusers import AutoencoderKL, UNet2DConditionModel
from transformers import CLIPTextModel, CLIPTokenizer
from PIL import Image
import imageio
from google.colab import files
import io
import numpy as np
import ipywidgets as widgets
from IPython.display import display, HTML, clear_output, Image as IPImage
import time
import random
import threading
import subprocess
import os
from pathlib import Path

# ★★★ ここが重要！ request を追加 ★★★
from flask import Flask, send_from_directory, jsonify, make_response, request
from flask_cors import CORS
from pyngrok import ngrok

print("✅ ライブラリのインストール完了")

# ============================================
# 2. ngrok認証設定
# ============================================

print("\n🔑 ngrok認証トークンを設定してください")
authtoken = input("ngrokのauthtokenを入力してください: ")
ngrok.set_auth_token(authtoken)
print("✅ ngrok認証完了")

# ============================================
# 3. HLSストリーミング設定
# ============================================

HLS_DIR = Path("/content/hls_output")
HLS_DIR.mkdir(exist_ok=True)

# 古いファイルをクリーンアップ
for file in HLS_DIR.glob("*"):
    file.unlink()

print(f"📁 HLS出力ディレクトリ: {HLS_DIR}")

# Flaskアプリの設定
app = Flask(__name__)
CORS(app, 
     resources={r"/*": {"origins": "*"}},
     allow_headers=["Content-Type", "ngrok-skip-browser-warning"],
     expose_headers=["Content-Length", "Content-Type"],
     supports_credentials=False,
     methods=['GET', 'POST', 'OPTIONS', 'HEAD'])

# ストリーミング状態を管理
streaming_state = {
    "active": False,
    "current_playlist": None,
    "mode": "idle",
    "should_stop": False,
    "sequence_number": 0,
    "media_sequence": 0,
    "segment_info": {}
}

# アイドルモーションのバリエーション定義
IDLE_MOTION_PATTERNS = [
    {
        "name": "breathing",
        "prompt": "subtle breathing motion, chest gently rising and falling, natural respiratory movement, calm breathing",
        "weight": 3
    },
    {
        "name": "blinking",
        "prompt": "natural blinking, eyes closing and opening gently, realistic blink animation, occasional blinking",
        "weight": 3
    },
    {
        "name": "slight_head_tilt",
        "prompt": "slight head tilt to the side, gentle neck movement, subtle head angle change, natural head position shift",
        "weight": 2
    },
    {
        "name": "looking_around",
        "prompt": "eyes looking slightly to the side, gaze shifting naturally, subtle eye movement, looking left and right gently",
        "weight": 2
    },
    {
        "name": "slight_smile",
        "prompt": "subtle smile appearing and fading, gentle expression change, slight lip movement, soft facial expression",
        "weight": 2
    },
    {
        "name": "hair_sway",
        "prompt": "hair swaying gently, subtle hair movement from breathing, natural hair flow, soft hair animation",
        "weight": 1
    },
    {
        "name": "shoulder_relax",
        "prompt": "shoulders slightly moving, relaxed posture adjustment, gentle shoulder roll, natural body adjustment",
        "weight": 1
    },
    {
        "name": "thinking_pose",
        "prompt": "thoughtful expression, hand near chin gesture, contemplative look, pondering stance",
        "weight": 1
    },
    {
        "name": "eyebrow_movement",
        "prompt": "subtle eyebrow raise, gentle eyebrow movement, natural facial micro-expression, eyebrow animation",
        "weight": 1
    },
    {
        "name": "lip_adjustment",
        "prompt": "lips pressing together gently, subtle mouth movement, natural lip position change, relaxed mouth animation",
        "weight": 1
    }
]

# アイドル状態管理
idle_state = {
    "pattern_history": [],
    "last_pattern": None,
    "pattern_count": 0,
    "seed_offset": 0,
    "base_seed": None,
    "transition_frame": None
}

streaming_lock = threading.Lock()

@app.after_request
def after_request(response):
    """すべてのレスポンスに必要なヘッダーを追加"""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, HEAD'
    response.headers['Access-Control-Allow-Headers'] = '*'
    response.headers['Access-Control-Expose-Headers'] = '*'
    response.headers['Access-Control-Max-Age'] = '3600'
    response.headers['ngrok-skip-browser-warning'] = 'true'
    
    if request.path.endswith('.m3u8'):
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    elif request.path.endswith('.ts'):
        response.headers['Cache-Control'] = 'max-age=1'
    
    return response

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
                max-width: 900px;
                margin: 30px auto;
                background: #f0f0f0;
                padding: 20px;
            }}
            .container {{
                background: white;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }}
            #video {{
                width: 100%;
                max-width: 640px;
                height: auto;
                aspect-ratio: 1;
                border: 3px solid #4CAF50;
                border-radius: 8px;
                background: #000;
                margin: 20px auto;
                display: block;
            }}
            .status {{
                margin: 20px 0;
                padding: 15px;
                background: #e8f5e9;
                border-radius: 5px;
                border-left: 4px solid #4CAF50;
            }}
            .debug {{
                margin-top: 20px;
                padding: 15px;
                background: #f5f5f5;
                border-radius: 5px;
                font-size: 12px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1 style="text-align: center; color: #333;">🤖 Avatar HLS Streaming</h1>
            
            <div class="status">
                <strong>ステータス:</strong> <span id="status">ストリーム待機中...</span>
            </div>
            
            <video id="video" controls playsinline></video>
            
            <div class="debug">
                <h4>デバッグ情報</h4>
                <div>セグメント数: <span id="segment-count">0</span></div>
                <div>Media Sequence: <span id="media-seq">0</span></div>
                <div>アイドルパターン: <span id="idle-pattern">-</span></div>
                <div>最終更新: <span id="last-update">-</span></div>
            </div>
        </div>
        
        <script>
            var video = document.getElementById('video');
            var statusEl = document.getElementById('status');
            var segmentCountEl = document.getElementById('segment-count');
            var mediaSeqEl = document.getElementById('media-seq');
            var lastUpdateEl = document.getElementById('last-update');
            
            var streamUrl = window.location.origin + '/hls/stream.m3u8';
            var hls = null;
            
            function checkStreamStatus() {{
                fetch('/api/stream-status')
                    .then(res => res.json())
                    .then(data => {{
                        segmentCountEl.textContent = data.segments;
                        mediaSeqEl.textContent = data.media_sequence;
                        lastUpdateEl.textContent = new Date().toLocaleTimeString();
                        
                        if (data.streaming && !hls) {{
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
                        maxMaxBufferLength: 120
                    }});
                    
                    hls.loadSource(streamUrl);
                    hls.attachMedia(video);
                    
                    hls.on(Hls.Events.MANIFEST_PARSED, function() {{
                        statusEl.textContent = '✅ ストリーミング中';
                        statusEl.style.color = 'green';
                        video.play().catch(e => {{
                            statusEl.textContent = '▶️ 再生ボタンを押してください';
                        }});
                    }});
                    
                    hls.on(Hls.Events.ERROR, function(event, data) {{
                        if (data.fatal) {{
                            statusEl.textContent = '❌ エラー発生';
                            statusEl.style.color = 'red';
                            
                            setTimeout(() => {{
                                hls.destroy();
                                hls = null;
                                checkStreamStatus();
                            }}, 3000);
                        }}
                    }});
                }}
            }}
            
            setInterval(checkStreamStatus, 2000);
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
        return make_response(jsonify({"error": "File not found"}), 404)
    
    if filename.endswith('.m3u8'):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        response = make_response(content)
        response.headers['Content-Type'] = 'application/vnd.apple.mpegurl; charset=utf-8'
    elif filename.endswith('.ts'):
        return send_from_directory(HLS_DIR, filename, mimetype='video/mp2t', as_attachment=False)
    else:
        return send_from_directory(HLS_DIR, filename, mimetype='application/octet-stream')
    
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

existing_tunnels = ngrok.get_tunnels()
if existing_tunnels:
    print(f"\n⚠️ 既存のngrokトンネルが見つかりました ({len(existing_tunnels)}個)")
    ngrok.kill()
    time.sleep(2)

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
# 4. モデルのロード(修正版)
# ============================================

print("\n📄 モデルをロード中...")

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"使用デバイス: {device}")

# MotionAdapter
print("1/5: MotionAdapter をロード...")
adapter = MotionAdapter.from_pretrained(
    "wangfuyun/AnimateLCM",
    torch_dtype=torch.float16
)

# 各コンポーネントを個別にロード
print("2/5: VAE をロード...")
vae = AutoencoderKL.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    subfolder="vae",
    torch_dtype=torch.float16
)

print("3/5: Tokenizer をロード...")
tokenizer = CLIPTokenizer.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    subfolder="tokenizer"
)

print("4/5: Text Encoder をロード...")
text_encoder = CLIPTextModel.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    subfolder="text_encoder",
    torch_dtype=torch.float16
)

print("5/5: UNet をロード...")
unet = UNet2DConditionModel.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    subfolder="unet",
    torch_dtype=torch.float16
)

# パイプラインを手動で組み立て
pipe = AnimateDiffPipeline(
    vae=vae,
    text_encoder=text_encoder,
    tokenizer=tokenizer,
    unet=unet,
    motion_adapter=adapter,
    scheduler=LCMScheduler.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        subfolder="scheduler"
    )
)

pipe.scheduler = LCMScheduler.from_config(
    pipe.scheduler.config,
    beta_schedule="linear"
)

pipe = pipe.to(device)

# IP Adapter (オプション)
try:
    pipe.load_ip_adapter(
        "h94/IP-Adapter",
        subfolder="models",
        weight_name="ip-adapter_sd15.bin"
    )
    pipe.set_ip_adapter_scale(0.8)
    print("✅ IP-Adapter有効")
except Exception as e:
    print(f"⚠️ IP-Adapterスキップ: {e}")

pipe.enable_vae_slicing()

print("✅ モデルのロード完了")

# ============================================
# 5. HLSストリーミング関数
# ============================================

def frames_to_hls_stream(frames, fps=24, append=False):
    """フレームをHLS形式でストリーミング配信"""
    global streaming_state
    
    print(f"\n🎬 HLSストリーミング {'追加' if append else '開始'} ({len(frames)} フレーム, {fps}fps)")
    print(f"   動画の長さ: {len(frames)/fps:.2f}秒")
    
    with streaming_lock:
        temp_video = HLS_DIR / f"temp_input_{streaming_state['sequence_number']}.mp4"
        imageio.mimsave(str(temp_video), frames, fps=fps, codec='libx264', quality=8)
        
        print(f"✅ 一時動画作成完了: {temp_video}")
        
        hls_output = HLS_DIR / "stream.m3u8"
        segment_duration = len(frames) / fps
        
        segment_filename = f"stream{streaming_state['sequence_number']:03d}.ts"
        segment_path = HLS_DIR / segment_filename
        
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
            
            streaming_state["segment_info"][segment_filename] = {
                "duration": segment_duration,
                "sequence": streaming_state["sequence_number"]
            }
            
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
                
                streaming_state["media_sequence"] += segments_to_remove
            
            remaining_segments = sorted(streaming_state["segment_info"].keys(), 
                                      key=lambda x: streaming_state["segment_info"][x]["sequence"])
            
            max_duration = int(max([info["duration"] for info in streaming_state["segment_info"].values()])) + 1
            
            playlist = "#EXTM3U\n"
            playlist += "#EXT-X-VERSION:6\n"
            playlist += f"#EXT-X-TARGETDURATION:{max_duration}\n"
            playlist += f"#EXT-X-MEDIA-SEQUENCE:{streaming_state['media_sequence']}\n"
            
            if not append:
                playlist += "#EXT-X-PLAYLIST-TYPE:EVENT\n"
            
            playlist += "#EXT-X-INDEPENDENT-SEGMENTS\n"
            
            for seg in remaining_segments:
                duration = streaming_state["segment_info"][seg]["duration"]
                playlist += f"#EXTINF:{duration:.6f},\n"
                playlist += f"{seg}\n"
            
            with open(hls_output, 'w', encoding='utf-8', newline='\n') as f:
                f.write(playlist)
            
            print(f"📄 プレイリスト更新完了:")
            print(f"   セグメント数: {len(remaining_segments)}")
            print(f"   MEDIA-SEQUENCE: {streaming_state['media_sequence']}")
            
            streaming_state["active"] = True
            streaming_state["sequence_number"] += 1
            
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ FFmpegエラー:")
            print(f"   stderr: {e.stderr if e.stderr else 'N/A'}")
            return False
        finally:
            if temp_video.exists():
                temp_video.unlink()

def get_next_idle_pattern():
    """次のアイドルパターンを選択"""
    global idle_state
    
    available_patterns = []
    weights = []
    
    for pattern in IDLE_MOTION_PATTERNS:
        recent_count = idle_state["pattern_history"][-3:].count(pattern["name"])
        adjusted_weight = pattern["weight"] * (0.3 ** recent_count)
        
        if adjusted_weight > 0:
            available_patterns.append(pattern)
            weights.append(adjusted_weight)
    
    if available_patterns:
        selected = random.choices(available_patterns, weights=weights)[0]
        
        idle_state["pattern_history"].append(selected["name"])
        if len(idle_state["pattern_history"]) > 10:
            idle_state["pattern_history"].pop(0)
        
        return selected
    
    return IDLE_MOTION_PATTERNS[0]

def generate_idle_variation_seed():
    """アイドル用のシード生成"""
    global idle_state, fixed_seed
    
    if idle_state["base_seed"] is None:
        idle_state["base_seed"] = fixed_seed if fixed_seed else random.randint(0, 2147483647)
    
    if idle_state["pattern_count"] % 5 == 0:
        idle_state["seed_offset"] = random.randint(-1000, 1000)
    else:
        idle_state["seed_offset"] += random.randint(-100, 100)
    
    variation_seed = (idle_state["base_seed"] + idle_state["seed_offset"]) % 2147483647
    
    return variation_seed

def generate_avatar_animation_simple(expression_type="talking", emotion="neutral"):
    """簡易版アニメーション生成(アイドル時にバリエーション追加)"""
    global last_frame, fixed_seed, idle_state
    
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
        
        if expression_type == "idle":
            idle_pattern = get_next_idle_pattern()
            idle_state["pattern_count"] += 1
            
            print(f"   🎭 アイドルパターン: {idle_pattern['name']} (#{idle_state['pattern_count']})")
            
            variation_seed = generate_idle_variation_seed()
            
            base_idle = motion_prompts["idle"]
            variation_motion = idle_pattern["prompt"]
            
            continuity_prompt = ""
            if last_frame is not None:
                continuity_prompt = "maintaining consistent appearance, same clothing, same hairstyle, same facial features, smooth transition, "
            
            prompt = f"""
            A person in idle state, {base_idle}, {variation_motion},
            {continuity_prompt}
            natural blinking, eyes blinking gently and naturally,
            {emotion_desc},
            consistent character appearance, same person throughout,
            natural resting face, gentle animation,
            photorealistic, high quality, 8K resolution, smooth animation, subtle motion
            """
            
            num_frames = random.choice([10, 12, 14])
            num_inference_steps = 3
            guidance_scale = 1.2 + (random.random() * 0.2 - 0.1)
            fps = random.choice([6, 7, 8])
            current_seed = variation_seed
            
        elif expression_type == "dance":
            motion_desc = motion_prompts.get(expression_type, motion_prompts["talking"])
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
            current_seed = fixed_seed
            
        else:
            motion_desc = motion_prompts.get("talking")
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
            current_seed = fixed_seed
        
        negative_prompt = """
        low quality, worst quality, blurry, distorted, deformed,
        static, frozen, unnatural movements, artificial, stiff, motionless,
        eyes wide open without blinking, static eyes, no eye movement,
        different person, changing appearance, inconsistent clothing,
        morphing face, unstable features
        """
        
        pipe.set_ip_adapter_scale(0.95)
        
        output = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            ip_adapter_image=init_image,
            num_frames=num_frames,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            generator=torch.Generator(device=device).manual_seed(current_seed)
        )
        
        frames = output.frames[0]
        last_frame = frames[-1]
        
        if expression_type == "idle":
            idle_state["transition_frame"] = last_frame
        
        return frames, fps

def continuous_idle_streaming():
    """連続的にアイドル動画を生成してストリーミング(バリエーション版)"""
    global streaming_state, idle_state
    
    print("🔄 連続アイドルストリーミング開始(バリエーション対応)...")
    
    last_generation_time = time.time()
    min_interval = 1.5
    
    idle_state = {
        "pattern_history": [],
        "last_pattern": None,
        "pattern_count": 0,
        "seed_offset": 0,
        "base_seed": None,
        "transition_frame": None
    }
    
    while not streaming_state["should_stop"]:
        if streaming_state["mode"] == "talking":
            time.sleep(0.5)
            if idle_state["pattern_count"] > 0:
                idle_state["pattern_count"] = 0
                idle_state["seed_offset"] = 0
            continue
        
        elapsed = time.time() - last_generation_time
        if elapsed < min_interval:
            time.sleep(min_interval - elapsed)
        
        print(f"\n🔹 アイドル動画生成中... (バリエーション #{idle_state['pattern_count'] + 1})")
        
        try:
            idle_frames, idle_fps = generate_avatar_animation_simple("idle", "neutral")
            frames_to_hls_stream(idle_frames, fps=idle_fps, append=True)
            print(f"✅ アイドルセグメント追加完了 (パターン履歴: {idle_state['pattern_history'][-3:]})")
            
            last_generation_time = time.time()
            
            if idle_state["pattern_count"] % 10 == 0:
                print("   🔄 シードオフセットをリフレッシュ")
                idle_state["seed_offset"] = random.randint(-5000, 5000)
            
        except Exception as e:
            print(f"❌ アイドル生成エラー: {e}")
            time.sleep(2)
    
    print("🛑 連続ストリーミング停止")

# ============================================
# 6. 画像アップロード
# ============================================

print("\n📤 アバターの初期画像をアップロードしてください")
uploaded = files.upload()

uploaded_filename = list(uploaded.keys())[0]
init_image = Image.open(io.BytesIO(uploaded[uploaded_filename]))
init_image = init_image.convert("RGB").resize((512, 512))

print(f"✅ 画像アップロード完了: {uploaded_filename}")
print(f"   画像サイズ: {init_image.size}")

display(init_image)

# ============================================
# 7. チャットシステムのセットアップ
# ============================================

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

DEBUG_COMMANDS = {
    "/happy": {"emotion": "happy", "text": "😊 嬉しい表情で話します!"},
    "/angry": {"emotion": "angry", "text": "😠 怒った表情で話します!"},
    "/sad": {"emotion": "sad", "text": "😢 悲しい表情で話します..."},
    "/excited": {"emotion": "excited", "text": "😆 笑顔で話します!"},
    "/smile": {"emotion": "happy", "text": "😄 笑顔です!"},
    "/thinking": {"emotion": "thinking", "text": "🤔 考え中..."},
    "/neutral": {"emotion": "neutral", "text": "😐 普通の表情です"},
    "/dance": {"emotion": "excited", "text": "💃 楽しく踊ります!", "motion": "dance"},
    "/talk": {"emotion": "neutral", "text": "💬 普通に話します", "motion": "talking"},
    "/idle": {"emotion": "neutral", "text": "😌 待機状態です", "motion": "idle"},
    "/help": {"emotion": None, "text": "📋 利用可能なコマンド:\n/happy, /angry, /sad, /excited, /smile, /thinking, /neutral, /dance, /talk, /idle"}
}

def process_chat_message(user_message):
    """ユーザーメッセージに対する応答を生成"""
    
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
    
    response = random.choice(demo_responses)
    response_text = response["text"]
    emotion = response["emotion"]
    
    print(f"\n💬 ユーザー: {user_message}")
    print(f"🤖 アバター: {response_text} [感情: {emotion}]")
    
    return response_text, emotion, "talking"

def show_idle_patterns():
    """利用可能なアイドルパターンを表示"""
    print("\n📋 利用可能なアイドルパターン:")
    for i, pattern in enumerate(IDLE_MOTION_PATTERNS, 1):
        print(f"  {i}. {pattern['name']} (重み: {pattern['weight']})")
        print(f"     → {pattern['prompt'][:50]}...")
    print(f"\n合計: {len(IDLE_MOTION_PATTERNS)} パターン")

# プログレスバー表示エリア
progress_area = widgets.Output(layout=widgets.Layout(height='80px', border='1px solid #ddd', padding='10px'))

last_frame = None
fixed_seed = None

# ============================================
# 8. チャットインターフェース構築
# ============================================

print("\n" + "="*50)
print("💬 リアルタイムアバター会話システム (HLS配信)")
print("="*50)

streaming_link = widgets.HTML(
    value=f'''
    <div style="border:2px solid #2196F3; padding:15px; background:#e3f2fd; margin:10px 0; border-radius:5px;">
        <h3>📺 ストリーミングプレイヤー</h3>
        <p>以下のURLでストリーミング視聴できます:</p>
        <a href="{public_url_str}" target="_blank" style="font-size:16px; color:#2196F3;">
            {public_url_str}
        </a>
        <p style="margin-top:10px; font-size:14px;">
            <strong>HLSストリームURL(外部プレイヤー用):</strong><br>
            <code style="background:#f0f0f0; padding:5px; border-radius:3px;">{public_url_str}/hls/stream.m3u8</code>
        </p>
        <p style="margin-top:10px; font-size:12px; color:#666;">
            ※ 新しいタブで開いてください。メッセージ送信後、数秒で配信が始まります。
        </p>
    </div>
    ''',
    layout=widgets.Layout(width='100%')
)

print("\n🎬 初期idle動画を生成中...")

# 初回のアイドル動画生成
idle_frames, idle_fps = generate_avatar_animation_simple("idle", "neutral")

print("📡 初回ストリーミング開始...")
frames_to_hls_stream(idle_frames, fps=idle_fps, append=False)

print("✅ 初期idle動画の配信開始")

# バックグラウンドでの連続生成を開始
streaming_state["should_stop"] = False
streaming_state["mode"] = "idle"
streaming_thread = threading.Thread(target=continuous_idle_streaming, daemon=True)
streaming_thread.start()

print("🔄 連続アイドルストリーミングが開始されました")

with progress_area:
    clear_output(wait=True)
    print("待機中...")

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

chat_history = widgets.HTML(
    value='<div style="border:1px solid #ddd; padding:10px; height:250px; overflow-y:scroll; background:#f9f9f9;"><p><b>アバター:</b> こんにちは!何でも聞いてくださいね。</p></div>',
    layout=widgets.Layout(height='270px')
)

status_label = widgets.HTML(
    value='<p style="color:#666; font-size:12px;">💡 メッセージを入力してEnterキーまたは送信ボタンを押してください</p>'
)

def on_send_clicked(b):
    global streaming_state
    
    user_message = chat_input.value.strip()
    
    if not user_message:
        return
    
    chat_input.value = ''
    send_button.disabled = True
    chat_input.disabled = True
    
    status_label.value = '<p style="color:#ff6600; font-size:12px;">🎬 アバターが応答を生成中...</p>'
    
    current_history = chat_history.value
    current_history = current_history.replace('</div>', f'<p><b>あなた:</b> {user_message}</p></div>')
    chat_history.value = current_history
    
    # アイドルモードから会話モードに切り替え
    streaming_state["mode"] = "talking"
    
    print("\n" + "="*50)
    print("🎬 アバター応答を生成中...")
    
    result = process_chat_message(user_message)
    
    # ヘルプコマンドの場合
    if len(result) == 2 and result[1] is None:
        response_text = result[0]
        
        current_history = chat_history.value
        current_history = current_history.replace('</div>', f'<p><b>システム:</b><br>{response_text.replace(chr(10), "<br>")}</p></div>')
        chat_history.value = current_history
        
        streaming_state["mode"] = "idle"
        
        send_button.disabled = False
        chat_input.disabled = False
        status_label.value = '<p style="color:#666; font-size:12px;">💡 メッセージを入力してEnterキーまたは送信ボタンを押してください</p>'
        return
    
    response_text, emotion, motion_type = result
    
    print(f"   🔹 アニメーション生成中... [感情: {emotion}, モーション: {motion_type}]")
    
    # プログレス表示
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
    
    progress_bar.value = 30
    progress_label.value = f'<p>🎭 感情: {emotion}, モーション: {motion_type}</p>'
    
    # アニメーション生成
    talking_frames, talking_fps = generate_avatar_animation_simple(motion_type, emotion)
    
    progress_bar.value = 70
    progress_label.value = '<p>📡 HLSストリーミング配信中...</p>'
    
    # HLS配信
    frames_to_hls_stream(talking_frames, fps=talking_fps, append=True)
    
    progress_bar.value = 100
    progress_bar.bar_style = 'success'
    progress_label.value = '<p>✅ 配信完了!</p>'
    
    print("="*50 + "\n")
    
    # アイドルモードに戻る
    streaming_state["mode"] = "idle"
    
    with progress_area:
        clear_output(wait=True)
        print("待機中...")
    
    current_history = chat_history.value
    current_history = current_history.replace('</div>', f'<p><b>アバター:</b> {response_text}</p></div>')
    chat_history.value = current_history
    
    send_button.disabled = False
    chat_input.disabled = False
    
    status_label.value = '<p style="color:#666; font-size:12px;">💡 メッセージを入力してEnterキーまたは送信ボタンを押してください</p>'

def on_text_submit(text_widget):
    on_send_clicked(None)

send_button.on_click(on_send_clicked)
chat_input.on_submit(on_text_submit)

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
# 9. 使い方ガイド
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
print(f"   → プレイヤーで再生が始まる(約2-3秒後)")
print(f"\n4. メッセージ送信がない間は...")
print(f"   → 自動的にidleアニメーションを連続生成")
print(f"   → {len(IDLE_MOTION_PATTERNS)}種類のパターンからランダム選択")
print(f"   → 同じパターンが連続しないよう調整")
print(f"   → シードも変化して自然なバリエーション")
print(f"\n💡 Tips:")
print(f"   - アイドル状態は{len(IDLE_MOTION_PATTERNS)}種類のパターンから自動選択")
print(f"   - 同じパターンが連続しないよう工夫されています")
print(f"   - シードも変化して、自然な変化を実現")
print(f"\n🛠 デバッグコマンド:")
print(f"   /help - 利用可能なコマンド一覧")
print(f"   /happy, /sad, /angry - 感情の変更")
print(f"   /dance, /talk, /idle - モーションの変更")
print(f"\n📋 アイドルパターン確認:")
print(f"   show_idle_patterns() を実行すると確認できます")
print("="*50)

print("\n✅ すべてのセットアップ完了!")
print("💬 メッセージを送信してアバターと会話を始めましょう!")
print(f"📺 ストリーミング視聴: {public_url_str}")