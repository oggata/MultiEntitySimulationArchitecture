# セグメンテーションベースシステムへの移行ガイド

## 📋 概要

MESAを従来のプログラム生成/エディタベースのマップシステムから、**航空写真セグメンテーションベースの実世界マップシステム**に移行しました。

### 🎯 主な変更点

1. **マップデータソース**: プログラム生成 → 航空写真のセグメンテーション
2. **建物生成**: プリミティブ形状 → 実際の建物形状（3Dメッシュ）
3. **施設割り当て**: ランダム配置 → セグメントIDベースの割り当て
4. **道路システム**: グリッドベース → セグメントベース

---

## 🏗️ アーキテクチャ

### 新システムの構成

```
航空写真
   ↓
[colab_3d_city_map.py] ← Google Colabで実行
   ↓
city_segmentation.json
   ↓
[SegmentationMapLoader] ← メッシュデータ読み込み
   ↓
[SegmentationCityManager] ← MESA統合層
   ↓
[既存のエージェントシステム] ← そのまま使用可能
```

### ファイル構成

```
src/
├── city/
│   ├── segmentation-loader.js        [NEW] セグメンテーションデータローダー
│   ├── segmentation-city-manager.js  [NEW] MESA統合マネージャー
│   ├── city-layout-manager.js        [既存] フォールバック用
│   └── ...
├── json/
│   └── city_segmentation.json        [NEW] セグメンテーションデータ
└── ...

example/
├── colab_3d_city_map.py              [参考] セグメンテーション生成スクリプト
└── index.html                        [参考] ビューワー
```

---

## 🔄 データフロー

### 1. セグメンテーションデータ生成（Google Colab）

```python
# example/colab_3d_city_map.py

航空写真アップロード
   ↓
Segformerによるセマンティックセグメンテーション
   ↓
カテゴリマッピング (building_a, building_b, road, park, etc.)
   ↓
3Dメッシュ生成（壁面付き）
   ↓
city_3d_model.json 出力
```

**出力形式**:
```json
{
  "metadata": {
    "version": "2.1",
    "total_segments": 1234,
    "categories": {
      "building_a": {"label": "建物A（小）", "count": 123},
      "road": {"label": "道路", "count": 456},
      ...
    }
  },
  "meshes": [
    {
      "id": 0,
      "category": "building_c",
      "label": "建物C（中）",
      "semantic_id": 6,
      "vertices": [[x, y, z], ...],
      "faces": [[v0, v1, v2], ...],
      "colors": [[r, g, b], ...],
      "center": [x, y, z],
      "area": 1234.5,
      "height": 1.5,
      "bbox": [x, y, w, h]
    },
    ...
  ]
}
```

### 2. MESAでの読み込み（起動時）

```javascript
// src/core/main.js

起動
   ↓
city_segmentation.json を検索
   ├─ 見つかった → セグメンテーションモード
   │    ↓
   │  SegmentationCityManager 初期化
   │    ↓
   │  メッシュ生成 & シーンに追加
   │    ↓
   │  施設自動割り当て
   │    ↓
   │  MESA形式に変換
   │
   └─ 見つからない → 従来モード
        ↓
      エディタデータ or プログラム生成
```

### 3. 施設割り当てロジック

```javascript
// src/city/segmentation-loader.js
// autoAssignFacilities()

建物セグメントを取得
   ↓
高さと面積でソート
   ↓
優先度順に施設を割り当て
   ├─ 高い建物 → 病院、学校、図書館
   ├─ 中型建物 → スーパー、銀行、郵便局
   ├─ 小型建物 → コンビニ、カフェ、薬局
   └─ 残り → 住宅
```

---

## 🆕 新規追加機能

### SegmentationMapLoader クラス

**役割**: セグメンテーションJSONを読み込み、Three.jsメッシュを生成

**主要メソッド**:

```javascript
// JSONファイルから読み込み
await loader.loadFromJSON('src/json/city_segmentation.json');

// Three.jsメッシュを生成してシーンに追加
const result = loader.createThreeMeshes(scene);

// 施設情報を取得
const facility = loader.getFacilityBySegmentId(segmentId);

// 道路ネットワークを取得（パスファインディング用）
const roads = loader.getRoadNetwork();

// 建物入り口を取得
const entrances = loader.getBuildingEntrances();

// 統計情報
const stats = loader.getStatistics();
```

### SegmentationCityManager クラス

**役割**: SegmentationMapLoaderと既存のMESAシステムを統合

**主要メソッド**:

```javascript
// セグメンテーション都市を読み込み
const manager = new SegmentationCityManager(scene);
await manager.loadFromSegmentationJSON('src/json/city_segmentation.json');

// MESA形式のロケーション取得
const locations = manager.getLocations();

// タイプ別の施設検索
const cafes = manager.getLocationsByType('cafe');

// 最も近い施設を検索
const nearest = manager.findNearestFacility(position, 'supermarket');

// カテゴリの表示/非表示
manager.toggleCategoryVisibility('building_a', false);
manager.showAllCategories();
manager.hideAllCategories();
```

---

## 🔧 使用方法

### 1. セグメンテーションデータの準備

