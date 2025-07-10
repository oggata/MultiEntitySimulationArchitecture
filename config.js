

// 都市レイアウト設定
const cityLayoutConfig = {
    // マップ全体のサイズ設定
    gridSize: 300,                    // マップ全体のサイズ（現在の150から2倍に）
    
    // 道路設定
    roadWidth: 2,                     // 標準道路の幅
    numMainStreets: 5,                // メインストリートの本数（現在の3から増加）
    blockSize: 15,                    // 街区のサイズ（現在の10から増加）
    shortRoadRatio: 0.6,              // 短い道路の出現率（0.0〜1.0）
    
    // 建物設定
    buildingSize: 4,                  // 標準建物サイズ
    minBuildingDistance: 8,           // 建物間の最小距離（現在の6から増加）
    
    // 建物サイズの定義
    buildingSizes: {
        large: 8,                     // 大：公園、学校、スーパーなど
        medium: 4,                    // 中：ファミレス、商店など
        small: 2                      // 小：個人の自宅など
    },
    
    // 安全マージン設定（建物サイズに応じて）
    safetyMargins: {
        large: 16,                    // 大きな建物の安全マージン（32→16に緩和）
        medium: 10,                   // 中サイズ建物の安全マージン（20→10に緩和）
        small: 6                      // 小サイズ建物の安全マージン（12→6に緩和）
    },
    
    // 施設設定
    facilitySizeMultiplier: 1.2,      // 施設サイズの倍率（建物サイズに対する）
    
    // 重複チェック設定
    overlapMargins: {
        large: 24,                    // 大きな建物同士の間隔
        medium: 16,                   // 中サイズ建物の間隔
        small: 12                     // 小サイズ建物の間隔
    }
};

// 時間設定
const timeConfig = {
    // 1日の長さ（分単位）
    dayLengthMinutes: 30,             // 1日 = 30分（現在の設定を遅くする）
    
    // 時間の進行速度（ミリ秒単位）
    timeUpdateInterval: 1000,         // 1秒ごとに時間を更新
    
    // 時間表示設定
    showTime: true,                   // 時間表示を有効にする
    timeFormat: '24hour'              // 24時間形式で表示
};

