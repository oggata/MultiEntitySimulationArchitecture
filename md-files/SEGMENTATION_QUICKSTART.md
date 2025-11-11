# セグメンテーションベースMESA - クイックスタート

## 🚀 5分で始める

### ステップ1: 航空写真を準備

任意の航空写真を用意します：
- Google Maps、Bing Maps、OpenStreetMapなどからスクリーンショット
- 推奨サイズ: 800x800px 〜 2048x2048px
- 形式: JPG、PNG

### ステップ2: Google Colabでセグメンテーション

1. **Colabを開く**
   ```
   https://colab.research.google.com/
   ```

2. **スクリプトをアップロード**
   - `example/colab_3d_city_map.py` の内容をコピー
   - 新規ノートブックにペースト

3. **実行**
   ```python
   # セルを順番に実行
   # 航空写真をアップロードするプロンプトが表示される
   ```

4. **ダウンロード**
   - 完了後、`city_3d_output_dl.zip` がダウンロードされる
   - 解凍すると `city_3d_model.json` が含まれている

### ステップ3: MESAに配置

```bash
# JSONファイルをリネームして配置
mv city_3d_model.json src/json/city_segmentation.json
```

### ステップ4: MESAを起動

```bash
# ローカルサーバーで起動
python -m http.server 8000

# ブラウザで開く
# http://localhost:8000
```

## ✅ 動作確認

ブラウザのコンソール（F12）で以下が表示されればOK：

```
🔍 セグメンテーションベースの都市データをチェック中...
✅ セグメンテーションデータが見つかりました
🏙️ セグメンテーションベース都市の生成完了
```

## 🎨 カスタマイズ

### 施設の数を変更

`src/city/segmentation-loader.js` の `autoAssignFacilities()`:

```javascript
// 142行目あたり
const facilityTypes = [
    { type: 'hospital', label: '病院', minHeight: 2.0, count: 2 },  // count を変更
    { type: 'school', label: '学校', minHeight: 1.5, count: 3 },    // count を変更
    // ...
];
```

### パフォーマンス調整

セグメンテーション生成時（colab_3d_city_map.py）:

```python
# 軽量化（速い、粗い）
MIN_SEGMENT_AREA = 100  # デフォルト: 50
MESH_RESOLUTION = 4      # デフォルト: 2

# 高品質（遅い、細かい）
MIN_SEGMENT_AREA = 30    # デフォルト: 50
MESH_RESOLUTION = 1      # デフォルト: 2
```

## 🔧 トラブルシューティング

### データが読み込まれない

```javascript
// ブラウザコンソールで確認
fetch('src/json/city_segmentation.json')
  .then(r => r.json())
  .then(d => console.log('OK:', d.metadata))
  .catch(e => console.error('NG:', e));
```

### 何も表示されない

```javascript
// カメラをリセット
// UIで「全体表示」ボタンをクリック

// または、コンソールで
camera.position.set(50, 100, 100);
camera.lookAt(0, 0, 0);
```

### メモリ不足

```python
# colab_3d_city_map.py で調整
MIN_SEGMENT_AREA = 150   # 大きくする
MESH_RESOLUTION = 5      # 大きくする
```

## 📝 サンプル航空写真

以下のような場所がおすすめ：
- ✅ 住宅街: 小さな建物が多い
- ✅ 商業地区: 大きな建物が混在
- ✅ 公園: 緑地と建物のコントラスト
- ❌ 工業地帯: 建物が大きすぎる
- ❌ 農村部: 建物が少なすぎる

## 🎯 次のステップ

1. **エージェントを追加**: UIの「エージェント管理」タブで生成
2. **シミュレーション開始**: 「シミュレーション開始」ボタンをクリック
3. **視点切り替え**: 「人物視点切り替え」で追跡

## 📚 詳細ドキュメント

より詳しい情報は `SEGMENTATION_MIGRATION.md` を参照してください。

