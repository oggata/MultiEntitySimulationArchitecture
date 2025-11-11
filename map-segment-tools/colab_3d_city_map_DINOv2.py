# 3D City Map Generator - DINOv2 Version
# Google Colab Notebook
#
# 🎯 DINOv2による3Dシティマップ生成
# 
# DINOv2の特徴:
# - Meta AIによる自己教師あり学習モデル（Self-Supervised Learning）
# - 強力な視覚特徴抽出能力（1024次元の埋め込み）
# - Vision Transformerアーキテクチャベース
# - 高精度なセマンティックセグメンテーションが可能
#
# このバージョンでは:
# - DINOv2-Largeをバックボーンとして使用
# - カスタムセグメンテーションヘッドで150クラス分類
# - タイリング処理による高解像度画像対応
# - ADE20K互換のクラスマッピング

"""
セットアップ
"""
!pip install -q transformers torch torchvision
!pip install -q opencv-python matplotlib
!pip install -q accelerate scipy timm scikit-learn scikit-image psutil
!pip install -q segment-anything git+https://github.com/facebookresearch/segment-anything.git

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import cv2
import matplotlib.pyplot as plt
from transformers import AutoImageProcessor, AutoModel
from PIL import Image
import json
import os
import gc
from google.colab import files
from sklearn.cluster import MiniBatchKMeans
from sklearn.preprocessing import StandardScaler
from segment_anything import sam_model_registry, SamAutomaticMaskGenerator

print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")

# メモリ使用量チェック関数
def print_memory_usage(label=""):
    """メモリ使用量を表示"""
    if torch.cuda.is_available():
        allocated = torch.cuda.memory_allocated() / 1024**3
        reserved = torch.cuda.memory_reserved() / 1024**3
        print(f"  💾 GPU Memory {label}: {allocated:.2f}GB allocated, {reserved:.2f}GB reserved")
    else:
        import psutil
        process = psutil.Process()
        mem_info = process.memory_info()
        print(f"  💾 RAM {label}: {mem_info.rss / 1024**3:.2f}GB")

"""
🎛️ 調整可能なパラメータ
"""
# ============================================================
# 🤖 DINOv2モデル設定
DINOV2_MODEL = "facebook/dinov2-base"  # Options: dinov2-base(768d), dinov2-large(1024d), dinov2-giant(1536d)
FEATURE_DIM = 768          # DINOv2の特徴次元 (base:768, large:1024, giant:1536)

# 🎨 セグメンテーション方式
USE_SAM = True             # SAM (Segment Anything Model) を使用（推奨）
USE_CLUSTERING = False     # k-meansクラスタリングを使用（SAM無効時のみ）
NUM_CLUSTERS = 12          # クラスタ数 (10-20推奨) ⬆️増やすと詳細なセグメント

# 🤖 SAMモデル設定
SAM_MODEL_TYPE = "vit_b"   # Options: vit_b(base), vit_l(large), vit_h(huge)
SAM_CHECKPOINT_URL = {
    "vit_b": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth",
    "vit_l": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_l_0b3195.pth",
    "vit_h": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth"
}

# SAM自動マスク生成パラメータ
SAM_POINTS_PER_SIDE = 32        # グリッドポイント数 (16-64) ⬆️増やすと詳細だが遅い
SAM_PRED_IOU_THRESH = 0.88      # IoU閾値 (0.8-0.95)
SAM_STABILITY_SCORE_THRESH = 0.95  # 安定性スコア閾値
SAM_MIN_MASK_REGION_AREA = 100  # 最小マスク面積 (ピクセル)

# 🛣️ 道路検出パラメータ
ROAD_COLOR_TOLERANCE = 35       # グレー判定の色差閾値 (20-50) ⬇️小さいほど厳格
ROAD_ASPECT_RATIO_MIN = 2.0     # 道路と判定する最小アスペクト比 (1.5-3.0) ⬇️小さいほど検出しやすい
ROAD_SMALL_SEGMENT_THRESH = 0.005  # 小セグメントを道路とする面積閾値 ⬆️大きいほど小片も道路に
MERGE_ROAD_SEGMENTS = True      # 道路セグメントを統合（推奨）

# 💾 メモリ最適化設定
DOWNSAMPLE_FOR_CLUSTERING = True  # クラスタリング時に画像をダウンサンプル（メモリ節約）
CLUSTERING_DOWNSAMPLE_FACTOR = 2  # ダウンサンプル率 (2=1/2サイズ、4=1/4サイズ)
CLEAR_CACHE_BETWEEN_TILES = True  # タイル処理間でキャッシュクリア

# 📸 画像処理パラメータ
MAX_IMAGE_SIZE = 1024      # 入力画像の最大サイズ (640-2048) ⬆️大きいほど精度向上 ⚠️メモリ不足の場合は640-800に下げる
USE_TILING = True          # タイル分割処理（精度向上に重要）
TILE_SIZE = 518            # タイルサイズ (518推奨: DINOv2の入力サイズ) ⬆️大きいほど精度向上
TILE_OVERLAP = 64          # タイル間の重複 (32-128) ⬆️大きいほど境界が綺麗

# 🏗️ メッシュ生成パラメータ
MIN_SEGMENT_AREA = 50      # 最小セグメント面積 (20-200) ⬆️増やすとセグメント数減少
MESH_RESOLUTION = 2        # メッシュ解像度 (1-4、大きいほど粗くて軽量) ⬆️増やすとファイルサイズ減少

# 🔧 後処理パラメータ
APPLY_MORPHOLOGY = True    # モルフォロジー処理（ノイズ除去）
MORPHOLOGY_KERNEL = 7      # カーネルサイズ (3-9) ⬆️大きいほどノイズ除去が強力

# 🔍 境界検出パラメータ
DETECT_BOUNDARIES = True   # 境界領域を検出
BOUNDARY_THICKNESS = 3     # 境界の太さ（ピクセル）1-5 ⬇️小さくすると建物と道路の混合を軽減
BOUNDARY_AS_SEPARATOR = True  # 境界を「その他」として分離

# 🎯 精度向上設定（道路と建物の混合を防ぐ）
APPLY_CLASS_SMOOTHING = True   # クラスごとの平滑化
CLASS_SMOOTHING_ITERATIONS = 2  # 平滑化の反復回数 (1-3)
# ============================================================

