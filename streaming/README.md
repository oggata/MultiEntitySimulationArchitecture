### MESA リアルタイム動画生成（LCM × ControlNet × IP-Adapter）

このディレクトリは、MESA（Multi-Entity Simulation Architecture）のシミュレーション結果をリアルタイムに映像化するストリーミング機構です。中核スクリプトは `streaming/stream-start.py` で、LCM（Latent Consistency Models）ベースの AnimateDiff を用い、以下の条件付けで動画を生成します。

- **LCM**: 高速推論のためのスケジューラ設定
- **IP-Adapter**: 参照画像による外観一貫性の制御（キャラクタの容姿を保つ）
- **ControlNet（Canny, OpenPose）**: シミュレーションから得られる幾何・骨格情報を条件付けに利用（輪郭・ポーズで構図とモーションを拘束）
- **リアルタイム HLS 配信**: 生成フレームを FFmpeg で `.ts` セグメント化し、`Flask` で HLS（`.m3u8`）を配信。`ngrok` で外部公開

注意: `stream-start.py` は現状、AnimateDiff LCM と IP-Adapter を読み込み、HLS 配信を行います。ControlNet（Canny/OpenPose）は設計上の前提で、同様の枠組みに容易に追加できる構成です（導入ガイドは後述）。

---

### 使い方（クイックスタート）

- **推奨実行環境**: Google Colab（`stream-start.py` は Colab/Notebook 前提のセル構成・`files.upload()`・UI ウィジェットを含みます）
- **ローカル実行**: 可能ですが、`files.upload()` 部分の差し替えや FFmpeg、GPU/CUDA 環境の準備が必要です

1) 依存関係の準備
- Colab の場合は `stream-start.py` 冒頭で必要パッケージを自動インストールします
- ローカルで整える場合は、参考として `streaming/requirements.txt` を使用してください（全量は重いので最小構成への絞り込み推奨）

2) モデル・前処理
- AnimateDiff/LCM はスクリプトが自動で取得します
- IP-Adapter は `h94/IP-Adapter`（`ip-adapter_sd15.bin`）を読み込みます
- ControlNet（Canny/OpenPose）を利用する場合は、Diffusers の ControlNetModel と前処理（Canny もしくは OpenPose 推定器）を別途導入してください（導入ガイド参照）

3) 実行
- Colab で `streaming/stream-start.py` を開き、セルを上から順に実行
- ngrok の authtoken を求められたら貼り付け
- `files.upload()` で参照画像（キャラクタの顔など）を 512×512 程度でアップロード
- 数秒後、出力に表示される公開 URL（例: `https://xxxx.ngrok.io`）にアクセスすると、HLS プレイヤーが再生を開始します

4) 停止
- `streaming/stream-stop.py` を実行すると、バックグラウンドのアイドル生成スレッドを安全に停止できます（Flask/ngrok は継続）。完全停止はランタイム再起動推奨

---

### 動作概要

- シミュレーションで得られるフレーム（あるいは状態）を条件信号に変換し、AnimateDiff LCM による低ステップ推論でフレーム列を生成
- 生成フレームを一時 MP4 に書き出し、FFmpeg で HLS の `.ts` セグメントに変換
- `.m3u8`（プレイリスト）を随時更新し、`Flask` が `/hls/stream.m3u8` と各 `.ts` を配信
- `ngrok` で HTTPS トンネルを張り、外部から HLS 視聴可能

UI 側は Notebook ウィジェットで簡易チャットを提供し、会話イベント時には「talking/dance/idle」などのモーションに応じた短尺セグメントを追加生成して、`append` で連結配信します。

---

### 提供エンドポイント

- `/`:
  - 簡易 HLS プレイヤー（`hls.js`）を含むページ
- `/hls/stream.m3u8`:
  - 最新の HLS プレイリスト
- `/hls/*.ts`:
  - セグメント（古いものは一定数でローテーション削除）
- `/api/stream-status`:
  - セグメント数や media sequence などの配信ステータス

---

### 主な可変パラメータ（`stream-start.py` 内）

- 生成フレーム数 `num_frames`（例: 10–16）
- 推論ステップ `num_inference_steps`（LCM のため小さくて良い、例: 3–4）
- `guidance_scale`（1.2–1.5 付近）
- FPS（例: 6–8）
- 乱数シード（`fixed_seed` とアイドル時のバリエーションシード）
- IP-Adapter スケール（`pipe.set_ip_adapter_scale(0.8〜0.95)`）

