# 道路ネットワーク表示のデバッグガイド

## 📅 作成日
2025年10月28日

## 🎯 目的
道路ネットワーク表示ボタンが機能しない場合のデバッグ方法を提供する。

## 🔍 確認手順

### 1. ブラウザのコンソールを開く

ブラウザのデベロッパーツール（F12）を開き、コンソールタブを確認してください。

### 2. 初期化時のログを確認

MESAを起動すると、以下のようなログが表示されるはずです：

```
🛣️ 道路ネットワーク生成開始: 3道路セグメント
  道路ID 0: center=(0,0,0), vertices=4
    頂点0: (-30, 0, -5)
    頂点1: (30, 0, -5)
    頂点2: (30, 0, 5)
    頂点3: (-30, 0, 5)
    中心点: (0, 0, 0)
  道路ID 10: center=(-15,0,0), vertices=4
    頂点0: (-18, 0, -20)
    頂点1: (-12, 0, -20)
    頂点2: (-12, 0, 20)
    頂点3: (-18, 0, 20)
    中心点: (-15, 0, 0)
  道路ID 11: center=(15,0,0), vertices=4
    頂点0: (12, 0, -20)
    頂点1: (18, 0, -20)
    頂点2: (18, 0, 20)
    頂点3: (12, 0, 20)
    中心点: (15, 0, 0)
  生成された道路ポイント数: 15
  隣接関係を計算中... (maxDistance: 25)
  接続数: XX, 平均隣接数: Y.Y
✅ 道路ネットワーク生成完了: 15ポイント

  変換完了: 9施設, 15道路ポイント, XX道路セグメント

📍 セグメンテーション道路システム初期化: XX道路
  道路サンプル (最初の3本):
    0: start=(-30.0, -5.0), end=(30.0, -5.0)
    1: start=(30.0, -5.0), end=(30.0, 5.0)
    2: start=(30.0, 5.0), end=(-30.0, 5.0)
```

### 3. 道路ネットワーク表示ボタンをクリック

「道路設定」タブで「道路ネットワーク表示」ボタンをクリックすると、以下のログが表示されるはずです：

```
🛣️ セグメンテーションモード: 道路ネットワークを可視化します
✅ VisualizationSystemを初期化しました
🛣️ 道路ネットワーク可視化: XX本の道路, 0個の交差点
  ℹ️ 交差点データなし
  ✅ XX本の道路中心線を表示
  ℹ️ 建物システムなし - 入り口接続をスキップ
  ℹ️ 施設システムなし - 施設入り口接続をスキップ
✅ 道路ネットワーク可視化完了
```

### 4. 画面上で黄色い線が表示されることを確認

道路ネットワークは黄色い線（`0xFFFF00`）で表示されます。

## ❌ トラブルシューティング

### 問題1: 道路セグメントが0本

**症状:**
```
📍 セグメンテーション道路システム初期化: 0道路
⚠️ 道路が0本です！
```

**原因:**
- セグメンテーションJSONに道路データがない
- 道路ポイントから道路線分への変換が失敗している

**確認方法:**
```javascript
// ブラウザコンソールで実行
console.log('道路ポイント:', cityLayout.getRoadSystem().roads);
```

**解決策:**
1. `src/json/city_segmentation_sample.json`に道路データ（category: "road"）があるか確認
2. `SegmentationCityManager.convertToMESAFormat()`で道路変換が正しく行われているか確認

### 問題2: 道路ポイントが0個

**症状:**
```
🛣️ 道路ネットワーク生成開始: 0道路セグメント
生成された道路ポイント数: 0
```

**原因:**
- `SegmentationMapLoader.classifySegments()`で道路セグメントが分類されていない

**解決策:**
```javascript
// ブラウザコンソールで実行
console.log('SegmentationLoader:', segmentationLoader);
console.log('道路セグメント:', segmentationLoader.roadSegments);
```

### 問題3: 道路線分への変換が失敗

**症状:**
```
変換完了: 9施設, 15道路ポイント, 0道路セグメント
```

**原因:**
- 道路ポイントに隣接関係（neighbors）が設定されていない
- `maxNeighborDistance`が小さすぎて、道路ポイント間が接続されない

**確認方法:**
```javascript
// ブラウザコンソールで実行
const roadPoints = segmentationLoader.getRoadNetwork();
console.log('道路ポイント:', roadPoints);
roadPoints.forEach(p => {
    console.log(`${p.id}: neighbors=${p.neighbors.length}`);
});
```

**解決策:**
- `maxNeighborDistance`を大きくする（現在は25）
- 孤立した道路ポイントがないか確認

### 問題4: VisualizationSystemが見つからない