#### Google Colabで生成

1. `example/colab_3d_city_map.py` をGoogle Colabで開く
2. 航空写真をアップロード
3. パラメータを調整（オプション）:
   ```python
   MAX_IMAGE_SIZE = 1280  # 入力画像の最大サイズ
   MIN_SEGMENT_AREA = 50  # 最小セグメント面積
   MESH_RESOLUTION = 2    # メッシュ解像度
   ```
4. 実行して `city_3d_model.json` をダウンロード
5. `src/json/city_segmentation.json` にリネームして配置

### 2. MESAで使用

```bash
# JSONファイルを配置
cp city_3d_model.json src/json/city_segmentation.json

# MESAを起動
# ブラウザで index.html を開く
```

**自動検出**:
- `city_segmentation.json` が存在する場合、自動的にセグメンテーションモードで起動
- ファイルがない場合は、従来のエディタ/プログラム生成モードにフォールバック

### 3. 動作確認

コンソールログを確認:
```
🔍 セグメンテーションベースの都市データをチェック中...
✅ セグメンテーションデータが見つかりました
セグメンテーションデータを解析中...
総メッシュ数: 1234
カテゴリ: [...] 
セグメントを分類中...
道路セグメント: 456
建物セグメント: 778
施設を自動割り当て中...
施設割り当て完了: 50施設 + 728住宅
Three.jsメッシュを生成中...
✅ メッシュ生成完了: 1234成功, 0エラー
🏙️ セグメンテーションベース都市の生成完了
```

---

## 🎨 カテゴリとカラー

### 建物カテゴリ

| カテゴリ | ラベル | 色 | 高さ | 用途 |
|---------|-------|---|-----|-----|
| `building_a` | 建物A（小） | `0xFFC896` | 0.6m | 小型店舗、住宅 |
| `building_b` | 建物B（中小） | `0xFFA07A` | 1.0m | 中小型店舗 |
| `building_c` | 建物C（中） | `0xF0785A` | 1.5m | 中型ビル |
| `building_d` | 建物D（中大） | `0xDC503C` | 2.2m | 中大型ビル |
| `building_e` | 建物E（大） | `0xC82828` | 3.0m | 高層ビル |

### その他カテゴリ

| カテゴリ | ラベル | 色 | 高さ |
|---------|-------|---|-----|
| `road` | 道路 | `0x804080` | 0m |
| `forest` | 森林 | `0x228B22` | 1.5m |
| `park` | 公園/緑地 | `0x90EE90` | 0.5m |
| `water` | 水域 | `0x1E90FF` | 0m |
| `bare_land` | 空き地 | `0xD2B48C` | 0.1m |
| `infrastructure` | インフラ | `0x646464` | 0.8m |
| `other` | その他/境界 | `0x505050` | 0m |

---

## 🔀 既存システムとの互換性

### 互換性のある機能

✅ **そのまま動作**:
- エージェントシステム（移動、行動、思考）
- パスファインディング（locations配列経由）
- カメラシステム
- UIパネル（エージェント管理、視点切り替え）
- 天候システム
- 時間システム

⚠️ **一部調整が必要**:
- 道路ネットワーク表示（セグメントベースに対応）
- 建物入り口の計算（セグメント形状に基づく）

❌ **使用不可**:
- エディタからのマップ編集（セグメンテーションモードでは上書きされる）
- プログラム生成のマップ（優先度が低い）

### フォールバックシステム

```javascript
// セグメンテーションデータがない場合の動作
if (!useSegmentation) {
    // 1. エディタデータをチェック
    // 2. デフォルトマップ（city_map-default.json）をチェック
    // 3. プログラム生成にフォールバック
}
```

---

## 🛠️ カスタマイズ

### 施設割り当てのカスタマイズ

`src/city/segmentation-loader.js` の `autoAssignFacilities()` を編集:

```javascript
const facilityTypes = [
    { type: 'hospital', label: '病院', minHeight: 2.0, count: 1 },
    { type: 'school', label: '学校', minHeight: 1.5, count: 2 },
    // 追加/変更したい施設をここに追加
    { type: 'custom_shop', label: 'カスタム店', minHeight: 0.8, count: 5 },
];
```

### セグメントタイプの追加

1. **colab_3d_city_map.py** でカテゴリを追加:
   ```python
   CITY_CATEGORIES = {
       'custom_category': {
           'label': 'カスタムカテゴリ', 
           'color': (255, 0, 0), 
           'height': 2.0, 
           'semantic_id': 12
       },
       ...
   }
   ```

2. **segmentation-loader.js** で色を追加:
   ```javascript
   const categoryColors = {
       'custom_category': 0xFF0000,
       ...
   };
   ```

### メッシュ表示のカスタマイズ

`src/city/segmentation-loader.js` の `createThreeMeshes()` を編集:

```javascript
// マテリアルをカスタマイズ
const material = new THREE.MeshPhongMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    shininess: 50,        // ← 光沢を変更
    specular: 0x444444,   // ← 反射色を変更
    flatShading: true     // ← フラットシェーディング
});

// 影の設定
mesh.castShadow = true;
mesh.receiveShadow = true;
```

