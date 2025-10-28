# デフォルトマップ機能

## 概要

エディタからMESAを開かない場合（JSONデータがない場合）、デフォルトのマップを自動的に読み込んで表示する機能を実装しました。

## 実装内容

### 機能の動作フロー

```
起動時
  ↓
エディタデータ確認
  ├─ エディタデータあり → エディタマップを読み込み
  └─ エディタデータなし
       ↓
    デフォルトマップ読み込み
       ├─ 成功 → デフォルトマップを表示
       └─ 失敗 → プログラム生成マップ（従来の動作）
```

## 変更ファイル

### `/Users/oggata/github-repos/MultiEntitySimulationArchitecture/src/core/main.js`

**変更箇所**: 512-576行目

**変更内容**:
- エディタデータがない場合に、`src/json/city_map-default.json` を自動的に読み込む処理を追加
- デフォルトマップの読み込みに失敗した場合は、従来通りプログラム生成でマップを生成

### 実装の詳細

```javascript
} else {
    // エディタデータがない場合、デフォルトマップの読み込みを試みる
    console.log('エディタデータがありません。デフォルトマップを読み込みます...');
    window.isEditorMap = false;
    
    try {
        // デフォルトマップJSONを読み込む
        const response = await fetch('src/json/city_map-default.json');
        if (response.ok) {
            const defaultMapData = await response.json();
            console.log('デフォルトマップを読み込みました');
            window.isEditorMap = true;
            
            const mapLoader = new MapEditorLoader(cityLayoutConfig);
            cityData = mapLoader.loadFromEditorData(defaultMapData);
            
            // デフォルトマップに合わせてワールドサイズを設定
            const worldSize = mapLoader.gridSize * mapLoader.scaleFactor;
            cityLayout.gridSize = worldSize;
            
            // ... (道路、建物、施設の設定と描画)
        }
    } catch (error) {
        console.warn('デフォルトマップの読み込みに失敗:', error);
        console.log('プログラム生成でマップを生成します');
        window.isEditorMap = false;
        cityData = cityLayout.generateCity();
    }
}
```

## デフォルトマップファイル

### ファイルパス
```
src/json/city_map-default.json
```

### フォーマット
- エディタと同じ2次元配列形式のグリッドデータ
- `MapEditorLoader` クラスで読み込み可能な形式

### 内容例
```json
[
  ["empty", "empty", "road", "facility:図書館|dir:left", ...],
  ["empty", "road", "empty", "residential|dir:up", ...],
  ...
]
```

## 使用方法

### 1. デフォルトマップの使用

**通常起動時**:
```
1. index.html を開く
2. エディタデータがない場合、自動的にデフォルトマップが読み込まれる
3. デフォルトマップの街が表示される
```

### 2. エディタマップの使用

**エディタから起動時**:
```
1. editor/index.html でマップを作成
2. 「MESAを開く」ボタンをクリック
3. エディタで作成したマップが表示される
```

### 3. プログラム生成マップの使用

**デフォルトマップが見つからない場合**:
```
1. デフォルトマップの読み込みに失敗
2. 自動的にプログラム生成にフォールバック
3. ランダムに生成された街が表示される
```

## 動作の優先順位

```
優先度1: エディタデータ（localStorage）
   ↓
優先度2: デフォルトマップ（JSON）
   ↓
優先度3: プログラム生成マップ（ランダム）
```

## メリット

### 1. 初めてのユーザーにも親切
- ✅ エディタを使わなくても、すぐに街が表示される
- ✅ 空っぽの画面ではなく、街の様子を確認できる
- ✅ デモやプレゼンテーションに最適

### 2. 開発効率の向上
- ✅ 毎回エディタでマップを作る必要がない
- ✅ テスト用の標準マップを共有できる
- ✅ 一貫したテスト環境

### 3. 柔軟性
- ✅ エディタでカスタマイズ可能
- ✅ デフォルトマップの変更が簡単
- ✅ 複数のデフォルトマップを用意可能（将来的に）