**症状:**
```
ReferenceError: Can't find variable: VisualizationSystem
```

**原因:**
- スクリプトの読み込み順序が間違っている

**解決策:**
- ブラウザのキャッシュをクリア（Ctrl+Shift+R または Cmd+Shift+R）
- `index.html`で`visualization-system.js`が`main.js`より前に読み込まれているか確認

### 問題5: 道路が表示されない（視覚的に見えない）

**症状:**
- ログは正常だが、画面に黄色い線が見えない

**可能性:**
1. カメラの位置が道路から離れすぎている
2. 道路の座標がマップの範囲外
3. 道路の線が地面の下に埋まっている

**解決策:**
```javascript
// ブラウザコンソールで実行
// 道路の座標範囲を確認
const roads = cityLayout.getRoadSystem().roads;
roads.forEach(road => {
    console.log(`道路: start=(${road.start.x}, ${road.start.z}), end=(${road.end.x}, ${road.end.z})`);
});

// カメラをリセット
cameraSystem.resetCamera();
```

## 🧪 手動テスト

### テスト1: 道路データの存在確認
```javascript
// セグメンテーションJSONを確認
fetch('src/json/city_segmentation_sample.json')
    .then(r => r.json())
    .then(data => {
        const roads = data.meshes.filter(m => m.category === 'road');
        console.log('道路セグメント:', roads.length);
        roads.forEach(r => console.log(r));
    });
```

### テスト2: RoadSystemの確認
```javascript
// RoadSystemが正しく初期化されているか
console.log('RoadSystem:', cityLayout.getRoadSystem());
console.log('道路数:', cityLayout.roads.length);
```

### テスト3: 手動で道路を描画
```javascript
// 手動で道路線分を描画してみる
const testRoad = cityLayout.roads[0];
if (testRoad) {
    const points = [
        new THREE.Vector3(testRoad.start.x, 1, testRoad.start.z),
        new THREE.Vector3(testRoad.end.x, 1, testRoad.end.z)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xFF0000, linewidth: 5 });
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    console.log('テスト道路を描画しました（赤い線）');
}
```

## 📊 期待される出力

### 正常な場合
```
🛣️ 道路ネットワーク生成開始: 3道路セグメント
  (... 各道路の詳細 ...)
  生成された道路ポイント数: 15
  接続数: 40, 平均隣接数: 5.3
✅ 道路ネットワーク生成完了: 15ポイント

  変換完了: 9施設, 15道路ポイント, 40道路セグメント

📍 セグメンテーション道路システム初期化: 40道路
  道路サンプル (最初の3本):
    0: start=(-30.0, -5.0), end=(30.0, -5.0)
    1: start=(30.0, -5.0), end=(30.0, 5.0)
    2: start=(30.0, 5.0), end=(-30.0, 5.0)

🛣️ セグメンテーションモード: 道路ネットワークを可視化します
✅ VisualizationSystemを初期化しました
🛣️ 道路ネットワーク可視化: 40本の道路, 0個の交差点
  ℹ️ 交差点データなし
  ✅ 40本の道路中心線を表示
✅ 道路ネットワーク可視化完了
```

### 画面上の表示
- 黄色い線で道路ネットワークが表示される
- 線の太さ: 3
- 不透明度: 0.8
- カメラを移動して確認できる

## 🔄 完全なリセット手順

問題が解決しない場合、以下の手順で完全にリセットしてください：

1. **ブラウザのキャッシュをクリア**
   - Chrome: Ctrl+Shift+Delete → "キャッシュされた画像とファイル"をチェック → "データを削除"
   - Firefox: Ctrl+Shift+Delete → "キャッシュ"をチェック → "今すぐ消去"

2. **ページをハードリロード**
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)

3. **コンソールをクリア**
   - F12 → コンソールタブ → 🚫マークをクリック

4. **ページを再読み込み**
   - F5 または Ctrl+R

5. **ログを確認**
   - 上記の「初期化時のログを確認」セクションのログが表示されることを確認

## 📝 報告テンプレート

問題が解決しない場合、以下の情報を報告してください：

```
### 環境
- ブラウザ: (Chrome 120, Firefox 121, など)
- OS: (Windows 11, macOS 14, など)

### コンソールログ
(初期化時のログをすべてコピー)

### 道路ネットワーク表示ボタンクリック時のログ
(ボタンクリック後のログをコピー)

### 追加情報
- 画面に何か表示されているか: (はい/いいえ)
- エラーメッセージ: (あれば)
- ブラウザコンソールでの確認結果:
  console.log(cityLayout.roads.length)
  → (結果)
```

---

このガイドで道路ネットワーク表示の問題を特定・解決できるはずです。