---

## 🐛 トラブルシューティング

### セグメンテーションデータが読み込まれない

**症状**: コンソールに「セグメンテーションデータが見つかりません」と表示

**対処**:
1. `src/json/city_segmentation.json` が存在するか確認
2. ファイル名が正確に一致するか確認（大文字小文字も）
3. JSON形式が正しいか確認（JSONバリデーターを使用）
4. ブラウザのコンソールでエラーメッセージを確認

### メッシュが表示されない

**症状**: 都市は読み込まれたが、何も表示されない

**対処**:
1. カメラの位置を確認（全体表示ボタンをクリック）
2. コンソールで「メッシュ生成完了」が表示されているか確認
3. カテゴリが非表示になっていないか確認:
   ```javascript
   // コンソールで実行
   window.segmentationCityManager.showAllCategories();
   ```
4. ライティングが適切か確認

### エージェントが動かない

**症状**: エージェントが生成されるが、移動しない

**対処**:
1. `locations`配列が設定されているか確認:
   ```javascript
   // コンソールで実行
   console.log(window.locations);
   ```
2. 施設が正しく割り当てられているか確認:
   ```javascript
   console.log(window.segmentationCityManager.getStatistics());
   ```
3. パスファインディングシステムが初期化されているか確認

### パフォーマンスが悪い

**症状**: フレームレートが低い、動作が重い

**対処**:
1. **メッシュ解像度を下げる**（colab_3d_city_map.py）:
   ```python
   MESH_RESOLUTION = 4  # 値を大きくする（粗くなるが軽量）
   ```
2. **最小セグメント面積を上げる**:
   ```python
   MIN_SEGMENT_AREA = 100  # 値を大きくする（小さなセグメントを除外）
   ```
3. **カテゴリを選択的に表示**:
   ```javascript
   manager.toggleCategoryVisibility('other', false); // その他を非表示
   manager.toggleCategoryVisibility('bare_land', false); // 空き地を非表示
   ```
4. **影を無効化**:
   ```javascript
   // main.js で
   renderer.shadowMap.enabled = false;
   ```

---

## 📊 パフォーマンス比較

### 従来システム vs セグメンテーションベース

| 指標 | 従来システム | セグメンテーション |
|-----|-----------|--------------|
| 初期化時間 | 2-3秒 | 3-5秒 |
| メモリ使用量 | 50-100MB | 100-200MB |
| メッシュ数 | 100-200 | 500-2000 |
| リアリティ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| カスタマイズ性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🔮 今後の拡張

### 実装予定の機能

1. **✨ パスファインディング最適化**
   - セグメント間の接続を解析
   - 実際の道路ネットワークに基づくルート生成

2. **🏠 建物内部への対応**
   - セグメントから階層情報を抽出
   - 建物内のナビゲーション

3. **🗺️ 複数マップの切り替え**
   - マップ選択UI
   - シームレスな切り替え

4. **🎨 リアルタイム編集**
   - セグメントの施設タイプ変更
   - 新規セグメントの追加

5. **📍 GPSデータとの統合**
   - 実世界の座標系とのマッピング
   - 実際の地図データとの連携

---

## 📚 参考資料

### 関連ファイル

- `example/colab_3d_city_map.py`: セグメンテーション生成スクリプト
- `example/index.html`: シンプルなビューワー実装
- `src/city/segmentation-loader.js`: データローダー実装
- `src/city/segmentation-city-manager.js`: MESA統合実装

### 外部リソース

- [Segformer Model](https://huggingface.co/nvidia/segformer-b5-finetuned-ade-640-640)
- [ADE20K Dataset](https://groups.csail.mit.edu/vision/datasets/ADE20K/)
- [Three.js Documentation](https://threejs.org/docs/)

---

## 💡 ベストプラクティス

### セグメンテーションデータの生成

1. **高解像度の航空写真を使用** (1280px以上推奨)
2. **タイル分割を有効化** (`USE_TILING = True`)
3. **適切なパラメータ調整**:
   - 都市部: `MIN_SEGMENT_AREA = 30-50`
   - 郊外: `MIN_SEGMENT_AREA = 50-100`
4. **境界検出を有効化** (`DETECT_BOUNDARIES = True`)

### MESAでの使用

1. **ローカルサーバーで実行** (file://では制限がある)
2. **適切なメモリ確保** (大規模マップは200MB以上)
3. **段階的な表示** (カテゴリごとに表示/非表示)
4. **定期的なパフォーマンス監視**

---

## 🎉 まとめ

セグメンテーションベースシステムにより、MESAは**実世界の都市構造を反映した、よりリアルなシミュレーション環境**を提供できるようになりました。

**主な利点**:
- ✅ 実際の航空写真から自動生成
- ✅ リアルな建物形状と配置
- ✅ 既存のエージェントシステムと完全互換
- ✅ 柔軟な施設割り当てシステム
- ✅ 従来システムとの共存が可能

**次のステップ**:
1. 航空写真を用意
2. Google Colabでセグメンテーション実行
3. JSONファイルをMESAに配置
4. ブラウザで確認

Happy Simulating! 🏙️🤖

