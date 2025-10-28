# セグメンテーションマップの道路ネットワーク実装

## 📅 実施日
2025年10月28日

## 🎯 目的
セグメンテーションマップにおける道路ネットワークを正しく実装し、エージェントが道路に沿って移動できるようにする。

## ❌ 問題点

### 症状
- エージェントが道路を通らずに直線移動していた
- パスファインディングが正常に機能していなかった

### 根本原因
セグメンテーションマップの道路データが「セグメント（面）」として表現されているのに対し、MESAのパスファインディングシステムは「線分（start-end）」または「点のネットワーク」を想定していた。

#### 変換前の問題
```javascript
// ❌ 問題のあった変換
this.roads = this.segmentationLoader.getRoadNetwork().map(road => ({
    id: road.id,
    start: { x: road.x, y: 0, z: road.z },
    end: { x: road.x, y: 0, z: road.z },  // ⚠️ start と end が同じ！
    isRoad: true
}));
```

この変換では：
- 道路が「点」として扱われる
- `RoadSystem.getRoadPoints()` が正しく動作しない
- `PathfindingSystem` が経路を計算できない

## ✅ 解決策

### アーキテクチャ

```
セグメンテーションJSON
  ↓
SegmentationMapLoader.getRoadNetwork()
  → 道路セグメントの頂点を抽出
  → 道路ポイントのグラフを構築
  → 隣接関係を計算
  ↓
SegmentationCityManager.convertToMESAFormat()
  → 道路ポイントから道路線分（エッジ）を生成
  ↓
RoadSystem
  → パスファインディング用の道路ネットワーク
```

### 1. SegmentationMapLoader の修正

#### 道路ポイントの抽出
```javascript
getRoadNetwork() {
    const roadPoints = [];
    
    this.roadSegments.forEach(road => {
        // 道路の頂点から道路ポイントを生成
        if (road.vertices && road.vertices.length > 0) {
            road.vertices.forEach((vertex, index) => {
                roadPoints.push({
                    id: `${road.id}_v${index}`,
                    roadSegmentId: road.id,
                    x: vertex[0],
                    y: vertex[1] || 0,
                    z: vertex[2],
                    area: road.area,
                    neighbors: []
                });
            });
            
            // 道路の中心点も追加
            roadPoints.push({
                id: `${road.id}_center`,
                roadSegmentId: road.id,
                x: road.center[0],
                y: road.center[1] || 0,
                z: road.center[2],
                area: road.area,
                neighbors: []
            });
        }
    });
    
    // 隣接関係を計算
    this.calculateRoadPointNeighbors(roadPoints);
    
    return roadPoints;
}
```

#### 隣接関係の計算
```javascript
calculateRoadPointNeighbors(roadPoints) {
    const maxNeighborDistance = 25;
    
    for (let i = 0; i < roadPoints.length; i++) {
        const point1 = roadPoints[i];
        
        for (let j = i + 1; j < roadPoints.length; j++) {
            const point2 = roadPoints[j];
            
            const distance = Math.sqrt(
                Math.pow(point1.x - point2.x, 2) + 
                Math.pow(point1.z - point2.z, 2)
            );
            
            // 同じセグメント内、または近接している場合は接続
            if (point1.roadSegmentId === point2.roadSegmentId || 
                distance < maxNeighborDistance) {
                point1.neighbors.push({
                    id: point2.id,
                    x: point2.x,
                    y: point2.y,
                    z: point2.z,
                    distance: distance
                });
                point2.neighbors.push({
                    id: point1.id,
                    x: point1.x,
                    y: point1.y,
                    z: point1.z,
                    distance: distance
                });
            }
        }
    }
}
```

### 2. SegmentationCityManager の修正

#### 道路線分の生成
```javascript
// 道路ポイントから道路セグメント（エッジ）を生成
const roadPoints = this.segmentationLoader.getRoadNetwork();
this.roads = [];
const processedPairs = new Set();

roadPoints.forEach(point => {
    point.neighbors.forEach(neighbor => {
        const pairKey = [point.id, neighbor.id].sort().join('_');
        
        if (!processedPairs.has(pairKey)) {
            processedPairs.add(pairKey);
            
            this.roads.push({
                id: `road_${this.roads.length}`,
                start: { x: point.x, y: point.y, z: point.z },
                end: { x: neighbor.x, y: neighbor.y, z: neighbor.z },
                isRoad: true,
                isMain: false,
                roadSegmentId: point.roadSegmentId,
                distance: neighbor.distance
            });
        }
    });
});
```

### 3. main.js の修正

#### RoadSystem の初期化
```javascript
// セグメンテーションモード用のRoadSystemを作成
const segRoadSystem = new RoadSystem(cityLayoutConfig);
segRoadSystem.roads = segResult.roads || [];
segRoadSystem.intersections = [];

// cityLayout に RoadSystem を設定
cityLayout = {
    // ...
    roadSystem: segRoadSystem,
    getRoadSystem: () => segRoadSystem,
    // ...
};
```

## 📊 データフロー