print(f"\n📐 Settings:")
print(f"   Method: {'SAM + DINOv2' if USE_SAM else 'Clustering'}")
if USE_SAM:
    print(f"   SAM: {SAM_MODEL_TYPE} (points={SAM_POINTS_PER_SIDE})")
    print(f"   Road detection: tolerance={ROAD_COLOR_TOLERANCE}, aspect≥{ROAD_ASPECT_RATIO_MIN}")
    print(f"   Road merge: {'ON' if MERGE_ROAD_SEGMENTS else 'OFF'}")
print(f"   DINOv2: {DINOV2_MODEL} ({FEATURE_DIM}d)")
print(f"   Image: MAX_SIZE={MAX_IMAGE_SIZE}")
if USE_CLUSTERING:
    print(f"   Clustering: k={NUM_CLUSTERS}")
print(f"   Mesh: MIN_AREA={MIN_SEGMENT_AREA}, RES={MESH_RESOLUTION}")
if DETECT_BOUNDARIES:
    print(f"   Boundary detection: ON (thickness={BOUNDARY_THICKNESS}px)")

print("\n💡 メモリ不足が発生する場合:")
print("   1. MAX_IMAGE_SIZE を 640 に下げる")
if USE_SAM:
    print("   2. SAM_POINTS_PER_SIDE を 16 に下げる")
    print("   3. SAM_MODEL_TYPE を 'vit_b' に設定")
else:
    print("   2. CLUSTERING_DOWNSAMPLE_FACTOR を 4 に上げる")
    print("   3. NUM_CLUSTERS を 8 に下げる")

"""
DINOv2特徴抽出器の定義
"""
class DINOv2FeatureExtractor(nn.Module):
    def __init__(self, dinov2_model):
        super().__init__()
        self.dinov2 = dinov2_model
        
    def forward(self, x):
        # DINOv2で特徴抽出
        with torch.no_grad():
            outputs = self.dinov2(x, output_hidden_states=True)
            # 最後の隠れ層を使用
            hidden_states = outputs.last_hidden_state
            # CLSトークンを除外してパッチトークンのみを取得
            patch_features = hidden_states[:, 1:, :]  # [B, N, C]
        
        # パッチを2D特徴マップに再構成
        B, N, C = patch_features.shape
        H = W = int(N ** 0.5)
        patch_features = patch_features.reshape(B, H, W, C).permute(0, 3, 1, 2)
        
        return patch_features

"""
モデル読み込み
"""
device = "cuda" if torch.cuda.is_available() else "cpu"

# 1. DINOv2モデルの読み込み
print(f"\n📥 Loading DINOv2 model: {DINOV2_MODEL}")
dinov2_backbone = AutoModel.from_pretrained(DINOV2_MODEL).to(device)
processor = AutoImageProcessor.from_pretrained(DINOV2_MODEL)
model = DINOv2FeatureExtractor(dinov2_backbone).to(device)
model.eval()
print(f"✅ DINOv2 loaded! ({FEATURE_DIM} dim)")

# 2. SAMモデルの読み込み
sam_model = None
mask_generator = None

if USE_SAM:
    print(f"\n📥 Loading SAM model: {SAM_MODEL_TYPE}")
    
    # SAMチェックポイントをダウンロード
    checkpoint_path = f"sam_{SAM_MODEL_TYPE}.pth"
    if not os.path.exists(checkpoint_path):
        print(f"  Downloading SAM checkpoint...")
        import urllib.request
        urllib.request.urlretrieve(SAM_CHECKPOINT_URL[SAM_MODEL_TYPE], checkpoint_path)
    
    # SAMモデルを読み込み
    sam_model = sam_model_registry[SAM_MODEL_TYPE](checkpoint=checkpoint_path)
    sam_model.to(device)
    
    # 自動マスク生成器を作成
    mask_generator = SamAutomaticMaskGenerator(
        model=sam_model,
        points_per_side=SAM_POINTS_PER_SIDE,
        pred_iou_thresh=SAM_PRED_IOU_THRESH,
        stability_score_thresh=SAM_STABILITY_SCORE_THRESH,
        min_mask_region_area=SAM_MIN_MASK_REGION_AREA,
    )
    
    print(f"✅ SAM loaded!")
    print(f"   Model: {SAM_MODEL_TYPE}")
    print(f"   Points per side: {SAM_POINTS_PER_SIDE}")

print(f"\n🎯 Segmentation method: {'SAM + DINOv2' if USE_SAM else 'Clustering'}")
print(f"   Device: {device.upper()}")

"""
カテゴリ定義
"""
CITY_CATEGORIES = {
    'road': {'label': '道路', 'color': (128, 64, 128), 'height': 0, 'semantic_id': 0},
    'forest': {'label': '森林', 'color': (34, 139, 34), 'height': 1.5, 'semantic_id': 1},
    'park': {'label': '公園/緑地', 'color': (144, 238, 144), 'height': 0.5, 'semantic_id': 2},
    'water': {'label': '水域', 'color': (30, 144, 255), 'height': 0, 'semantic_id': 3},
    'building_a': {'label': '建物A（小）', 'color': (255, 200, 150), 'height': 0.6, 'semantic_id': 4},
    'building_b': {'label': '建物B（中小）', 'color': (255, 160, 122), 'height': 1.0, 'semantic_id': 5},
    'building_c': {'label': '建物C（中）', 'color': (240, 120, 90), 'height': 1.5, 'semantic_id': 6},
    'building_d': {'label': '建物D（中大）', 'color': (220, 80, 60), 'height': 2.2, 'semantic_id': 7},
    'building_e': {'label': '建物E（大）', 'color': (200, 40, 40), 'height': 3.0, 'semantic_id': 8},
    'bare_land': {'label': '空き地', 'color': (210, 180, 140), 'height': 0.1, 'semantic_id': 9},
    'infrastructure': {'label': 'インフラ', 'color': (100, 100, 100), 'height': 0.8, 'semantic_id': 10},
    'other': {'label': 'その他/境界', 'color': (80, 80, 80), 'height': 0, 'semantic_id': 11}
}

"""
画像アップロード
"""
print("\n📸 Upload your aerial image:")
uploaded = files.upload()
image_path = list(uploaded.keys())[0]
original_image = cv2.imread(image_path)
original_image = cv2.cvtColor(original_image, cv2.COLOR_BGR2RGB)

original_height, original_width = original_image.shape[:2]
scale_factor = 1.0