---

### 技術的詳細

- **生成モデル**: Diffusers の `AnimateDiffPipeline` を構築し、`LCMScheduler` で高速化した推論を行います
- **IP-Adapter**: 参照画像から外観特徴を取り込み、生成映像でキャラクタの一貫性を担保します
- **ControlNet（Canny/OpenPose）**: シミュレーションのレンダリングや状態から
  - Canny エッジ: シーンの輪郭・構図の拘束
  - OpenPose: 人物骨格や姿勢の拘束
  を抽出して条件付け（ControlNet）へ入力。これにより、カメラ・道路・群衆などの空間構成、人物の関節モーションをリアルタイムで反映できます
- **低遅延配信**: FFmpeg で `.ts` に切り出し、`#EXT-X-MEDIA-SEQUENCE` を前進させながらプレイリストを上書き。ブラウザは `hls.js` で継続再生
- **スレッド/ロック**: 生成・配信・状態更新はミューテックスで同期し、プレイリスト破損やセグメント競合を回避

---

### ControlNet（Canny/OpenPose）導入ガイド（概要）

現行スクリプトは IP-Adapter を標準で有効化しています。ControlNet を併用するには、以下を追加実装してください。

- Diffusers の `ControlNetModel` を読み込み（例: `lllyasviel/sd-controlnet-canny`, `lllyasviel/sd-controlnet-openpose`）
- 前処理:
  - Canny: OpenCV の Canny で入力画像/シミュレーションフレームからエッジ画像生成
  - OpenPose: OpenPose/Lightweight OpenPose などでキーポイント→ポーズマップ生成
- `AnimateDiffPipeline` を ControlNet 付きパイプラインで初期化、あるいは追加条件として渡す

参考イメージ（擬似コード）:
```python
from diffusers import ControlNetModel

canny_controlnet = ControlNetModel.from_pretrained("lllyasviel/sd-controlnet-canny", torch_dtype=torch.float16)
openpose_controlnet = ControlNetModel.from_pretrained("lllyasviel/sd-controlnet-openpose", torch_dtype=torch.float16)

# canny_image, pose_image はシミュレーションから得たフレームを前処理して作成
output = pipe(
    prompt=prompt,
    negative_prompt=negative_prompt,
    ip_adapter_image=init_image,
    controlnet_conditioning_image=[canny_image, pose_image],
    num_frames=num_frames,
    num_inference_steps=num_steps,
    guidance_scale=guidance,
)
```

---

### ローカル実行のポイント（上級者向け）

- `files.upload()` をローカルファイル読込に置換（例: `Image.open("path/to/ref.png")`）
- FFmpeg を事前にインストール（macOS: `brew install ffmpeg`）
- Python 環境は CUDA/GPU 推奨（LCM 前提でも CPU は実時間追従が難しい）
- `ngrok` は環境変数 `NGROK_AUTHTOKEN` を設定しておくと対話入力を省略可能
- 巨大な `requirements.txt` は包括的リストです。最低限は `torch/diffusers/transformers/accelerate/opencv-python(imageio)` と Flask/CORS/ngrok で動作します

---

### トラブルシューティング

- 再生が始まらない: `.m3u8` が生成されているか、ブラウザの CORS ブロックがないか確認
- セグメントが増え続ける: スクリプトは一定数でローテーション削除。`max_segments` を調整
- 画が崩れる/人物が変わる: IP-Adapter スケールを上げる、`fixed_seed` を固定
- レイテンシが高い: `num_frames` を短く、`num_inference_steps` を小さく、`ultrafast/zerolatency` を維持
- OpenPose が重い: 軽量モデルや解像度を下げる、推定周期を落とす

---

### ファイル構成

- `stream-start.py`: 実行メイン。モデル初期化、推論、HLS 配信、UI
- `stream-stop.py`: バックグラウンド生成の安全停止ユーティリティ
- `requirements.txt`: 包括的な依存関係リスト（参考）

---

### ライセンス/注意

- 各モデル（AnimateDiff, ControlNet, IP-Adapter 等）のライセンス・利用規約に従ってください
- ngrok の公開 URL は第三者に共有され得ます。機密情報を含む表示/音声は避けてください