### セグメンテーションJSONの道路データ
```json
{
  "id": 0,
  "category": "road",
  "vertices": [
    [-10, 0, -10],
    [10, 0, -10],
    [10, 0, 10],
    [-10, 0, 10]
  ],
  "center": [0, 0, 0],
  "area": 400
}
```

### 変換後の道路ポイント
```javascript
[
  { id: "0_v0", x: -10, y: 0, z: -10, neighbors: [...] },
  { id: "0_v1", x: 10, y: 0, z: -10, neighbors: [...] },
  { id: "0_v2", x: 10, y: 0, z: 10, neighbors: [...] },
  { id: "0_v3", x: -10, y: 0, z: 10, neighbors: [...] },
  { id: "0_center", x: 0, y: 0, z: 0, neighbors: [...] }
]
```

### 最終的な道路線分
```javascript
[
  { start: {x: -10, z: -10}, end: {x: 10, z: -10} },
  { start: {x: 10, z: -10}, end: {x: 10, z: 10} },
  { start: {x: 10, z: 10}, end: {x: -10, z: 10} },
  { start: {x: -10, z: 10}, end: {x: -10, z: -10} },
  { start: {x: -10, z: -10}, end: {x: 0, z: 0} },  // 中心への接続
  // ... その他の接続
]
```

## 🔧 パラメータ調整

### maxNeighborDistance
```javascript
const maxNeighborDistance = 25;
```

**目的**: 異なる道路セグメント間の接続を判定する距離

- **小さすぎる（< 10）**: 道路ネットワークが分断される
- **適切（20-30）**: 交差点や近接道路が適切に接続される
- **大きすぎる（> 50）**: 離れた道路同士が誤って接続される

### 調整方法
```javascript
// セグメンテーションローダー内
calculateRoadPointNeighbors(roadPoints) {
    // マップのスケールに応じて調整
    const maxNeighborDistance = this.metadata.scale 
        ? this.metadata.scale * 0.5 
        : 25;
    // ...
}
```

## 🧪 テスト方法

### 1. 道路ネットワークの確認
```javascript
// ブラウザコンソールで実行
console.log('道路数:', cityLayout.roads.length);
console.log('道路サンプル:', cityLayout.roads.slice(0, 5));

// 道路線分の長さを確認
cityLayout.roads.forEach(road => {
    const dx = road.end.x - road.start.x;
    const dz = road.end.z - road.start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    console.log(`道路 ${road.id}: 長さ ${length.toFixed(2)}`);
});
```

### 2. パスファインディングのテスト
```javascript
// エージェントの移動経路を確認
const agent = agents[0];
console.log('エージェントの経路:', agent.path);

// 道路を通っているか確認
if (agent.path) {
    agent.path.forEach((point, i) => {
        console.log(`経路点 ${i}: (${point.x}, ${point.z})`);
    });
}
```

### 3. 視覚的確認
道路可視化機能を使って、道路ネットワークが正しく構築されているか確認します。

## 📈 期待される効果

### Before（修正前）
- ❌ エージェントが直線移動
- ❌ 道路を無視した経路
- ❌ パスファインディングが失敗

### After（修正後）
- ✅ エージェントが道路に沿って移動
- ✅ 交差点で曲がる
- ✅ 現実的な移動パターン

## 🔍 トラブルシューティング

### エージェントがまだ道路を通らない場合

1. **道路ネットワークの確認**
   ```javascript
   console.log('道路数:', cityLayout.getRoadSystem().roads.length);
   ```
   道路数が0または極端に少ない場合、セグメンテーションJSONに道路データがない可能性があります。

2. **道路ポイントの確認**
   ```javascript
   const roadNetwork = segmentationLoader.getRoadNetwork();
   console.log('道路ポイント数:', roadNetwork.length);
   roadNetwork.forEach(p => {
       console.log(`${p.id}: 隣接数=${p.neighbors.length}`);
   });
   ```
   隣接数が0のポイントが多い場合、`maxNeighborDistance` を大きくする必要があります。

3. **パスファインディングのログ確認**
   ```javascript
   // pathfinding-system.js で確認
   console.log('Start road point:', startRoadPoint);
   console.log('End road point:', endRoadPoint);
   console.log('Path:', path);
   ```

## 📚 関連ファイル

- `src/city/segmentation-loader.js` - 道路ネットワークの構築
- `src/city/segmentation-city-manager.js` - MESA形式への変換
- `src/core/main.js` - RoadSystem の初期化
- `src/city/road-system.js` - パスファインディング用の道路システム
- `src/systems/pathfinding-system.js` - A*経路探索
- `src/json/city_segmentation_sample.json` - サンプルデータ（道路を含む）

## 🎉 まとめ

セグメンテーションマップの道路データを、MESAのパスファインディングシステムで使用できる形式に正しく変換することで、エージェントが道路に沿って移動できるようになりました。

**キーポイント**:
1. 道路セグメント（面）→ 道路ポイント（グラフノード）
2. 隣接関係の計算 → 道路線分（グラフエッジ）
3. RoadSystem への統合 → パスファインディング

これにより、セグメンテーションベースの3D都市でも、従来と同様の自然なエージェント移動が実現されました。
