# DINOv2セグメンテーション - 3Dシティマップ生成

## 概要

このバージョンでは、Meta AIのDINOv2（Self-Supervised Vision Transformer）を使用して、航空写真から3Dシティマップを生成します。

## DINOv2とは？

**DINOv2 (Self-Distillation with No Labels v2)** は、Meta AI Research (FAIR) が開発した自己教師あり学習モデルです。

### 主な特徴

- 🧠 **自己教師あり学習**: ラベル付きデータなしで強力な視覚表現を学習
- 🎯 **Vision Transformer**: Transformerアーキテクチャによる高精度な特徴抽出
- 📊 **高次元埋め込み**: 768次元(base)、1024次元(large)、1536次元(giant)
- 🌐 **汎用性**: 様々な下流タスク（セグメンテーション、分類、検出）に対応

### Segformerとの比較

| 特徴 | Segformer-B5 | DINOv2-Large |
|------|--------------|--------------|
| アーキテクチャ | Hierarchical Transformer | Vision Transformer |
| 学習方法 | 教師あり学習 (ADE20K) | 自己教師あり学習 |
| 特徴次元 | 512 | 1024 |
| パッチサイズ | - | 14×14 |
| 入力サイズ | 640×640 | 518×518 |
| 汎用性 | 中 | 高 |
| 精度 | 高 | 非常に高 |
| 速度 | 速い | 中程度 |

## モデルの選択

### 利用可能なモデル

```python
# 軽量・高速
DINOV2_MODEL = "facebook/dinov2-base"
FEATURE_DIM = 768

# バランス（推奨）
DINOV2_MODEL = "facebook/dinov2-large"
FEATURE_DIM = 1024

# 最高精度
DINOV2_MODEL = "facebook/dinov2-giant"
FEATURE_DIM = 1536
```

### パフォーマンス比較

| モデル | パラメータ数 | 処理速度 | 精度 | メモリ使用量 |
|--------|-------------|---------|------|-------------|
| dinov2-base | 86M | ⚡⚡⚡ | ⭐⭐⭐ | 2GB |
| dinov2-large | 304M | ⚡⚡ | ⭐⭐⭐⭐ | 4GB |
| dinov2-giant | 1.1B | ⚡ | ⭐⭐⭐⭐⭐ | 8GB |

## アーキテクチャ

### セグメンテーションパイプライン

```
入力画像 (RGB)
    ↓
DINOv2 Backbone (特徴抽出)
    ↓
Patch Features (37×37×1024)
    ↓
Segmentation Head (CNN Decoder)
  - Feature Extraction (Conv + BN + ReLU)
  - Context Aggregation (Conv + BN + ReLU)
  - Refinement (Conv + BN + ReLU)
  - Classification (Conv 1×1)
    ↓
Logits (37×37×150)
    ↓
Upsampling (Bilinear)
    ↓
Segmentation Map (H×W)
```

### セグメンテーションヘッド

DINOv2の特徴を受け取り、マルチステージ処理でセグメンテーションマップを生成します：

1. **Feature Extraction**: 1024次元 → 512次元
2. **Context Aggregation**: コンテキスト情報の集約
3. **Refinement**: 512次元 → 256次元、詳細な境界の調整
4. **Classification**: 256次元 → 150クラス

## 使用方法

### Google Colabで実行

1. `example/colab_3d_city_map.py` をGoogle Colabにコピー
2. パラメータを調整（オプション）
3. 全セルを実行
4. 航空写真をアップロード
5. 結果（JSON + PNG）をダウンロード

### パラメータ設定

```python
# モデル選択
DINOV2_MODEL = "facebook/dinov2-large"
FEATURE_DIM = 1024

# 画像処理
MAX_IMAGE_SIZE = 1280
USE_TILING = True
TILE_SIZE = 518  # DINOv2の最適入力サイズ
TILE_OVERLAP = 64

# セグメント抽出
MIN_SEGMENT_AREA = 50
MESH_RESOLUTION = 2

# 後処理
APPLY_MORPHOLOGY = True
MORPHOLOGY_KERNEL = 7
DETECT_BOUNDARIES = True
BOUNDARY_THICKNESS = 3
APPLY_CLASS_SMOOTHING = True
CLASS_SMOOTHING_ITERATIONS = 2
```

