// エージェントの詳細な性格設定
const agentPersonalities = [
    {
        name: "田中太郎",
        age: 35,
        personality: {
            description: "親切で社交的な会社員。コーヒーが好きで、朝はカフェで一日を始める。",
            traits: {
                sociability: 0.9,      // 社交性（0-1）
                energy: 0.7,           // 活動的さ
                routine: 0.8,          // ルーチン重視度
                curiosity: 0.6,        // 好奇心
                empathy: 0.9          // 共感性
            }
        },
        color: 0x4CAF50,
        dailyRoutine: {
            morning: ["カフェ", "町の広場"],
            afternoon: ["図書館", "公園"],
            evening: ["カフェ", "町の広場"],
            night: ["自宅"]
        },
        home: {
            name: "田中太郎の家",
            x: -17,
            z: -17,
            color: 0x4CAF50
        }
    },
    {
        name: "山田花子",
        age: 28,
        personality: {
            description: "創造的なアーティスト。公園で絵を描くのが好き。独自の世界観を持つ。",
            traits: {
                sociability: 0.5,
                energy: 0.6,
                routine: 0.3,
                curiosity: 0.9,
                empathy: 0.8
            }
        },
        color: 0xFF6B6B,
        dailyRoutine: {
            morning: ["公園"],
            afternoon: ["公園", "カフェ"],
            evening: ["図書館", "町の広場"],
            night: ["自宅"]
        },
        home: {
            name: "山田花子の家",
            x: 4,
            z: -17,
            color: 0xFF6B6B
        }
    },
    {
        name: "佐藤次郎",
        age: 22,
        personality: {
            description: "内向的な大学生。図書館で勉強することが多い。新しい知識を求めている。",
            traits: {
                sociability: 0.3,
                energy: 0.5,
                routine: 0.7,
                curiosity: 0.8,
                empathy: 0.6
            }
        },
        color: 0x4ECDC4,
        dailyRoutine: {
            morning: ["図書館"],
            afternoon: ["図書館", "カフェ"],
            evening: ["町の広場", "図書館"],
            night: ["自宅"]
        },
        home: {
            name: "佐藤次郎の家",
            x: -17,
            z: 17,
            color: 0x4ECDC4
        }
    },
    {
        name: "鈴木美香",
        age: 26,
        personality: {
            description: "活発でスポーツ好き。朝のランニングが日課。人との交流を楽しむ。",
            traits: {
                sociability: 0.8,
                energy: 0.95,
                routine: 0.9,
                curiosity: 0.7,
                empathy: 0.7
            }
        },
        color: 0xFFE66D,
        dailyRoutine: {
            morning: ["スポーツジム", "公園"],
            afternoon: ["カフェ", "町の広場"],
            evening: ["スポーツジム", "公園"],
            night: ["自宅"]
        },
        home: {
            name: "鈴木美香の家",
            x: -17,
            z: 22,
            color: 0xFFE66D
        }
    },
    {
        name: "高橋健一",
        age: 65,
        personality: {
            description: "のんびりした性格の年配者。カフェでくつろぎ、若い人との会話を楽しむ。",
            traits: {
                sociability: 0.7,
                energy: 0.3,
                routine: 0.9,
                curiosity: 0.5,
                empathy: 0.95
            }
        },
        color: 0xA8E6CF,
        dailyRoutine: {
            morning: ["カフェ", "町の広場"],
            afternoon: ["公園", "カフェ"],
            evening: ["町の広場", "カフェ"],
            night: ["自宅"]
        },
        home: {
            name: "高橋健一の家",
            x: -7,
            z: 22,
            color: 0xA8E6CF
        }
    }
];

// 場所の詳細設定
const locationData = [
    {
        name: "カフェ",
        x: -17,
        z: -8,
        color: 0x8B4513,
        activities: ["コーヒーを飲む", "会話する", "読書する", "仕事をする"],
        atmosphere: "落ち着いた雰囲気で、コーヒーの香りが漂う"
    },
    {
        name: "公園",
        x: 6,
        z: -8,
        color: 0x228B22,
        activities: ["散歩する", "絵を描く", "ベンチで休む", "運動する"],
        atmosphere: "緑豊かで開放的な空間"
    },
    {
        name: "図書館",
        x: -17,
        z: 8,
        color: 0x4682B4,
        activities: ["勉強する", "本を読む", "調べ物をする", "静かに過ごす"],
        atmosphere: "静寂に包まれた知識の宝庫"
    },
    {
        name: "スポーツジム",
        x: 17,
        z: 8,
        color: 0xFF6347,
        activities: ["運動する", "筋トレする", "ヨガをする", "他の人と運動の話をする"],
        atmosphere: "活気があり、エネルギッシュな場所"
    },
    {
        name: "町の広場",
        x: -6,
        z: -19,
        color: 0xDAA520,
        activities: ["人々を観察する", "待ち合わせする", "イベントに参加する", "休憩する"],
        atmosphere: "町の中心で、様々な人が行き交う"
    }
];