// 場所の詳細設定（座標は動的に決定される）
const locationData = [
    {
        name: "カフェ",
        color: 0x8B4513,
        activities: ["コーヒーを飲む", "会話する", "読書する", "仕事をする"],
        atmosphere: "落ち着いた雰囲気で、コーヒーの香りが漂う"
    },
    {
        name: "公園",
        color: 0x228B22,
        activities: ["散歩する", "絵を描く", "ベンチで休む", "運動する"],
        atmosphere: "緑豊かで開放的な空間"
    },
    {
        name: "図書館",
        color: 0x4682B4,
        activities: ["勉強する", "本を読む", "調べ物をする", "静かに過ごす"],
        atmosphere: "静寂に包まれた知識の宝庫"
    },
    {
        name: "スポーツジム",
        color: 0xFF6347,
        activities: ["運動する", "筋トレする", "ヨガをする", "他の人と運動の話をする"],
        atmosphere: "活気があり、エネルギッシュな場所"
    },
    {
        name: "町の広場",
        color: 0x90EE90,
        activities: ["散歩する", "休憩する", "会話する"],
        atmosphere: "開放的な空間で、人々が集まる場所"
    },
    {
        name: "学校",
        color: 0x87CEEB,
        activities: ["勉強する", "運動する", "友達と話す"],
        atmosphere: "活気のある教育施設"
    },
    {
        name: "病院",
        color: 0xFFFFFF,
        activities: ["診察を受ける", "待合室で待つ", "健康相談する"],
        atmosphere: "清潔で落ち着いた医療施設"
    },
    {
        name: "スーパーマーケット",
        color: 0xFFD700,
        activities: ["買い物する", "食材を選ぶ", "レジで会計する"],
        atmosphere: "明るく活気のある買い物空間"
    },
    {
        name: "ファミレス",
        color: 0xFF69B4,
        activities: ["食事する", "会話する", "休憩する"],
        atmosphere: "温かみのある飲食店"
    },
    {
        name: "郵便局",
        color: 0x4169E1,
        activities: ["郵便物を出す", "手紙を書く", "荷物を送る", "手続きをする"],
        atmosphere: "静かで落ち着いた公共施設"
    },
    {
        name: "銀行",
        color: 0x32CD32,
        activities: ["お金を下ろす", "振り込みをする", "相談する", "手続きをする"],
        atmosphere: "重厚で信頼感のある金融機関"
    },
    {
        name: "美容院",
        color: 0xFF1493,
        activities: ["髪を切る", "美容の相談をする", "雑誌を読む", "リラックスする"],
        atmosphere: "明るく親しみやすい美容空間"
    },
    {
        name: "クリーニング店",
        color: 0x20B2AA,
        activities: ["洗濯物を出す", "取り置きを取る", "相談する"],
        atmosphere: "清潔で整然とした洗濯店"
    },
    {
        name: "薬局",
        color: 0x00CED1,
        activities: ["薬を買う", "健康相談をする", "サプリメントを選ぶ"],
        atmosphere: "清潔で安心感のある薬局"
    },
    {
        name: "本屋",
        color: 0x8B4513,
        activities: ["本を探す", "立ち読みする", "本の相談をする", "雑誌を読む"],
        atmosphere: "本の香りが漂う知的空間"
    },
    {
        name: "コンビニ",
        color: 0xFF4500,
        activities: ["買い物する", "雑誌を読む", "休憩する", "軽食を買う"],
        atmosphere: "24時間営業の便利な店"
    },
    /*
    {
        name: "パン屋",
        color: 0xFFB6C1,
        activities: ["パンを買う", "香りを楽しむ", "朝食を買う", "おやつを買う"],
        atmosphere: "焼きたてパンの香りが漂う温かい店"
    },
    {
        name: "花屋",
        color: 0xFF69B4,
        activities: ["花を買う", "花の相談をする", "花を眺める", "プレゼントを選ぶ"],
        atmosphere: "色とりどりの花が並ぶ華やかな店"
    },
    {
        name: "電気屋",
        color: 0x1E90FF,
        activities: ["電化製品を見る", "相談する", "買い物する", "修理を依頼する"],
        atmosphere: "最新の電化製品が並ぶ明るい店"
    },
    {
        name: "八百屋",
        color: 0x32CD32,
        activities: ["野菜を買う", "果物を買う", "新鮮な食材を選ぶ", "店主と話す"],
        atmosphere: "新鮮な野菜や果物が並ぶ活気のある店"
    },
    {
        name: "魚屋",
        color: 0x00CED1,
        activities: ["魚を買う", "鮮度を確認する", "調理法を聞く", "刺身を買う"],
        atmosphere: "新鮮な魚の香りが漂う海鮮店"
    },
    {
        name: "肉屋",
        color: 0xDC143C,
        activities: ["肉を買う", "調理法を聞く", "新鮮さを確認する", "注文する"],
        atmosphere: "新鮮な肉が並ぶ専門店"
    },
    {
        name: "ケーキ屋",
        color: 0xFFB6C1,
        activities: ["ケーキを買う", "ケーキを眺める", "誕生日ケーキを注文する", "おやつを買う"],
        atmosphere: "甘い香りが漂う可愛らしい店"
    },
    {
        name: "喫茶店",
        color: 0x8B4513,
        activities: ["コーヒーを飲む", "ケーキを食べる", "会話する", "読書する"],
        atmosphere: "昭和の雰囲気が残る落ち着いた店"
    },
    {
        name: "ラーメン屋",
        color: 0xFF6347,
        activities: ["ラーメンを食べる", "会話する", "暖かいスープを楽しむ"],
        atmosphere: "醤油の香りが漂う温かい店"
    },
    {
        name: "寿司屋",
        color: 0x00CED1,
        activities: ["寿司を食べる", "刺身を食べる", "会話する", "職人の技を楽しむ"],
        atmosphere: "新鮮な魚と職人の技が光る高級店"
    },
    {
        name: "居酒屋",
        color: 0xFF4500,
        activities: ["お酒を飲む", "料理を食べる", "会話する", "リラックスする"],
        atmosphere: "温かみのある日本の居酒屋"
    },
    {
        name: "銭湯",
        color: 0x20B2AA,
        activities: ["お風呂に入る", "リラックスする", "会話する", "体を休める"],
        atmosphere: "日本の伝統的な銭湯"
    },
    {
        name: "ゲームセンター",
        color: 0xFF1493,
        activities: ["ゲームをする", "友達と遊ぶ", "景品を狙う", "楽しむ"],
        atmosphere: "活気があり、音と光が溢れる遊び場"
    },
    {
        name: "映画館",
        color: 0x4B0082,
        activities: ["映画を見る", "ポップコーンを食べる", "映画の話をする", "リラックスする"],
        atmosphere: "暗くて落ち着いた映画鑑賞空間"
    },
    {
        name: "カラオケ",
        color: 0xFF69B4,
        activities: ["歌を歌う", "友達と楽しむ", "リラックスする", "飲み物を飲む"],
        atmosphere: "明るく楽しいカラオケ空間"
    },
    {
        name: "ボーリング場",
        color: 0x1E90FF,
        activities: ["ボーリングをする", "友達と遊ぶ", "スコアを競う", "楽しむ"],
        atmosphere: "活気があり、音が響く遊び場"
    },
    {
        name: "温泉",
        color: 0x20B2AA,
        activities: ["温泉に入る", "リラックスする", "会話する", "体を休める"],
        atmosphere: "日本の伝統的な温泉施設"
    },
    {
        name: "神社",
        color: 0x8B4513,
        activities: ["お参りする", "願い事をする", "静かに過ごす", "写真を撮る"],
        atmosphere: "静寂で神聖な日本の伝統施設"
    },
    {
        name: "寺",
        color: 0x8B4513,
        activities: ["お参りする", "静かに過ごす", "仏像を見る", "心を落ち着かせる"],
        atmosphere: "静寂で厳かな仏教施設"
    },
    {
        name: "消防署",
        color: 0xFF0000,
        activities: ["見学する", "防災について学ぶ", "消防車を見る"],
        atmosphere: "安全を守る重要な公共施設"
    },
    {
        name: "警察署",
        color: 0x0000FF,
        activities: ["相談する", "届け出をする", "安全について学ぶ"],
        atmosphere: "地域の安全を守る重要な施設"
    },
    {
        name: "市役所",
        color: 0x808080,
        activities: ["手続きをする", "相談する", "書類を提出する", "情報を集める"],
        atmosphere: "地域の行政を担う重要な施設"
    }
    */
];