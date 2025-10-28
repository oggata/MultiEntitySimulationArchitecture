# レガシーシステムの削除完了

## 📅 実施日
2025年10月28日

## 🎯 目的
エディタマップシステムを完全に削除し、セグメンテーションベースのマップシステムに完全移行する。

## 🗑️ 削除されたファイル

### エディタシステム
- `editor/` ディレクトリ全体
  - `editor/index.html` - マップエディタのメイン画面
  - `editor/editor.js` - エディタのロジック
  - その他すべてのエディタ関連ファイル

### マップローダー
- `src/city/map-editor-loader.js` - エディタマップをMESA形式に変換するローダー

### 建物生成システム
- `src/city/buildings.js` - 従来の3D建物生成システム
  - GLBモデルローディング
  - プロシージャル建物生成
  - エントランス、窓、屋根などの詳細生成

### デフォルトマップ
- `src/json/city_map-default.json` - エディタ形式のデフォルトマップ

## 🔧 修正されたファイル

### index.html
**削除された参照:**
```html
<!-- 削除前 -->
<script src="./src/city/buildings.js"></script>
<script src="./src/city/map-editor-loader.js"></script>

<!-- 削除後 -->
<!-- これらのスクリプトタグは完全に削除 -->
```

### src/core/main.js
**削除された機能:**
1. **エディタマップ読み込み処理**
   - `localStorage`からのエディタデータ読み込み
   - チャンク形式の圧縮データ復元
   - `loadEditorMapDataFromChunks()` 関数
   - `clearEditorMapData()` 関数

2. **デフォルトマップ読み込み処理**
   - `src/json/city_map-default.json` からの読み込み
   - `MapEditorLoader` を使用した変換処理

3. **従来の建物生成処理**
   - `createLocations()` 呼び出し
   - `createAgentHome()` 呼び出し
   - 従来の地面生成処理

**追加されたエラーハンドリング:**
```javascript
if (!useSegmentation) {
    console.error('❌ セグメンテーションマップが見つかりません');
    console.log('⚠️ 以下のいずれかのセグメンテーションマップを用意してください:');
    console.log('  1. src/json/city_segmentation.json (推奨)');
    console.log('  2. src/json/city_segmentation_sample.json (サンプル)');
    // ... エラーメッセージとダミーcityLayoutの作成
    return; // 初期化を中断
}
```

## ✅ 現在のマップシステム

### 唯一のマップ形式：セグメンテーションマップ

**読み込み優先順位:**
1. `src/json/city_segmentation.json` (推奨)
2. `src/json/city_segmentation_sample.json` (フォールバック)

**セグメンテーションマップがない場合:**
- エラーメッセージを表示
- 初期化を中断
- ダミーの`cityLayout`オブジェクトを作成（クラッシュ防止）

## 📊 削除による影響

### ✅ メリット
1. **コードの簡素化**
   - 約500行のレガシーコード削除
   - マップ読み込みロジックの単純化
   - メンテナンスコストの削減

2. **パフォーマンス向上**
   - 不要なスクリプトの削除による読み込み時間短縮
   - localStorage 依存の削除

3. **明確なアーキテクチャ**
   - セグメンテーションベース一択
   - シンプルなエラーハンドリング

### ⚠️ デメリット（移行期間）
1. **後方互換性の喪失**
   - 既存のエディタマップは使用不可
   - localStorage に保存されたマップデータは無効

2. **セグメンテーションマップ必須**
   - `city_segmentation.json` がないと起動しない
   - Google Colab での事前処理が必要

## 🔄 移行ガイド

### 既存ユーザー向け

**エディタマップを使用していた場合:**
1. `editor/` は削除されました
2. セグメンテーションマップを作成してください：
   ```bash
   # Google Colab で example/colab_3d_city_map.py を実行
   # 生成された JSON を src/json/city_segmentation.json に配置
   ```

**デフォルトマップを使用していた場合:**
1. `city_map-default.json` は削除されました
2. 代わりに `city_segmentation_sample.json` が使用されます（自動フォールバック）

### 新規ユーザー向け

**必要なファイル:**
- `src/json/city_segmentation.json` または
- `src/json/city_segmentation_sample.json`

**作成方法:**
詳細は `SEGMENTATION_QUICKSTART.md` を参照

## 📝 コードの変更概要

### 削除されたコード量
- **エディタシステム**: ~2000行
- **マップローダー**: ~300行
- **建物生成システム**: ~800行
- **main.jsのレガシー処理**: ~250行
- **合計**: ~3350行削除

### 残存するコード（互換性のため）
以下のファイルは、他のシステムで`isEditorMap`を参照しているため残存：
- `src/city/building-system.js`
- `src/city/facility-system.js`
- `src/agents/agent-home.js`
- `src/systems/visualization-system.js`
- `src/core/camera-system.js`

ただし、セグメンテーションモードでは `window.isEditorMap` は常に `false` または `undefined` となり、これらの参照は実質的に無効化されています。

## 🎉 完了したタスク

- ✅ `editor/` ディレクトリ削除
- ✅ `src/city/map-editor-loader.js` 削除
- ✅ `src/city/buildings.js` 削除
- ✅ `src/json/city_map-default.json` 削除
- ✅ `index.html` から削除されたスクリプト参照を除去
- ✅ `src/core/main.js` からエディタマップ読み込みロジックを削除
- ✅ `src/core/main.js` からデフォルトマップ読み込みロジックを削除
- ✅ `src/core/main.js` から従来の建物生成ロジックを削除
- ✅ エラーハンドリングをセグメンテーション専用に簡素化
- ✅ ドキュメント作成

## 📚 関連ドキュメント

- `SEGMENTATION_MIGRATION.md` - セグメンテーションシステムへの完全移行ガイド
- `SEGMENTATION_QUICKSTART.md` - セグメンテーションマップのクイックスタート
- `SEGMENTATION_IMPLEMENTATION_SUMMARY.md` - 実装の詳細

## 🔮 今後の展望

### クリーンアップの可能性
将来的に以下のファイルからも `isEditorMap` 参照を削除できる可能性：
- `src/city/building-system.js`
- `src/city/facility-system.js`
- `src/agents/agent-home.js`
- `src/systems/visualization-system.js`
- `src/core/camera-system.js`

ただし、現時点ではセグメンテーションモードで無視されるため、実害はありません。

### 完全なセグメンテーション専用システム
すべてのコードがセグメンテーションマップ前提で書き直されれば：
1. `city-layout-manager.js` の簡素化
2. `building-system.js` / `facility-system.js` の簡素化
3. さらに1000行以上のコード削減が見込める

---

**結論**: レガシーシステムの削除により、MESAは完全にセグメンテーションベースの3D都市シミュレーションシステムに移行しました。🎉
