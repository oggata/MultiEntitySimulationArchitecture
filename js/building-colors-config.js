// 建物パーツのカラー設定
const buildingColorsConfig = {
    // 建物の基本色
    building: {
        primary: 0xFFFFFF,      // 純白
        secondary: 0xF5F5F5,    // オフホワイト
        tertiary: 0xFFFFF0,     // アイボリー
        quaternary: 0xF5F5DC,   // ベージュ
        quinary: 0xD3D3D3       // ライトグレー
    },
    
    // 屋根の色
    roof: {
        primary: 0xF5F5DC,      // ベージュ
        secondary: 0xFFFFFF,    // 純白（平らな屋根用）
        tertiary: 0xFFFFF0      // アイボリー（特殊な屋根用）
    },
    
    // 窓の色
    window: {
        primary: 0xFFFFFF,      // 純白
        secondary: 0xF5F5F5,    // オフホワイト（透過度が高い場合）
        frame: 0xF5F5DC         // ベージュ（窓枠）
    },
    
    // ドアの色
    door: {
        primary: 0xF5F5DC,      // ベージュ
        secondary: 0xFFFFFF,    // 純白
        frame: 0xF5F5F5         // オフホワイト（ドア枠）
    },
    
    // 柱の色
    column: {
        primary: 0xF5F5DC,      // ベージュ
        secondary: 0xFFFFFF      // 純白
    },
    
    // テラス・庇の色
    terrace: {
        primary: 0xF5F5DC,      // ベージュ
        secondary: 0xFFFFFF      // 純白
    },
    
    // 煙突の色
    chimney: {
        primary: 0xF5F5DC,      // ベージュ
        secondary: 0xFFFFFF      // 純白
    },
    
    // 家具・装飾品の色
    furniture: {
        // テーブル
        table: 0xF5F5DC,
        // 椅子
        chair: 0xF5F5DC,
        // ベンチ
        bench: 0xF5F5DC,
        // 本棚
        bookshelf: 0xF5F5DC,
        // 机
        desk: 0xF5F5DC,
        // トレーニングマシン
        machine: 0xF5F5DC,
        // ウェイト
        weight: 0xF5F5DC,
        // カウンター
        counter: 0xF5F5DC,
        // ショッピングカート
        cart: 0xF5F5DC,
        // 駐車場
        parking: 0xF5F5DC,
        // 待機席
        waitingSeat: 0xF5F5DC,
        // 救急車スペース
        ambulanceSpace: 0xF5F5DC,
        // ヘリポート
        helipad: 0xF5F5DC,
        // 待合室の椅子
        waitingChair: 0xF5F5DC,
        // レジ待機列
        queueSpot: 0xF5F5DC
    },
    
    // 自然物の色
    nature: {
        // 木の幹
        trunk: 0xF5F5DC,
        // 木の葉
        leaves: 0xF5F5DC,
        // 噴水
        fountain: 0xF5F5DC
    },
    
    // 装飾品の色
    decoration: {
        // 旗
        flag: 0xF5F5DC,
        // 校庭
        playground: 0xF5F5DC,
        // 看板
        sign: 0xF5F5DC
    },
    
    // 通路・入口の色
    entrance: {
        // 通路
        path: 0xD3D3D3,
        // 階段
        step: 0xF5F5DC,
        // ドア枠
        doorFrame: 0xF5F5F5,
        // 看板
        sign: 0xF5F5F5,
        // 柵
        fence: 0xF5F5DC,
        // 玄関のポーチ
        porch: 0xF5F5DC
    },
    
    // 公園・広場の色
    publicSpace: {
        // 公園
        park: 0xFFFFF0,
        // 広場
        plaza: 0xFFFFF0
    }
};

// 設定をエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = buildingColorsConfig;
} 