# ============================================
# 完全な解決策: 正しいモデルとパラメータの組み合わせ
# ============================================

import torch
from diffusers import MotionAdapter, AnimateDiffPipeline, LCMScheduler
from diffusers.utils import export_to_video
from PIL import Image
import imageio
from google.colab import files
import io

device = "cuda" if torch.cuda.is_available() else "cpu"

print("📥 モデルをロード中...\n")

# Step 1: MotionAdapter
print("1/3: MotionAdapter をロード...")
adapter = MotionAdapter.from_pretrained(
    "wangfuyun/AnimateLCM",
    torch_dtype=torch.float16
)

# Step 2: パイプラインを正しい方法でロード
print("2/3: パイプラインを構築...")

# まずベースモデルをコンポーネント単位でロード
from diffusers import (
    AutoencoderKL,
    UNet2DConditionModel,
)
from transformers import CLIPTextModel, CLIPTokenizer

# 各コンポーネントを個別にロード
vae = AutoencoderKL.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    subfolder="vae",
    torch_dtype=torch.float16
)

tokenizer = CLIPTokenizer.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    subfolder="tokenizer"
)

text_encoder = CLIPTextModel.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    subfolder="text_encoder",
    torch_dtype=torch.float16
)

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

# スケジューラー設定
pipe.scheduler = LCMScheduler.from_config(
    pipe.scheduler.config,
    beta_schedule="linear"
)

pipe = pipe.to(device)

print("3/3: 最適化設定...")
pipe.enable_vae_slicing()

# IP Adapter (オプション)
try:
    pipe.load_ip_adapter(
        "h94/IP-Adapter",
        subfolder="models",
        weight_name="ip-adapter_sd15.bin"
    )
    pipe.set_ip_adapter_scale(0.8)
    print("✅ IP-Adapter有効\n")
except Exception as e:
    print(f"⚠️ IP-Adapterスキップ: {e}\n")

print("✅ すべてのモデルロード完了!\n")

# ============================================
# 画像アップロード
# ============================================

print("📤 アバター画像をアップロードしてください:")
uploaded = files.upload()

filename = list(uploaded.keys())[0]
init_image = Image.open(io.BytesIO(uploaded[filename]))
init_image = init_image.convert("RGB").resize((512, 512))

print(f"✅ 画像読み込み完了: {init_image.size}")
display(init_image)

# ============================================
# アニメーション生成
# ============================================

print("\n🎬 talking アニメーション生成中...\n")

output = pipe(
    prompt="A person talking, mouth opening and closing, speaking motion, lip movement, natural facial expressions, photorealistic, high quality, smooth animation",
    negative_prompt="static, frozen, motionless, low quality, blurry, distorted, deformed",
    ip_adapter_image=init_image,
    num_frames=16,
    num_inference_steps=4,
    guidance_scale=1.5,
    generator=torch.Generator(device=device).manual_seed(42)
)

frames = output.frames[0]
print(f"✅ 生成完了: {len(frames)} フレーム\n")

# 保存
video_path = '/content/talking_avatar.mp4'
imageio.mimsave(video_path, frames, fps=8, codec='libx264', quality=8)
print(f"💾 保存完了: {video_path}")

# ダウンロード
files.download(video_path)
print("✅ ダウンロード開始!")