## コンソールログ

### デフォルトマップ読み込み成功時

```console
エディタデータがありません。デフォルトマップを読み込みます...
デフォルトマップを読み込みました
エディタデータを読み込みました: 124x124
変換完了: 道路=XX本, 建物=XX個, 施設=XX個
デフォルトマップに合わせてcityLayout.gridSizeを設定: XXX
デフォルトマップでgenerateCity()を呼び出します
デフォルトマップ用にカメラをリセット
デフォルトマップの道路を描画しました
デフォルトマップの読み込みが完了しました
```

### デフォルトマップ読み込み失敗時

```console
エディタデータがありません。デフォルトマップを読み込みます...
デフォルトマップの読み込みに失敗: Error: ...
プログラム生成でマップを生成します
```

## カスタマイズ方法

### デフォルトマップの変更

1. **エディタでマップを作成**
   - `editor/index.html` を開く
   - 好きなマップを作成
   - 「Save Map」でダウンロード

2. **JSONファイルを置き換え**
   ```bash
   # ダウンロードしたJSONファイルを上書き
   cp ~/Downloads/city_map.json src/json/city_map-default.json
   ```

3. **確認**
   - `index.html` を開く
   - 新しいデフォルトマップが表示される

### 複数のデフォルトマップ（将来的な拡張案）

```javascript
// 例：ランダムに異なるデフォルトマップを選択
const defaultMaps = [
    'src/json/city_map-default.json',
    'src/json/city_map-downtown.json',
    'src/json/city_map-suburbs.json'
];
const randomMap = defaultMaps[Math.floor(Math.random() * defaultMaps.length)];
const response = await fetch(randomMap);
```

## トラブルシューティング

### デフォルトマップが表示されない

**症状**: 空っぽの画面またはプログラム生成マップが表示される

**原因と対処**:
1. **JSONファイルが見つからない**
   - ✅ `src/json/city_map-default.json` が存在するか確認
   - ✅ ファイルパスが正しいか確認

2. **JSONファイルの形式が不正**
   - ✅ JSON形式が正しいか確認（カンマ、括弧など）
   - ✅ エディタのエクスポート機能を使って再作成

3. **ブラウザのセキュリティ制限**
   - ✅ ローカルサーバーで実行しているか確認
   - ✅ `file://` プロトコルではfetchが制限される場合がある

### コンソールエラーの確認

```javascript
// ブラウザのコンソールを開く（F12）
// エラーメッセージを確認
```

**よくあるエラー**:
- `Failed to fetch`: ファイルが見つからない、またはCORS制限
- `JSON.parse error`: JSON形式が不正
- `TypeError`: データの形式が期待と異なる

## 今後の拡張案

### 1. 複数のプリセットマップ
```javascript
// マップ選択UI
<select id="defaultMapSelector">
  <option value="default">デフォルト</option>
  <option value="downtown">都心部</option>
  <option value="suburbs">郊外</option>
  <option value="countryside">田舎</option>
</select>
```

### 2. マップのバリエーション
- ✨ 都市の規模（小・中・大）
- ✨ テーマ（近代的、伝統的、未来的）
- ✨ 人口密度（密集、標準、疎）

### 3. ランダム要素の追加
```javascript
// デフォルトマップをベースにランダムな変化を加える
const mapData = addRandomVariations(defaultMapData);
```

## まとめ

### 実装内容
- ✅ デフォルトマップの自動読み込み機能
- ✅ エディタデータがない場合の代替手段
- ✅ エラーハンドリングとフォールバック

### ユーザーへの影響
- ✅ 初回起動時でも街が表示される
- ✅ エディタを使わなくても楽しめる
- ✅ カスタマイズも引き続き可能

### 技術的なメリット
- ✅ 既存のコードを最大限活用
- ✅ エラー時のフォールバックが充実
- ✅ 拡張性が高い設計