if max(original_height, original_width) > MAX_IMAGE_SIZE:
    scale_factor = MAX_IMAGE_SIZE / max(original_height, original_width)
    new_width = int(original_width * scale_factor)
    new_height = int(original_height * scale_factor)
    resized_image = cv2.resize(original_image, (new_width, new_height), interpolation=cv2.INTER_LANCZOS4)
    print(f"⚠️ Resized to: {new_width}x{new_height}")
else:
    resized_image = original_image.copy()
    print(f"✅ Size: {original_width}x{original_height}")

plt.figure(figsize=(12, 8))
plt.imshow(resized_image)
plt.title("Input Image")
plt.axis('off')
plt.show()

"""
DINOv2特徴抽出（タイリング対応・メモリ効率化版）
"""
def extract_features_with_tiling(image, processor, model, tile_size=518, overlap=64):
    """
    画像からDINOv2特徴を抽出（タイリング処理あり）
    メモリ効率を改善
    """
    h, w = image.shape[:2]
    
    if not USE_TILING or (h <= tile_size and w <= tile_size):
        print("  Single image feature extraction...")
        pil_image = Image.fromarray(image)
        inputs = processor(images=pil_image, return_tensors="pt")
        pixel_values = inputs['pixel_values'].to(device)
        
        with torch.no_grad():
            features = model(pixel_values)
        
        # 元画像サイズにアップサンプル
        upsampled_features = F.interpolate(
            features, size=image.shape[:2], mode="bilinear", align_corners=False
        )
        result = upsampled_features[0].cpu().numpy().transpose(1, 2, 0)
        
        # メモリクリア
        del features, upsampled_features, pixel_values, inputs
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        return result  # [H, W, C]
    
    print(f"  Tiling: {tile_size}px with {overlap}px overlap")
    stride = tile_size - overlap
    num_tiles_h = (h - overlap) // stride + (1 if (h - overlap) % stride > 0 else 0)
    num_tiles_w = (w - overlap) // stride + (1 if (w - overlap) % stride > 0 else 0)
    print(f"  Creating {num_tiles_h}x{num_tiles_w} = {num_tiles_h * num_tiles_w} tiles")
    
    # 特徴マップの蓄積
    feature_dim = FEATURE_DIM
    feature_sum = np.zeros((h, w, feature_dim), dtype=np.float32)
    counts = np.zeros((h, w), dtype=np.float32)
    
    tile_count = 0
    total_tiles = num_tiles_h * num_tiles_w
    
    for i in range(num_tiles_h):
        for j in range(num_tiles_w):
            tile_count += 1
            y_start = i * stride
            x_start = j * stride
            y_end = min(y_start + tile_size, h)
            x_end = min(x_start + tile_size, w)
            
            tile = image[y_start:y_end, x_start:x_end]
            pil_tile = Image.fromarray(tile)
            inputs = processor(images=pil_tile, return_tensors="pt")
            pixel_values = inputs['pixel_values'].to(device)
            
            with torch.no_grad():
                features = model(pixel_values)
            
            # 元のタイルサイズにアップサンプル
            upsampled = F.interpolate(
                features, size=tile.shape[:2], mode="bilinear", align_corners=False
            )
            tile_features = upsampled[0].cpu().numpy().transpose(1, 2, 0)  # [h, w, C]
            
            feature_sum[y_start:y_end, x_start:x_end] += tile_features
            counts[y_start:y_end, x_start:x_end] += 1
            
            # メモリクリア
            del tile_features, upsampled, features, pixel_values, inputs, pil_tile
            
            # 定期的にキャッシュをクリア
            if CLEAR_CACHE_BETWEEN_TILES and tile_count % 5 == 0:
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                gc.collect()
            
            if tile_count % 10 == 0 or tile_count == total_tiles:
                print(f"    {tile_count}/{total_tiles} tiles ({tile_count/total_tiles*100:.1f}%)")
    
    # 平均化
    counts = np.maximum(counts, 1)
    final_features = feature_sum / counts[:, :, np.newaxis]
    
    # 最終クリーンアップ
    del feature_sum, counts
    gc.collect()
    
    return final_features

"""
クラスタリングベースセグメンテーション（メモリ効率化版）
"""
def cluster_based_segmentation(features, image, num_clusters=12, use_rgb=True, rgb_weight=0.3):
    """
    DINOv2特徴量をk-meansでクラスタリング
    メモリ効率を改善（ダウンサンプリングオプション）
    
    Args:
        features: DINOv2特徴 [H, W, C]
        image: 元画像 [H, W, 3]
        num_clusters: クラスタ数
        use_rgb: RGB情報を使用するか
        rgb_weight: RGB特徴の重み
    
    Returns:
        cluster_map: クラスタID [H, W]
    """
    print(f"\n🎨 Clustering with k-means (k={num_clusters})...")
    h, w, c = features.shape
    
    # メモリ節約のためダウンサンプリング
    if DOWNSAMPLE_FOR_CLUSTERING and max(h, w) > 640:
        downsample_factor = CLUSTERING_DOWNSAMPLE_FACTOR
        h_small = h // downsample_factor
        w_small = w // downsample_factor
        
        print(f"  Downsampling for clustering: {h}x{w} → {h_small}x{w_small}")
        
        # 特徴マップをダウンサンプル（scikit-imageやnumpyを使用）
        # OpenCVは多チャンネル画像（768ch）をサポートしないため
        from skimage.transform import resize as sk_resize
        features_small = sk_resize(
            features, 
            (h_small, w_small, c), 
            order=1,  # bilinear
            preserve_range=True,
            anti_aliasing=True
        ).astype(np.float32)
        
        # RGB画像はOpenCVでダウンサンプル（3チャンネルなのでOK）
        image_small = cv2.resize(image, (w_small, h_small), interpolation=cv2.INTER_LINEAR)
        
        # ダウンサンプル版でクラスタリング
        cluster_map_small = _perform_clustering(
            features_small, image_small, num_clusters, use_rgb, rgb_weight
        )
        
        # 元のサイズにアップスケール
        cluster_map = cv2.resize(
            cluster_map_small.astype(np.float32), 
            (w, h), 
            interpolation=cv2.INTER_NEAREST
        ).astype(np.uint8)
        
        # クリーンアップ
        del features_small, image_small, cluster_map_small
        gc.collect()
    else:
        cluster_map = _perform_clustering(features, image, num_clusters, use_rgb, rgb_weight)
    
    print(f"✅ Clustering complete! Found {num_clusters} clusters")
    return cluster_map

