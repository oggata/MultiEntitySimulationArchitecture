# 3D City Map Generator - High Resolution Deep Learning Version
# Google Colab Notebook

"""
セットアップ
"""
!pip install -q transformers torch torchvision
!pip install -q opencv-python matplotlib
!pip install -q accelerate scipy

import torch
import numpy as np
import cv2
import matplotlib.pyplot as plt
from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation
from PIL import Image
import json
import os
from google.colab import files

print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")

"""
🎛️ 調整可能なパラメータ
"""
# ============================================================
# 📸 画像処理パラメータ
MAX_IMAGE_SIZE = 1280      # 入力画像の最大サイズ (640-2048) ⬆️大きいほど精度向上
USE_TILING = True          # タイル分割処理（精度向上に重要）
TILE_SIZE = 640            # タイルサイズ (120-640) ⬆️大きいほど精度向上
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

print(f"\n📐 Settings: MAX_SIZE={MAX_IMAGE_SIZE}, MIN_AREA={MIN_SEGMENT_AREA}, MESH_RES={MESH_RESOLUTION}")
if DETECT_BOUNDARIES:
    print(f"   Boundary detection: ON (thickness={BOUNDARY_THICKNESS}px)")

"""
モデル読み込み
"""
print("\n📥 Loading Segformer model...")
device = "cuda" if torch.cuda.is_available() else "cpu"

processor = SegformerImageProcessor.from_pretrained(
    "nvidia/segformer-b5-finetuned-ade-640-640"
)
model = SegformerForSemanticSegmentation.from_pretrained(
    "nvidia/segformer-b5-finetuned-ade-640-640"
).to(device)

print("✅ Model loaded!")

"""
カテゴリ定義
"""
ADE20K_TO_CITY_MAPPING = {
    'road': 'road', 'street': 'road', 'path': 'road', 'sidewalk': 'road',
    'building': 'building_c', 'house': 'building_a', 'skyscraper': 'building_e',
    'highrise': 'building_e', 'tower': 'building_e',
    'office': 'building_d', 'shop': 'building_b', 'store': 'building_b',
    'apartment': 'building_c', 'hotel': 'building_d',
    'tree': 'forest', 'plant': 'forest', 'palm': 'forest',
    'grass': 'park', 'field': 'park', 'flower': 'park',
    'water': 'water', 'sea': 'water', 'river': 'water', 'lake': 'water',
    'earth': 'bare_land', 'sand': 'bare_land', 'ground': 'bare_land',
    'parking lot': 'infrastructure', 'stadium': 'building_d',
}

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

id2label = model.config.id2label

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
タイル分割セグメンテーション
"""
def segment_with_tiling(image, processor, model, tile_size=640, overlap=64):
    h, w = image.shape[:2]
    
    if not USE_TILING or (h <= tile_size and w <= tile_size):
        print("  Single image processing...")
        pil_image = Image.fromarray(image)
        inputs = processor(images=pil_image, return_tensors="pt").to(device)
        
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
        
        upsampled_logits = torch.nn.functional.interpolate(
            logits, size=image.shape[:2], mode="bilinear", align_corners=False
        )
        return upsampled_logits.argmax(dim=1)[0].cpu().numpy()
    
    print(f"  Tiling: {tile_size}px with {overlap}px overlap")
    stride = tile_size - overlap
    num_tiles_h = (h - overlap) // stride + (1 if (h - overlap) % stride > 0 else 0)
    num_tiles_w = (w - overlap) // stride + (1 if (w - overlap) % stride > 0 else 0)
    print(f"  Creating {num_tiles_h}x{num_tiles_w} = {num_tiles_h * num_tiles_w} tiles")
    
    votes = np.zeros((h, w, 150), dtype=np.float32)
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
            inputs = processor(images=pil_tile, return_tensors="pt").to(device)
            
            with torch.no_grad():
                outputs = model(**inputs)
                logits = outputs.logits
            
            upsampled = torch.nn.functional.interpolate(
                logits, size=tile.shape[:2], mode="bilinear", align_corners=False
            )
            probs = torch.nn.functional.softmax(upsampled, dim=1)[0].cpu().numpy()
            
            votes[y_start:y_end, x_start:x_end] += probs.transpose(1, 2, 0)
            counts[y_start:y_end, x_start:x_end] += 1
            
            if tile_count % 10 == 0 or tile_count == total_tiles:
                print(f"    {tile_count}/{total_tiles} tiles ({tile_count/total_tiles*100:.1f}%)")
    
    counts = np.maximum(counts, 1)
    final_votes = votes / counts[:, :, np.newaxis]
    return final_votes.argmax(axis=2)

print("\n🔍 Running segmentation...")
predicted_segmentation = segment_with_tiling(resized_image, processor, model, TILE_SIZE, TILE_OVERLAP)
print(f"✅ Done! Found {len(np.unique(predicted_segmentation))} classes")

"""
クラスマッピング
"""
def map_ade20k_to_city(class_id):
    if class_id not in id2label:
        return 'other'
    class_name = id2label[class_id].lower()
    
    # マッピング辞書を最初にチェック
    for ade_name, city_cat in ADE20K_TO_CITY_MAPPING.items():
        if ade_name in class_name:
            return city_cat
    
    # 建物の詳細分類（サイズに基づく）
    if any(w in class_name for w in ['skyscraper', 'highrise', 'tower']):
        return 'building_e'  # 大型建物
    elif any(w in class_name for w in ['office', 'hotel', 'commercial', 'stadium']):
        return 'building_d'  # 中大型建物
    elif any(w in class_name for w in ['building', 'apartment']):
        return 'building_c'  # 中型建物
    elif any(w in class_name for w in ['shop', 'store', 'market']):
        return 'building_b'  # 中小型建物
    elif any(w in class_name for w in ['house', 'home', 'shed', 'hut']):
        return 'building_a'  # 小型建物
    elif any(w in class_name for w in ['tree', 'forest', 'vegetation']):
        return 'forest'
    elif any(w in class_name for w in ['grass', 'lawn', 'field']):
        return 'park'
    elif any(w in class_name for w in ['road', 'street', 'path', 'sidewalk']):
        return 'road'
    elif any(w in class_name for w in ['water', 'ocean', 'sea', 'river', 'lake']):
        return 'water'
    
    return 'other'

print("\n🗺️ Mapping classes...")
city_segmentation = np.zeros(predicted_segmentation.shape, dtype=np.uint8)
category_pixel_counts = {}

for class_id in np.unique(predicted_segmentation):
    city_category = map_ade20k_to_city(class_id)
    semantic_id = CITY_CATEGORIES[city_category]['semantic_id']
    mask = predicted_segmentation == class_id
    city_segmentation[mask] = semantic_id
    pixel_count = np.sum(mask)
    category_pixel_counts[city_category] = category_pixel_counts.get(city_category, 0) + pixel_count

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
    'version': '2.1',
    'method': 'deep_learning_high_res',
    'model': 'segformer-b5-ade20k',
    'settings': {
        'max_image_size': MAX_IMAGE_SIZE,
        'min_segment_area': MIN_SEGMENT_AREA,
        'mesh_resolution': MESH_RESOLUTION
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

print("\n🎉 Complete! Adjust parameters at the top to fine-tune detection.")