## パフォーマンス最適化

### 精度を上げる

1. **モデルサイズを大きく**: `dinov2-giant` を使用
2. **タイルサイズを最適化**: `TILE_SIZE = 518`
3. **オーバーラップを増やす**: `TILE_OVERLAP = 128`
4. **平滑化を強化**: `CLASS_SMOOTHING_ITERATIONS = 3`

### 速度を上げる

1. **モデルサイズを小さく**: `dinov2-base` を使用
2. **タイリングをオフ**: `USE_TILING = False`（小画像の場合）
3. **画像サイズを制限**: `MAX_IMAGE_SIZE = 640`
4. **メッシュ解像度を下げる**: `MESH_RESOLUTION = 4`

### メモリ使用量を減らす

1. **タイルサイズを小さく**: `TILE_SIZE = 256`
2. **バッチ処理を無効化**: タイルを1枚ずつ処理
3. **mixed precisionを有効化**: `torch.cuda.amp.autocast()`

## 技術的な詳細

### DINOv2の特徴抽出

```python
# DINOv2で特徴を抽出
features = dinov2.forward_features(x)
patch_features = features['x_norm_patchtokens']

# パッチトークンの形状: [B, N, C]
# B: バッチサイズ
# N: パッチ数 (37×37 = 1369 for 518×518 input)
# C: 特徴次元 (1024 for large)
```

### タイリング戦略

大きな画像を処理するため、オーバーラップを持つタイルに分割します：

```python
stride = TILE_SIZE - TILE_OVERLAP
num_tiles_h = (height - TILE_OVERLAP) // stride + 1
num_tiles_w = (width - TILE_OVERLAP) // stride + 1

# 各タイルの予測を加重平均で統合
votes[y:y+h, x:x+w] += predictions
counts[y:y+h, x:x+w] += 1
final_prediction = votes / counts
```

## ADE20K互換性

DINOv2モデルは150クラスの出力を持ち、ADE20Kデータセットと互換性があります。

### カテゴリマッピング

航空写真用に、ADE20Kクラスを都市カテゴリにマッピング：

- **道路**: road, street, path, sidewalk
- **建物**: building, house, skyscraper, office, shop
- **植生**: tree, plant, grass, field
- **水域**: water, sea, river, lake
- **その他**: 空き地、インフラなど

## トラブルシューティング

### メモリ不足エラー

```python
# タイルサイズを小さく
TILE_SIZE = 256

# または小さいモデルを使用
DINOV2_MODEL = "facebook/dinov2-base"
FEATURE_DIM = 768
```

### セグメンテーションが不正確

```python
# 平滑化を強化
APPLY_CLASS_SMOOTHING = True
CLASS_SMOOTHING_ITERATIONS = 3

# オーバーラップを増やす
TILE_OVERLAP = 128

# モルフォロジー処理を強化
MORPHOLOGY_KERNEL = 9
```

### 処理が遅い

```python
# タイリングを無効化（小画像の場合）
USE_TILING = False

# または小さいモデルを使用
DINOV2_MODEL = "facebook/dinov2-base"
```

## 参考文献

- **DINOv2 Paper**: [DINOv2: Learning Robust Visual Features without Supervision](https://arxiv.org/abs/2304.07193)
- **Hugging Face Model**: [facebook/dinov2-large](https://huggingface.co/facebook/dinov2-large)
- **Meta AI Blog**: [DINOv2: State-of-the-art computer vision models](https://ai.facebook.com/blog/dino-v2-computer-vision-self-supervised-learning/)

## ライセンス

DINOv2モデルは Apache 2.0 ライセンスの下で提供されています。