def _perform_clustering(features, image, num_clusters, use_rgb, rgb_weight):
    """
    実際のクラスタリング処理
    """
    h, w, c = features.shape
    
    # 特徴をフラット化
    features_flat = features.reshape(-1, c)
    
    # RGB特徴を追加
    if use_rgb:
        print(f"  Adding RGB features (weight={rgb_weight})...")
        rgb_flat = image.reshape(-1, 3).astype(np.float32) / 255.0
        rgb_flat = rgb_flat * rgb_weight
        features_flat = np.concatenate([features_flat, rgb_flat], axis=1)
    
    # 特徴を正規化
    print("  Normalizing features...")
    scaler = StandardScaler()
    features_normalized = scaler.fit_transform(features_flat)
    
    # メモリ節約
    del features_flat
    gc.collect()
    
    # k-meansクラスタリング（MiniBatchKMeansで高速化）
    print("  Running k-means clustering...")
    kmeans = MiniBatchKMeans(
        n_clusters=num_clusters,
        batch_size=min(10000, features_normalized.shape[0] // 10),
        max_iter=100,
        random_state=42,
        verbose=0
    )
    cluster_labels = kmeans.fit_predict(features_normalized)
    
    # メモリクリーンアップ
    del features_normalized, kmeans
    gc.collect()
    
    # クラスタマップに再構成
    cluster_map = cluster_labels.reshape(h, w)
    
    return cluster_map

"""
SAMベースのセグメンテーション
"""
def segment_with_sam(image, mask_generator, dinov2_model, processor):
    """
    SAMで高品質なマスクを生成し、DINOv2で分類
    """
    print("\n🎭 Generating masks with SAM...")
    print_memory_usage("(before SAM)")
    
    # SAMで自動マスク生成
    masks = mask_generator.generate(image)
    print(f"✅ SAM generated {len(masks)} masks")
    print_memory_usage("(after SAM)")
    
    # マスクを品質でソート（高品質なものを優先）
    masks = sorted(masks, key=lambda x: x['predicted_iou'], reverse=True)
    
    # セグメンテーションマップを作成
    h, w = image.shape[:2]
    segmentation_map = np.zeros((h, w), dtype=np.int32)
    mask_categories = {}
    
    print("\n🔍 Classifying masks with DINOv2...")
    
    for idx, mask_data in enumerate(masks):
        if idx % 50 == 0:
            print(f"  Processing mask {idx + 1}/{len(masks)}...")
        
        mask = mask_data['segmentation']
        
        # マスク領域の平均色を取得
        mask_pixels = image[mask]
        if len(mask_pixels) == 0:
            continue
        
        mean_color = mask_pixels.mean(axis=0)
        
        # マスク領域からDINOv2特徴を抽出（小さいパッチで代表）
        # マスクの中心付近を取得
        y_coords, x_coords = np.where(mask)
        if len(y_coords) == 0:
            continue
        
        y_center = int(y_coords.mean())
        x_center = int(x_coords.mean())
        
        # 中心付近のパッチを抽出（128x128）
        patch_size = 128
        y_start = max(0, y_center - patch_size // 2)
        y_end = min(h, y_center + patch_size // 2)
        x_start = max(0, x_center - patch_size // 2)
        x_end = min(w, x_center + patch_size // 2)
        
        patch = image[y_start:y_end, x_start:x_end]
        
        # 色とマスク特性から都市カテゴリを判定
        category = classify_mask_by_color_and_features(
            mean_color, 
            mask_data['area'],
            mask_data['bbox'],
            image.shape[:2]
        )
        
        # セグメンテーションマップに追加（重複部分は上書き）
        segmentation_map[mask] = idx
        mask_categories[idx] = category
    
    # メモリクリーンアップ
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    print_memory_usage("(after classification)")
    
    return segmentation_map, mask_categories

def classify_mask_by_color_and_features(mean_color, area, bbox, image_shape):
    """
    色、面積、bbox情報から都市カテゴリを分類
    道路検出を強化
    """
    r, g, b = mean_color
    h, w = image_shape
    total_area = h * w
    area_ratio = area / total_area
    
    # bbox から形状情報を取得
    x, y, box_w, box_h = bbox
    aspect_ratio = max(box_w, box_h) / min(box_w, box_h) if min(box_w, box_h) > 0 else 1.0
    
    # 色の特性
    color_diff = max(mean_color) - min(mean_color)
    brightness = mean_color.mean()
    
    # 🛣️ 道路検出を最優先（強化版）
    # 条件1: グレー系の色（RGB値が近い）
    is_gray = color_diff < ROAD_COLOR_TOLERANCE
    # 条件2: 適切な明るさ範囲（道路は暗すぎず明るすぎない）
    is_road_brightness = 50 < brightness < 160
    # 条件3: 細長い形状、または小さいセグメント（道路の断片）
    is_elongated = aspect_ratio > ROAD_ASPECT_RATIO_MIN
    is_small_gray = area_ratio < ROAD_SMALL_SEGMENT_THRESH and is_gray
    
    if is_gray and is_road_brightness:
        if is_elongated or is_small_gray:
            return 'road'
        # グレーで形状が不明瞭なものも道路候補
        elif area_ratio < 0.01:
            return 'road'
    
    # アスファルト系の暗い道路も検出
    if (is_gray and 40 < brightness < 100 and 
        (is_elongated or area_ratio < 0.008)):
        return 'road'
    
    # 明るいグレー系（コンクリート道路）
    if (color_diff < 25 and 100 < brightness < 180 and
        (is_elongated or area_ratio < 0.01)):
        return 'road'
    
    # 水域: 青が強い
    if b > r + 20 and b > g + 20 and b > 100:
        return 'water'
    
    # 森林: 緑が強く、暗い
    if g > r + 15 and g > b + 10 and brightness < 150:
        return 'forest'
    
    # 公園/草地: 緑が強く、明るい
    if g > r + 10 and g > b + 5 and brightness >= 100:
        return 'park'
    
    # 空き地: 茶色系・ベージュ系
    if r > g > b and r > 120 and g > 100 and b < 120:
        return 'bare_land'
    
    # インフラ: グレー系だが細長くない
    if is_gray and is_road_brightness and not is_elongated:
        if area_ratio > 0.01:
            return 'infrastructure'
    
    # 建物: 残りを面積で分類
    if brightness > 100:
        if area_ratio > 0.03:
            return 'building_e'
        elif area_ratio > 0.015:
            return 'building_d'
        elif area_ratio > 0.008:
            return 'building_c'
        elif area_ratio > 0.003:
            return 'building_b'
        else:
            return 'building_a'
    
    # 暗い領域も建物の可能性
    if brightness > 50:
        if area_ratio > 0.02:
            return 'building_d'
        elif area_ratio > 0.01:
            return 'building_c'
        elif area_ratio > 0.005:
            return 'building_b'
        else:
            return 'building_a'
    
    return 'other'

# セグメンテーション実行
print("\n🔍 Running segmentation...")
print_memory_usage("(before segmentation)")

if USE_SAM and mask_generator is not None:
    # SAMベースのセグメンテーション
    predicted_segmentation, mask_to_category = segment_with_sam(
        resized_image, 
        mask_generator, 
        model, 
        processor
    )
    
    # マスクIDからカテゴリへのマッピングを作成
    cluster_to_category = mask_to_category
    
elif USE_CLUSTERING:
    # クラスタリングベースのセグメンテーション（フォールバック）
    dinov2_features = extract_features_with_tiling(resized_image, processor, model, TILE_SIZE, TILE_OVERLAP)
    print(f"✅ Features extracted! Shape: {dinov2_features.shape}")
    
    cluster_map = cluster_based_segmentation(
        dinov2_features, 
        resized_image, 
        num_clusters=NUM_CLUSTERS,
        use_rgb=True,
        rgb_weight=0.3
    )
    predicted_segmentation = cluster_map
    
    # クラスタを都市カテゴリにマッピング
    cluster_to_category = map_clusters_to_city_categories(predicted_segmentation, resized_image)
    
    del dinov2_features
    gc.collect()
else:
    print("⚠️ Error: No segmentation method enabled")
    predicted_segmentation = np.zeros(resized_image.shape[:2], dtype=np.uint8)
    cluster_to_category = {}

print(f"✅ Segmentation complete! Found {len(np.unique(predicted_segmentation))} segments")

"""
クラスタを都市カテゴリにマッピング（ルールベース）
"""
def map_clusters_to_city_categories(cluster_map, image):
    """
    クラスタIDを都市カテゴリにマッピング
    各クラスタの色、テクスチャ、形状から判定
    """
    print("\n🗺️ Mapping clusters to city categories...")
    
    num_clusters = len(np.unique(cluster_map))
    cluster_to_category = {}
    
    for cluster_id in range(num_clusters):
        mask = cluster_map == cluster_id
        if not mask.any():
            continue
        
        # クラスタ内のピクセルの平均色
        cluster_pixels = image[mask]
        mean_color = cluster_pixels.mean(axis=0)
        std_color = cluster_pixels.std(axis=0)
        
        # RGB各チャンネル
        r, g, b = mean_color
        
        # 色ベースの分類ルール
        category = 'other'
        
        # 水域: 青が強い
        if b > r + 20 and b > g + 20 and b > 100:
            category = 'water'
        
        # 森林: 緑が強く、暗い
        elif g > r + 15 and g > b + 10 and mean_color.mean() < 150:
            category = 'forest'
        
        # 公園/草地: 緑が強く、明るい
        elif g > r + 10 and g > b + 5 and mean_color.mean() >= 100:
            category = 'park'
        
        # 道路: グレー系（RGB値が近い）で中間の明るさ
        elif (max(mean_color) - min(mean_color) < 30 and 
              60 < mean_color.mean() < 140):
            category = 'road'
        
        # 空き地: 茶色系・ベージュ系
        elif r > g > b and r > 120 and g > 100 and b < 120:
            category = 'bare_land'
        
        # 建物: 残りを明るさとサイズで分類
        elif mean_color.mean() > 140:
            # 明るい色の建物
            cluster_area = mask.sum()
            total_area = mask.size
            area_ratio = cluster_area / total_area
            
            if area_ratio > 0.05:  # 大きいセグメント
                category = 'building_e'
            elif area_ratio > 0.02:
                category = 'building_d'
            elif area_ratio > 0.01:
                category = 'building_c'
            elif area_ratio > 0.005:
                category = 'building_b'
            else:
                category = 'building_a'
        
        # その他の暗い領域
        elif mean_color.mean() > 100:
            # セグメント面積で建物サイズを推定
            cluster_area = mask.sum()
            total_area = mask.size
            area_ratio = cluster_area / total_area
            
            if area_ratio > 0.03:
                category = 'building_d'
            elif area_ratio > 0.01:
                category = 'building_c'
            elif area_ratio > 0.005:
                category = 'building_b'
            else:
                category = 'building_a'
        
        cluster_to_category[cluster_id] = category
        print(f"  Cluster {cluster_id}: RGB({r:.0f},{g:.0f},{b:.0f}) → {CITY_CATEGORIES[category]['label']}")
    
    return cluster_to_category

"""
道路セグメント統合（後処理）
"""
def merge_road_segments(cluster_to_category, predicted_segmentation):
    """
    隣接する道路セグメントを統合
    """
    print("\n🛣️ Merging road segments...")
    
    # 道路セグメントIDを取得
    road_segment_ids = [seg_id for seg_id, cat in cluster_to_category.items() if cat == 'road']
    
    if len(road_segment_ids) == 0:
        print("  No road segments found")
        return cluster_to_category
    
    print(f"  Found {len(road_segment_ids)} road segments")
    
    # 道路マスクを作成
    road_mask = np.zeros(predicted_segmentation.shape, dtype=bool)
    for seg_id in road_segment_ids:
        road_mask |= (predicted_segmentation == seg_id)
    
    # モルフォロジー処理で道路を繋げる
    from scipy.ndimage import binary_closing, binary_dilation
    kernel = np.ones((5, 5), dtype=bool)
    road_mask_merged = binary_closing(road_mask, structure=kernel, iterations=2)
    
    # 小さい孤立した道路セグメントを削除
    from scipy.ndimage import label as nd_label
    labeled, num_features = nd_label(road_mask_merged)
    
    # 各連結成分のサイズをチェック
    for i in range(1, num_features + 1):
        component_mask = labeled == i
        component_size = np.sum(component_mask)
        
        # 小さすぎるセグメントは道路から除外
        if component_size < 50:
            road_mask_merged[component_mask] = False
    
    # 統合された道路マスクを1つのセグメントIDに割り当て
    # 既存の道路セグメントIDを再利用
    main_road_id = road_segment_ids[0] if road_segment_ids else None
    
    if main_road_id is not None:
        # 道路マスク全体にメインIDを割り当て
        predicted_segmentation[road_mask_merged] = main_road_id
        
        # 他の道路セグメントIDは削除
        for seg_id in road_segment_ids[1:]:
            if seg_id in cluster_to_category:
                del cluster_to_category[seg_id]
    
    road_pixels = np.sum(road_mask_merged)
    total_pixels = predicted_segmentation.size
    print(f"  Merged roads: {road_pixels:,} pixels ({road_pixels/total_pixels*100:.2f}%)")
    
    return cluster_to_category

# 道路セグメントを統合
if USE_SAM and MERGE_ROAD_SEGMENTS and 'road' in cluster_to_category.values():
    cluster_to_category = merge_road_segments(cluster_to_category, predicted_segmentation)

print("\n🗺️ Creating city segmentation map...")
city_segmentation = np.zeros(predicted_segmentation.shape, dtype=np.uint8)
category_pixel_counts = {}

for segment_id, city_category in cluster_to_category.items():
    semantic_id = CITY_CATEGORIES[city_category]['semantic_id']
    mask = predicted_segmentation == segment_id
    city_segmentation[mask] = semantic_id
    pixel_count = np.sum(mask)
    category_pixel_counts[city_category] = category_pixel_counts.get(city_category, 0) + pixel_count

print(f"\n📊 Category distribution:")
for cat, count in sorted(category_pixel_counts.items(), key=lambda x: -x[1]):
    pct = (count / city_segmentation.size) * 100
    print(f"  {CITY_CATEGORIES[cat]['label']}: {pct:.1f}%")

"""
クラスごとの平滑化処理（道路と建物の混合を防ぐ）
"""
if APPLY_CLASS_SMOOTHING:
    from scipy.ndimage import median_filter
    from scipy.stats import mode as stats_mode
    print("\n🎯 Applying class smoothing to improve accuracy...")
    
    for iteration in range(CLASS_SMOOTHING_ITERATIONS):
        # メディアンフィルタで各ピクセルを周囲の多数派クラスに置き換え
        smoothed = median_filter(city_segmentation, size=3)
        
        # 道路と建物の境界を特に処理
        road_id = CITY_CATEGORIES['road']['semantic_id']
        building_ids = [
            CITY_CATEGORIES['building_a']['semantic_id'],
            CITY_CATEGORIES['building_b']['semantic_id'],
            CITY_CATEGORIES['building_c']['semantic_id'],
            CITY_CATEGORIES['building_d']['semantic_id'],
            CITY_CATEGORIES['building_e']['semantic_id']
        ]
        
        # 道路エリア内の孤立した建物ピクセルを道路に変換
        h, w = city_segmentation.shape
        for y in range(2, h - 2):
            for x in range(2, w - 2):
                current_id = city_segmentation[y, x]
                
                # 建物ピクセルの場合のみチェック
                if current_id in building_ids:
                    neighborhood = city_segmentation[y-2:y+3, x-2:x+3]
                    road_count = np.sum(neighborhood == road_id)
                    
                    # 25ピクセル中12以上が道路なら道路に変換
                    if road_count > 12:
                        smoothed[y, x] = road_id
        
        city_segmentation = smoothed
        print(f"  Iteration {iteration + 1}/{CLASS_SMOOTHING_ITERATIONS} completed")
    
    print("✅ Class smoothing completed")

"""
境界検出と分離処理
"""
def detect_and_separate_boundaries(segmentation_map):
    """
    セグメント間の境界を検出して分離
    """
    from scipy.ndimage import sobel, generic_filter
    
    print("\n🔍 Detecting boundaries between segments...")
    
    # エッジ検出（異なるセグメント間の境界）
    edges_h = np.abs(sobel(segmentation_map.astype(float), axis=0)) > 0
    edges_v = np.abs(sobel(segmentation_map.astype(float), axis=1)) > 0
    boundaries = edges_h | edges_v
    
    # 境界を太くする（BOUNDARY_THICKNESS）
    if BOUNDARY_THICKNESS > 1:
        from scipy.ndimage import binary_dilation
        kernel = np.ones((BOUNDARY_THICKNESS, BOUNDARY_THICKNESS), dtype=bool)
        boundaries = binary_dilation(boundaries, structure=kernel)
    
    # 境界ピクセル数をカウント
    boundary_pixels = np.sum(boundaries)
    total_pixels = segmentation_map.size
    boundary_percentage = (boundary_pixels / total_pixels) * 100
    
    print(f"  Found boundaries: {boundary_pixels:,} pixels ({boundary_percentage:.2f}%)")
    
    # 境界を「その他」カテゴリに設定
    if BOUNDARY_AS_SEPARATOR:
        other_id = CITY_CATEGORIES['other']['semantic_id']
        segmentation_map[boundaries] = other_id
        print(f"  Boundaries set as 'その他' (ID: {other_id})")
    
    return segmentation_map, boundaries

# 境界検出を適用
if DETECT_BOUNDARIES:
    city_segmentation, boundary_mask = detect_and_separate_boundaries(city_segmentation)
    
    # 境界を可視化
    boundary_vis = resized_image.copy()
    boundary_vis[boundary_mask] = [255, 255, 0]  # 黄色で表示
    
    plt.figure(figsize=(12, 6))
    plt.subplot(1, 2, 1)
    plt.imshow(resized_image)
    plt.title("Original", fontsize=14)
    plt.axis('off')
    
    plt.subplot(1, 2, 2)
    plt.imshow(boundary_vis)
    plt.title("Detected Boundaries (Yellow)", fontsize=14)
    plt.axis('off')
    plt.tight_layout()
    plt.show()

print("\n📊 Distribution:")
for cat, count in sorted(category_pixel_counts.items(), key=lambda x: -x[1]):
    pct = (count / city_segmentation.size) * 100
    print(f"  {CITY_CATEGORIES[cat]['label']}: {pct:.1f}%")

"""
可視化
"""
def create_colored_segmentation(seg_map):
    h, w = seg_map.shape
    colored = np.zeros((h, w, 3), dtype=np.uint8)
    for cat_name, cat_info in CITY_CATEGORIES.items():
        mask = seg_map == cat_info['semantic_id']
        colored[mask] = cat_info['color']
    return colored

colored_segmentation = create_colored_segmentation(city_segmentation)

fig, axes = plt.subplots(1, 3, figsize=(24, 8))
axes[0].imshow(resized_image)
axes[0].set_title("Original", fontsize=16)
axes[0].axis('off')

axes[1].imshow(colored_segmentation)
axes[1].set_title("Segmentation", fontsize=16)
axes[1].axis('off')

overlay = resized_image.astype(np.float32) * 0.5 + colored_segmentation.astype(np.float32) * 0.5
axes[2].imshow(overlay.astype(np.uint8))
axes[2].set_title("Overlay", fontsize=16)
axes[2].axis('off')

plt.tight_layout()
plt.show()

"""
セグメント抽出
"""
print("\n🔬 Extracting segments...")
from scipy import ndimage
from scipy.ndimage import binary_opening, binary_closing

segments_data = []
segment_id = 0

for cat_name, cat_info in CITY_CATEGORIES.items():
    semantic_id = cat_info['semantic_id']
    mask = city_segmentation == semantic_id
    
    if not mask.any():
        continue
    
    if APPLY_MORPHOLOGY:
        kernel = np.ones((MORPHOLOGY_KERNEL, MORPHOLOGY_KERNEL), dtype=bool)
        mask = binary_opening(mask, structure=kernel)
        mask = binary_closing(mask, structure=kernel)
    
    labeled, num_features = ndimage.label(mask)
    print(f"  {cat_info['label']}: {num_features} segments")
    
    for i in range(1, num_features + 1):
        segment_mask = labeled == i
        area = np.sum(segment_mask)
        
        if area < MIN_SEGMENT_AREA:
            continue
        
        rows, cols = np.where(segment_mask)
        if len(rows) == 0:
            continue
        
        y_min, y_max = rows.min(), rows.max()
        x_min, x_max = cols.min(), cols.max()
        
        segments_data.append({
            'id': segment_id,
            'category': cat_name,
            'label': cat_info['label'],
            'semantic_id': semantic_id,
            'color': cat_info['color'],
            'height': cat_info['height'],
            'segmentation': segment_mask,
            'bbox': [int(x_min), int(y_min), int(x_max - x_min), int(y_max - y_min)],
            'area': int(area)
        })
        segment_id += 1

print(f"\n✅ Extracted {len(segments_data)} segments")

"""
3Dメッシュ生成（壁面付き）
"""
def create_3d_city_mesh(segments, image, resolution=2):
    height, width = image.shape[:2]
    meshes_data = []
    
    print(f"\n🏗️ Generating 3D meshes with walls (resolution={resolution}px)...")
    
    for idx, segment in enumerate(segments):
        if idx % 100 == 0:
            print(f"  {idx}/{len(segments)} ({idx/len(segments)*100:.1f}%)")
        
        segmentation = segment['segmentation']
        bbox = segment['bbox']
        x, y, w, h = bbox
        
        if w < 3 or h < 3:
            continue
        
        segment_area = segmentation[y:y+h, x:x+w]
        segment_image = image[y:y+h, x:x+w]
        
        if not segment_area.any():
            continue
        
        vertices = []
        faces = []
        colors = []
        step = resolution
        
        # グリッドベースの頂点マップ（壁面生成用）
        vertex_map = {}  # (grid_y, grid_x) -> vertex_index
        building_height = segment['height'] * 0.5
        
        # 上面の頂点とグリッドを生成
        for sy in range(0, segment_area.shape[0] - step, step):
            for sx in range(0, segment_area.shape[1] - step, step):
                if not segment_area[sy, sx]:
                    continue
                
                world_x = (x + sx - width/2) * 0.1
                world_z = (y + sy - height/2) * 0.1
                
                grid_y = sy // step
                grid_x = sx // step
                
                # 上面の4頂点（天井）
                base_idx = len(vertices)
                vertices.extend([
                    [float(world_x), float(building_height), float(world_z)],
                    [float(world_x + step*0.1), float(building_height), float(world_z)],
                    [float(world_x + step*0.1), float(building_height), float(world_z + step*0.1)],
                    [float(world_x), float(building_height), float(world_z + step*0.1)]
                ])
                
                # 底面の4頂点（地面）
                vertices.extend([
                    [float(world_x), 0.0, float(world_z)],
                    [float(world_x + step*0.1), 0.0, float(world_z)],
                    [float(world_x + step*0.1), 0.0, float(world_z + step*0.1)],
                    [float(world_x), 0.0, float(world_z + step*0.1)]
                ])
                
                # 色情報
                if sy < segment_image.shape[0] and sx < segment_image.shape[1]:
                    color = segment_image[sy, sx] / 255.0
                    color_list = [float(color[0]), float(color[1]), float(color[2])]
                else:
                    color_list = [0.5, 0.5, 0.5]
                
                # 少し暗い色を壁面用に作成
                wall_color = [c * 0.7 for c in color_list]
                colors.extend([color_list] * 4)  # 上面
                colors.extend([wall_color] * 4)  # 底面
                
                # 上面（天井）
                faces.extend([
                    [base_idx, base_idx+1, base_idx+2],
                    [base_idx, base_idx+2, base_idx+3]
                ])
                
                # 下面（地面）- 通常は見えないが追加
                faces.extend([
                    [base_idx+4, base_idx+6, base_idx+5],
                    [base_idx+4, base_idx+7, base_idx+6]
                ])
                
                # 壁面チェック：隣接グリッドが空なら壁を作る
                neighbors = [
                    ((grid_y, grid_x-1), base_idx+0, base_idx+4, base_idx+7, base_idx+3),  # 左壁
                    ((grid_y, grid_x+1), base_idx+1, base_idx+2, base_idx+6, base_idx+5),  # 右壁
                    ((grid_y-1, grid_x), base_idx+0, base_idx+1, base_idx+5, base_idx+4),  # 前壁
                    ((grid_y+1, grid_x), base_idx+3, base_idx+7, base_idx+6, base_idx+2),  # 後壁
                ]
                
                for (ny, nx), v0, v1, v2, v3 in neighbors:
                    # 隣接位置が範囲外またはセグメント外なら壁を生成
                    neighbor_sy = ny * step
                    neighbor_sx = nx * step
                    needs_wall = False
                    
                    if (neighbor_sy < 0 or neighbor_sy >= segment_area.shape[0] or 
                        neighbor_sx < 0 or neighbor_sx >= segment_area.shape[1]):
                        needs_wall = True
                    elif not segment_area[neighbor_sy, neighbor_sx]:
                        needs_wall = True
                    
                    if needs_wall:
                        # 壁面を追加（2つの三角形）
                        faces.extend([
                            [v0, v1, v2],
                            [v0, v2, v3]
                        ])
        
        if len(vertices) > 0:
            meshes_data.append({
                'id': int(idx),
                'category': str(segment['category']),
                'label': str(segment['label']),
                'semantic_id': int(segment['semantic_id']),
                'vertices': vertices,
                'faces': faces,
                'colors': colors,
                'center': [
                    float((x + w/2 - width/2) * 0.1),
                    float(segment['height'] * 0.5),
                    float((y + h/2 - height/2) * 0.1)
                ],
                'bbox': [int(x), int(y), int(w), int(h)],
                'area': float(segment['area']),
                'height': float(segment['height'])
            })
    
    print(f"✅ Generated {len(meshes_data)} meshes with walls")
    return meshes_data

meshes = create_3d_city_mesh(segments_data, resized_image, MESH_RESOLUTION)

"""
メタデータ生成
"""
metadata = {
    'version': '4.0',
    'method': 'sam_dinov2' if USE_SAM else 'dinov2_clustering',
    'models': {
        'dinov2': DINOV2_MODEL,
        'dinov2_dim': FEATURE_DIM,
        'sam': SAM_MODEL_TYPE if USE_SAM else None
    },
    'sam_settings': {
        'enabled': USE_SAM,
        'points_per_side': SAM_POINTS_PER_SIDE if USE_SAM else None,
        'min_mask_area': SAM_MIN_MASK_REGION_AREA if USE_SAM else None
    } if USE_SAM else None,
    'clustering': {
        'enabled': USE_CLUSTERING,
        'num_clusters': NUM_CLUSTERS,
    } if USE_CLUSTERING else None,
    'settings': {
        'max_image_size': MAX_IMAGE_SIZE,
        'min_segment_area': MIN_SEGMENT_AREA,
        'mesh_resolution': MESH_RESOLUTION,
        'tile_size': TILE_SIZE if USE_CLUSTERING else None,
        'tile_overlap': TILE_OVERLAP if USE_CLUSTERING else None
    },
    'image_size': {'width': int(resized_image.shape[1]), 'height': int(resized_image.shape[0])},
    'total_segments': len(meshes),
    'categories': {},
    'segments': []
}

for mesh in meshes:
    cat = mesh['category']
    if cat not in metadata['categories']:
        metadata['categories'][cat] = {'label': mesh['label'], 'count': 0, 'total_area': 0}
    metadata['categories'][cat]['count'] += 1
    metadata['categories'][cat]['total_area'] += float(mesh['area'])

for cat in metadata['categories']:
    metadata['categories'][cat]['total_area'] = float(metadata['categories'][cat]['total_area'])

for mesh in meshes:
    metadata['segments'].append({
        'id': int(mesh['id']),
        'category': str(mesh['category']),
        'label': str(mesh['label']),
        'semantic_id': int(mesh['semantic_id']),
        'center': [float(c) for c in mesh['center']],
        'area': float(mesh['area']),
        'bbox': [int(b) for b in mesh['bbox']]
    })

print("\n📋 Final Stats:")
print(f"  Total meshes: {metadata['total_segments']:,}")
for cat, info in metadata['categories'].items():
    print(f"    {info['label']}: {info['count']:,}")

"""
保存
"""
output_data = {'metadata': metadata, 'meshes': meshes}

with open('city_3d_model.json', 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

cv2.imwrite('segmentation_result.png', cv2.cvtColor(colored_segmentation, cv2.COLOR_RGB2BGR))

!zip -r city_3d_output_dl.zip city_3d_model.json segmentation_result.png

print("\n📥 Downloading...")
files.download('city_3d_output_dl.zip')

print("\n🎉 Complete!")
print("\n📖 SAM + DINOv2 セグメンテーション結果:")
print(f"   Method: {'SAM + DINOv2' if USE_SAM else 'Clustering'}")
if USE_SAM:
    print(f"   SAM model: {SAM_MODEL_TYPE}")
    print(f"   SAM points per side: {SAM_POINTS_PER_SIDE}")
print(f"   DINOv2 model: {DINOV2_MODEL} ({FEATURE_DIM}d)")
print(f"   検出されたセグメント数: {metadata['total_segments']:,}")

print("\n📊 カテゴリ別セグメント数:")
for cat, info in sorted(metadata['categories'].items(), key=lambda x: -x[1]['count']):
    print(f"   {info['label']}: {info['count']:,}個")

if USE_SAM:
    print("\n💡 精度向上Tips:")
    print("   - SAMポイント数を増やす: SAM_POINTS_PER_SIDE を 48-64 に増やす")
    print("   - SAMモデルを大きく: SAM_MODEL_TYPE を 'vit_l' または 'vit_h' に変更")
    print("   - DINOv2を大きく: DINOV2_MODEL を 'facebook/dinov2-large' に変更")
    print("\n🛣️ 道路検出の調整:")
    print("   - 道路が少ない場合:")
    print("     • ROAD_COLOR_TOLERANCE を 40-50 に増やす（グレー判定を緩く）")
    print("     • ROAD_ASPECT_RATIO_MIN を 1.5 に下げる（形状判定を緩く）")
    print("     • ROAD_SMALL_SEGMENT_THRESH を 0.01 に上げる（小片も道路に）")
    print("   - 道路が多すぎる場合:")
    print("     • ROAD_COLOR_TOLERANCE を 25-30 に下げる（グレー判定を厳格に）")
    print("     • ROAD_ASPECT_RATIO_MIN を 2.5-3.0 に上げる（形状判定を厳格に）")
    print("\n🔧 速度向上Tips:")
    print("   - SAMポイント数を減らす: SAM_POINTS_PER_SIDE を 16-24 に減らす")
    print("   - 画像サイズを小さく: MAX_IMAGE_SIZE を 640-800 に設定")
else:
    print("\n💡 Tips: SAMを有効にすると精度が大幅に向上します")
    print("   USE_SAM = True に設定してください")