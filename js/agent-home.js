// グローバルな自宅管理システム
const homeManager = {
    homes: new Map(), // 自宅名 -> 自宅データ
    availableHomes: [], // 利用可能な自宅のリスト
    
    // 事前に自宅を作成（施設と同じ配置ロジックを使用）
    initializeHomes() {
        // 既存の自宅をクリア
        this.homes.clear();
        this.availableHomes = [];
        
        // 自宅の名前パターン
        const homeNames = [
            "田中家", "佐藤家", "鈴木家", "高橋家", "渡辺家", "伊藤家", "山本家", "中村家",
            "小林家", "加藤家", "吉田家", "山田家", "佐々木家", "山口家", "松本家", "井上家",
            "木村家", "林家", "斎藤家", "清水家", "山崎家", "森家", "池田家", "橋本家",
            "阿部家", "石川家", "山下家", "中島家", "石井家", "小川家", "前田家", "岡田家",
            "長谷川家", "藤田家", "近藤家", "坂本家", "福田家", "松井家", "桜井家", "青木家",
            "本田家", "原田家", "岡本家", "野村家", "高田家", "河野家", "荒木家", "石田家"
        ];
        
        // 自宅のサイズを定義（施設より少し小さい）
        const homeSize = cityLayoutConfig.buildingSize * 0.8;
        
        // 自宅データを作成（施設と同じ配置ロジックを使用）
        homeNames.forEach((name, index) => {
            let attempts = 0;
            let homeX, homeZ;
            let placed = false;
            
            while (attempts < 500 && !placed) {
                // ランダムな座標を生成（範囲を拡大）
                homeX = (Math.random() - 0.5) * cityLayoutConfig.gridSize * 0.9;
                homeZ = (Math.random() - 0.5) * cityLayoutConfig.gridSize * 0.9;
                
                // 建物や他の施設との重複をチェック
                if (!cityLayout.isBuildingOverlapping(homeX, homeZ, homeSize) && 
                    !this.isHomeOverlapping(homeX, homeZ, this.availableHomes) &&
                    !cityLayout.isFacilityOverlapping(homeX, homeZ, cityLayout.facilities || [])) {
                    
                    // 道路距離チェック関数を使用して自宅の位置を検証
                    if (cityLayout.isValidBuildingPositionWithRoadDistance(homeX, homeZ, homeSize)) {
                        // 最も近い道路を見つける
                        const nearestRoad = cityLayout.findNearestRoad(homeX, homeZ);
                        if (nearestRoad) {
                            const roadIndex = cityLayout.roads.indexOf(nearestRoad);
                            
                            // 自宅の向きを最も近い道路の方向に計算
                            const homeRotation = cityLayout.calculateBuildingRotation(homeX, homeZ, nearestRoad);
                            
                            const homeData = {
                                name: name,
                                x: homeX,
                                z: homeZ,
                                type: 'home',
                                size: homeSize,
                                rotation: homeRotation,
                                roadIndex: roadIndex,
                                distanceToRoad: cityLayout.calculateMinDistanceToRoads(homeX, homeZ),
                                nearestRoadIndex: roadIndex,
                                color: "0x" + Math.floor(Math.random()*16777215).toString(16),
                                isOccupied: false,
                                occupant: null
                            };
                            
                            this.homes.set(name, homeData);
                            this.availableHomes.push(homeData);
                            
                            console.log(`自宅配置成功: ${name} (${homeX.toFixed(1)}, ${homeZ.toFixed(1)}) サイズ:${homeSize} 道路距離:${cityLayout.calculateMinDistanceToRoads(homeX, homeZ).toFixed(2)}`);
                            placed = true;
                        }
                    }
                }
                attempts++;
            }
            
            if (!placed) {
                console.log(`自宅配置失敗: ${name} (試行回数: ${attempts})`);
                
                // フォールバック: より緩い条件で配置を試行
                console.log(`フォールバック配置を試行: ${name}`);
                let fallbackAttempts = 0;
                const maxFallbackAttempts = 100;
                
                while (fallbackAttempts < maxFallbackAttempts && !placed) {
                    homeX = (Math.random() - 0.5) * cityLayoutConfig.gridSize * 0.95;
                    homeZ = (Math.random() - 0.5) * cityLayoutConfig.gridSize * 0.95;
                    
                    // フォールバック用の自宅サイズを定義
                    const fallbackHomeSize = homeSize * 0.8;
                    
                    // より緩い条件でチェック
                    if (!cityLayout.isBuildingOverlapping(homeX, homeZ, fallbackHomeSize) && 
                        !this.isHomeOverlapping(homeX, homeZ, this.availableHomes) &&
                        !cityLayout.isFacilityOverlapping(homeX, homeZ, cityLayout.facilities || [])) {
                        
                        const nearestRoad = cityLayout.findNearestRoad(homeX, homeZ);
                        if (nearestRoad) {
                            const roadIndex = cityLayout.roads.indexOf(nearestRoad);
                            const homeRotation = cityLayout.calculateBuildingRotation(homeX, homeZ, nearestRoad);
                            
                            const homeData = {
                                name: name,
                                x: homeX,
                                z: homeZ,
                                type: 'home',
                                size: fallbackHomeSize,
                                rotation: homeRotation,
                                roadIndex: roadIndex,
                                distanceToRoad: cityLayout.calculateMinDistanceToRoads(homeX, homeZ),
                                nearestRoadIndex: roadIndex,
                                color: "0x" + Math.floor(Math.random()*16777215).toString(16),
                                isOccupied: false,
                                occupant: null
                            };
                            
                            this.homes.set(name, homeData);
                            this.availableHomes.push(homeData);
                            
                            console.log(`フォールバック自宅配置成功: ${name} (${homeX.toFixed(1)}, ${homeZ.toFixed(1)})`);
                            placed = true;
                        }
                    }
                    fallbackAttempts++;
                }
                
                if (!placed) {
                    console.log(`フォールバック自宅配置も失敗: ${name}`);
                }
            }
        });
        
        console.log(`${this.homes.size}軒の自宅を事前に作成しました。`);
    },
    
    // 自宅の重複チェック
    isHomeOverlapping(x, z, homes) {
        for (const home of homes) {
            const distance = Math.sqrt(
                Math.pow(x - home.x, 2) + 
                Math.pow(z - home.z, 2)
            );
            if (distance < cityLayoutConfig.buildingSize * 1.2) { // 自宅間の間隔
                return true;
            }
        }
        return false;
    },
    
    // 利用可能な自宅をランダムで取得
    getRandomAvailableHome() {
        const availableHomes = this.availableHomes.filter(home => !home.isOccupied);
        
        if (availableHomes.length === 0) {
            console.warn('利用可能な自宅がありません。新しい自宅を生成します。');
            return this.generateFallbackHome();
        }
        
        const randomIndex = Math.floor(Math.random() * availableHomes.length);
        const selectedHome = availableHomes[randomIndex];
        
        // 居住者フラグを設定
        selectedHome.isOccupied = true;
        
        return selectedHome;
    },
    
    // フォールバック用の自宅生成（利用可能な自宅がない場合）
    generateFallbackHome() {
        const x = Math.floor(Math.random() * 41) - 20;
        const z = Math.floor(Math.random() * 41) - 20;
        
        const homeData = {
            name: "臨時住宅",
            x: x,
            z: z,
            color: "0x" + Math.floor(Math.random()*16777215).toString(16),
            isOccupied: true,
            occupant: null
        };
        
        this.homes.set(homeData.name, homeData);
        return homeData;
    },
    
    // 自宅を解放（エージェント削除時など）
    releaseHome(homeName) {
        const home = this.homes.get(homeName);
        if (home) {
            home.isOccupied = false;
            home.occupant = null;
            console.log(`自宅「${homeName}」を解放しました。`);
        }
    },
    
    // 自宅の存在確認
    hasHome(homeName) {
        return this.homes.has(homeName);
    },
    
    // 自宅データを取得
    getHome(homeName) {
        return this.homes.get(homeName);
    },
    
    // 全自宅データを取得
    getAllHomes() {
        return Array.from(this.homes.values());
    },
    
    // 利用可能な自宅数を取得
    getAvailableHomeCount() {
        return this.availableHomes.filter(home => !home.isOccupied).length;
    }
}; 