# JavaScript ディレクトリ構造

このディレクトリは、MESA (Multi-Entity Simulation Architecture) のJavaScriptファイルを用途別に整理したものです。

## ディレクトリ構造

```
js/
├── core/           # コアシステム
│   ├── main.js     # メインアプリケーション（Three.js初期化、アニメーションループ）
│   ├── config.js   # アプリケーション設定
│   └── log.js      # ログシステム
├── agents/         # エージェント関連
│   ├── agent-core.js       # エージェントの基本クラス
│   ├── agent-generation.js # エージェント生成システム
│   ├── agent-movement.js   # エージェント移動システム
│   ├── agent-interaction.js # エージェント間相互作用
│   ├── agent-storage.js    # エージェントデータ保存
│   ├── agent-utils.js      # エージェント用ユーティリティ
│   └── agent-home.js       # エージェントの自宅システム
├── city/           # 都市システム
│   ├── city-layout-manager.js # 都市レイアウト管理
│   ├── citylayout.js       # 都市レイアウト生成
│   ├── buildings.js        # 建物生成システム
│   ├── building-system.js  # 建物管理システム
│   ├── building-colors-config.js # 建物色設定
│   ├── facility-system.js  # 施設システム
│   └── road-system.js      # 道路システム
├── systems/        # 各種システム
│   ├── pathfinding-system.js # 経路探索システム
│   ├── visualization-system.js # 可視化システム
│   ├── weather.js          # 天候システム
│   └── vehicles.js         # 車両システム
├── ui/             # UI関連
│   ├── panel.js            # パネルUI
│   └── character.js        # キャラクター表示
└── legacy/         # 古いファイル
    ├── agent.js.old        # 旧エージェントシステム
    └── script.js           # 旧スクリプト
```

## 各ディレクトリの詳細

### core/
アプリケーションの基盤となるシステムです。
- **main.js**: Three.jsの初期化、アニメーションループ、カメラ制御
- **config.js**: アプリケーション全体の設定
- **log.js**: ログ出力と管理

### agents/
エージェント（人物）に関するすべての機能です。
- **agent-core.js**: エージェントの基本クラスとメイン機能
- **agent-generation.js**: LLMを使用したエージェント生成
- **agent-movement.js**: 移動、経路探索、目的地設定
- **agent-interaction.js**: エージェント間の相互作用
- **agent-storage.js**: エージェントデータの保存・読み込み
- **agent-utils.js**: エージェント用のユーティリティ関数
- **agent-home.js**: エージェントの自宅管理

### city/
都市の構造と建物に関するシステムです。
- **city-layout-manager.js**: 都市レイアウトの管理
- **citylayout.js**: 都市レイアウトの生成アルゴリズム
- **buildings.js**: 建物の3Dオブジェクト生成
- **building-system.js**: 建物の管理と更新
- **building-colors-config.js**: 建物の色設定
- **facility-system.js**: 施設（カフェ、公園など）の管理
- **road-system.js**: 道路ネットワークの生成と管理

### systems/
特定の機能を提供するシステムです。
- **pathfinding-system.js**: A*アルゴリズムによる経路探索
- **visualization-system.js**: 道路ネットワークの可視化
- **weather.js**: 天候の変化とエフェクト
- **vehicles.js**: 車両の生成と移動

### ui/
ユーザーインターフェース関連です。
- **panel.js**: コントロールパネルのUI
- **character.js**: キャラクターの3D表示

### legacy/
古いバージョンのファイルです。参考用として保持されています。

## ファイルの依存関係

1. **core/config.js** → 他のすべてのファイルが参照
2. **core/main.js** → すべてのシステムを初期化
3. **agents/agent-core.js** → 他のエージェントファイルの基盤
4. **city/city-layout-manager.js** → 都市システムの中心
5. **systems/** → 独立した機能システム

## 開発時の注意点

- 新しい機能を追加する際は、適切なディレクトリに配置してください
- 設定の変更は `core/config.js` で行ってください
- エージェント関連の機能は `agents/` ディレクトリに追加してください
- 都市関連の機能は `city/` ディレクトリに追加してください 