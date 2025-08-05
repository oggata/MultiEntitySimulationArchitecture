// 建物システムを管理するクラス
class BuildingSystem {
    constructor(config, roadSystem) {
        this.config = config;
        this.roadSystem = roadSystem;
        this.buildings = [];
        
        // config.jsから設定を読み込み
        this.gridSize = config.gridSize;
        this.roadWidth = config.roadWidth;
        this.buildingSize = config.buildingSize;
        this.minBuildingDistance = config.minBuildingDistance;
        this.buildingSizes = config.buildingSizes;
    }

    // 建物の配置を道路の位置関係を考慮して生成
    generateBuildings() {
        this.buildings = [];
        const intersectionBuffer = this.buildingSize * 3;
        
        // まず、locationDataの施設を優先的に配置
        const placedFacilities = new Set();
        
        // 各道路に沿って建物を配置
        this.roadSystem.roads.forEach((road, roadIndex) => {
            // 道路の方向を計算
            const roadDirX = road.end.x - road.start.x;
            const roadDirZ = road.end.z - road.start.z;
            const roadLength = Math.sqrt(roadDirX * roadDirX + roadDirZ * roadDirZ);
            
            // 道路に垂直な方向を計算（建物の配置方向）
            const perpDirX = -roadDirZ / roadLength;
            const perpDirZ = roadDirX / roadLength;
            
            // 道路の両側に建物を配置
            const sides = [
                { x: perpDirX, z: perpDirZ },   // 道路の片側
                { x: -perpDirX, z: -perpDirZ }  // 道路の反対側
            ];
            
            sides.forEach((side, sideIndex) => {
                // 道路に沿って建物を配置するポイントを計算（建物間隔を増加）
                const minBuildingSpacing = this.buildingSizes.medium + this.minBuildingDistance * 2;
                const numBuildings = Math.floor(roadLength / minBuildingSpacing);
                
                for (let i = 0; i < numBuildings; i++) {
                    // 道路に沿った位置（端から少し離す）
                    const roadT = (i + 1) / (numBuildings + 1);
                    const roadX = road.start.x + roadDirX * roadT;
                    const roadZ = road.start.z + roadDirZ * roadT;
                    
                    // 交差点からの距離をチェック
                    let tooCloseToIntersection = false;
                    for (const intersection of this.roadSystem.intersections) {
                        const distanceToIntersection = Math.sqrt(
                            Math.pow(roadX - intersection.x, 2) + 
                            Math.pow(roadZ - intersection.z, 2)
                        );
                        if (distanceToIntersection < intersectionBuffer) {
                            tooCloseToIntersection = true;
                            break;
                        }
                    }
                    
                    if (tooCloseToIntersection) {
                        continue;
                    }
                    
                    // 建物タイプとサイズを決定
                    let buildingType;
                    let buildingSize;
                    
                    if (placedFacilities.size < locationData.length) {
                        const unplacedFacilities = locationData.filter(loc => !placedFacilities.has(loc.name));
                        const selectedFacility = unplacedFacilities[Math.floor(Math.random() * unplacedFacilities.length)];
                        buildingType = selectedFacility.name;
                        buildingSize = this.getBuildingSizeByType(buildingType);
                        placedFacilities.add(selectedFacility.name);
                    } else {
                        buildingType = this.getRandomBuildingType();
                        buildingSize = this.getBuildingSizeByType(buildingType);
                    }
                    
                    // 道路の幅を取得
                    const roadWidth = road.isMain ? this.roadWidth * 2 : road.isShort ? this.roadWidth * 0.25 : this.roadWidth;
                    
                    // 建物を道路の端から適切な距離に配置（改善版）
                    const roadEdgeDistance = roadWidth / 2;
                    const buildingRadius = buildingSize / 2;
                    
                    // 建物サイズに応じて安全マージンを動的に調整
                    const safetyMargin = this.getSafetyMarginByBuildingSize(buildingSize);
                    
                    // 初期配置距離（建物サイズに応じて調整）
                    let totalDistance = roadEdgeDistance + safetyMargin + buildingRadius;
                    
                    // 建物の中心位置を計算
                    let buildingX = roadX + side.x * totalDistance;
                    let buildingZ = roadZ + side.z * totalDistance;
                    
                    // 位置が安全でない場合は距離を調整
                    let attempts = 0;
                    const maxAttempts = 10;
                    
                    while (attempts < maxAttempts && !this.isValidBuildingPositionWithRoadDistance(buildingX, buildingZ, buildingSize)) {
                        totalDistance += this.minBuildingDistance;
                        buildingX = roadX + side.x * totalDistance;
                        buildingZ = roadZ + side.z * totalDistance;
                        attempts++;
                    }
                    
                    // 位置調整の試行回数をチェック
                    if (attempts >= maxAttempts) {
                        continue;
                    }
                    
                    // 新しい道路距離チェック関数を使用
                    if (!this.isValidBuildingPositionWithRoadDistance(buildingX, buildingZ, buildingSize)) {
                        continue;
                    }
                
                    // 他の建物との重複をチェック
                    if (!this.isBuildingOverlapping(buildingX, buildingZ, buildingSize)) {
                        // 自宅との重複もチェック
                        if (!this.isHomeOverlapping(buildingX, buildingZ, buildingSize)) {
                            // 最も近い道路の方向を計算して建物の向きを決定
                            const nearestRoad = this.roadSystem.findNearestRoad(buildingX, buildingZ);
                            const buildingRotation = this.calculateBuildingRotation(buildingX, buildingZ, nearestRoad);
                            
                            this.buildings.push({
                                x: buildingX,
                                z: buildingZ,
                                type: buildingType,
                                size: buildingSize,
                                rotation: buildingRotation,
                                roadIndex: roadIndex,
                                side: sideIndex,
                                distanceToRoad: this.roadSystem.calculateMinDistanceToRoads(buildingX, buildingZ),
                                nearestRoadIndex: this.roadSystem.roads.indexOf(nearestRoad)
                            });
                        }
                    }
                }
            });
        });
        
        return this.buildings;
    }

    // 自宅との重複チェック
    isHomeOverlapping(x, z, buildingSize) {
        // homeManagerが存在する場合のみチェック
        if (typeof homeManager !== 'undefined' && homeManager.getAllHomes) {
            const allHomes = homeManager.getAllHomes();
            for (const home of allHomes) {
                const distance = Math.sqrt(
                    Math.pow(x - home.x, 2) + 
                    Math.pow(z - home.z, 2)
                );
                
                // 建物サイズと自宅サイズを考慮した重複チェック
                const homeSize = home.size || this.config.buildingSize * 0.8;
                const combinedRadius = (buildingSize + homeSize) / 2;
                
                // 建物サイズに応じて重複チェックの距離を調整
                const overlapMargin = this.getOverlapMarginByBuildingSize(buildingSize, homeSize);
                const requiredDistance = combinedRadius + overlapMargin;
                
                if (distance < requiredDistance) {
                    return true;
                }
            }
        }
        return false;
    }

    // 道路を関数として扱い、建物の位置が安全かチェックする新しい関数
    isValidBuildingPositionWithRoadDistance(x, z, buildingSize) {
        const buildingRadius = buildingSize / 2;
        
        // 建物サイズに応じて安全マージンを動的に調整
        const safetyMargin = this.getSafetyMarginByBuildingSize(buildingSize);
        
        // すべての道路に対して距離をチェック
        for (const road of this.roadSystem.roads) {
            // 道路を直線関数として扱う
            const distance = this.roadSystem.calculateDistanceToRoadLine(x, z, road);
            const roadWidth = road.isMain ? this.roadWidth * 2 : road.isShort ? this.roadWidth * 0.25 : this.roadWidth;
            
            // 必要な最小距離 = 道路の半分幅 + 建物の半径 + 安全マージン
            const requiredDistance = (roadWidth / 2) + buildingRadius + safetyMargin;
            
            if (distance < requiredDistance) {
                return false;
            }
        }
        
        return true;
    }

    // 建物サイズに応じて安全マージンを計算
    getSafetyMarginByBuildingSize(buildingSize) {
        // configから安全マージンを読み込み
        if (buildingSize >= this.buildingSizes.large) {
            // 大きな建物（公園、学校、スーパーなど）はより大きな安全マージン
            return this.config.safetyMargins.large;
        } else if (buildingSize >= this.buildingSizes.medium) {
            // 中サイズの建物（商店、オフィスなど）は中程度の安全マージン
            return this.config.safetyMargins.medium;
        } else {
            // 小サイズの建物（住宅など）は標準の安全マージン
            return this.config.safetyMargins.small;
        }
    }

    // 建物の重複チェックを改善（建物サイズを考慮）
    isBuildingOverlapping(x, z, buildingSize) {
        for (const building of this.buildings) {
            const distance = Math.sqrt(
                Math.pow(x - building.x, 2) + 
                Math.pow(z - building.z, 2)
            );
            
            // 両方の建物の半径を考慮した重複チェック
            const combinedRadius = (buildingSize + building.size) / 2;
            
            // 建物サイズに応じて重複チェックの距離を調整
            const overlapMargin = this.getOverlapMarginByBuildingSize(buildingSize, building.size);
            const requiredDistance = combinedRadius + overlapMargin;
            
            if (distance < requiredDistance) {
                return true;
            }
        }
        return false;
    }

    // 建物サイズに応じて重複チェックのマージンを計算
    getOverlapMarginByBuildingSize(buildingSize1, buildingSize2) {
        const maxSize = Math.max(buildingSize1, buildingSize2);
        
        if (maxSize >= this.buildingSizes.large) {
            // 大きな建物同士はより大きな間隔
            return this.config.overlapMargins.large;
        } else if (maxSize >= this.buildingSizes.medium) {
            // 中サイズの建物は中程度の間隔
            return this.config.overlapMargins.medium;
        } else {
            // 小サイズの建物は標準の間隔
            return this.config.overlapMargins.small;
        }
    }

    // 建物の向きを最も近い道路の方向に計算
    calculateBuildingRotation(buildingX, buildingZ, nearestRoad) {
        if (!nearestRoad) {
            return 0; // デフォルトの向き
        }
        
        // 建物から最も近い道路上の点を計算
        const nearestPoint = this.roadSystem.findNearestRoadPoint(buildingX, buildingZ);
        if (!nearestPoint) {
            return 0;
        }
        
        // 建物から最も近い道路点への方向ベクトル
        const dirX = nearestPoint.x - buildingX;
        const dirZ = nearestPoint.z - buildingZ;
        
        // 建物の入り口が道路の方を向くように回転を計算
        const rotation = Math.atan2(dirX, dirZ);
        
        return rotation;
    }

    // ランダムな建物タイプを取得
    getRandomBuildingType() {
        const types = [
            // 小サイズ（住宅系）- 高い確率
            'house', 'house', 'house', 'house', 'house',
            'apartment', 'apartment', 'apartment',
            'cottage', 'studio',
            
            // 中サイズ（商業施設）- 中程度の確率
            'shop', 'shop', 'shop',
            'restaurant', 'restaurant',
            'office', 'office',
            'cafe', 'bank', 'post_office',
            
            // 大サイズ（公共施設）- 低い確率
            'park', 'school', 'supermarket', 'hospital', 'gym', 'library', 'plaza'
        ];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    // 建物タイプに応じたサイズを取得
    getBuildingSizeByType(buildingType) {
        const sizeMap = {
            // 大サイズの建物
            'park': 'large',
            'school': 'large',
            'supermarket': 'large',
            'hospital': 'large',
            'gym': 'large',
            'library': 'large',
            'plaza': 'large',
            '公園': 'large',
            '学校': 'large',
            'スーパーマーケット': 'large',
            '病院': 'large',
            'スポーツジム': 'large',
            '図書館': 'large',
            '町の広場': 'large',
            
            // 中サイズの建物
            'shop': 'medium',
            'restaurant': 'medium',
            'office': 'medium',
            'cafe': 'medium',
            'bank': 'medium',
            'post_office': 'medium',
            'カフェ': 'medium',
            'ファミレス': 'medium',
            '郵便局': 'medium',
            
            // 小サイズの建物
            'house': 'small',
            'apartment': 'small',
            'cottage': 'small',
            'studio': 'small'
        };
        
        const sizeCategory = sizeMap[buildingType] || 'medium';
        return this.buildingSizes[sizeCategory];
    }
    
    // 建物タイプに応じた色を取得
    getBuildingColorByType(buildingType) {
        const colorMap = {
            // 大サイズの建物（公共施設）
            'park': 0x228B22,        // 緑
            'school': 0x87CEEB,      // 空色
            'supermarket': 0xFFD700, // 金色
            'hospital': 0xFFFFFF,    // 白
            'gym': 0xFF6347,         // 赤
            'library': 0x4682B4,     // 青
            'plaza': 0x90EE90,       // 薄緑
            '公園': 0x228B22,        // 緑
            '学校': 0x87CEEB,        // 空色
            'スーパーマーケット': 0xFFD700, // 金色
            '病院': 0xFFFFFF,        // 白
            'スポーツジム': 0xFF6347, // 赤
            '図書館': 0x4682B4,      // 青
            '町の広場': 0x90EE90,    // 薄緑
            
            // 中サイズの建物（商業施設）
            'shop': 0xFF69B4,        // ピンク
            'restaurant': 0xFF4500,  // オレンジ
            'office': 0x808080,      // グレー
            'cafe': 0x8B4513,        // 茶色
            'bank': 0x32CD32,        // ライムグリーン
            'post_office': 0x4169E1, // ロイヤルブルー
            'カフェ': 0x8B4513,      // 茶色
            'ファミレス': 0xFF4500,  // オレンジ
            '郵便局': 0x4169E1,      // ロイヤルブルー
            
            // 小サイズの建物（住宅）
            'house': 0xFF00FF,       // マゼンタ
            'apartment': 0x9370DB,   // 紫
            'cottage': 0xD2691E,     // チョコレート
            'studio': 0x20B2AA       // ライトシーグリーン
        };
        
        return colorMap[buildingType] || 0x808080; // デフォルトはグレー
    }
    
    // 建物の描画
    drawBuildings() {
        this.buildings.forEach(building => {
            const geometry = new THREE.BoxGeometry(building.size, building.size, building.size);
            const edges = new THREE.EdgesGeometry(geometry);
            const buildingColor = this.getBuildingColorByType(building.type);
            const material = new THREE.LineBasicMaterial({ color: buildingColor });
            const mesh = new THREE.LineSegments(edges, material);
            mesh.position.set(building.x, building.size/2, building.z);
            
            // 建物の向きを設定（入り口が道路に向くように）
            mesh.rotation.y = building.rotation;
            
            // 入り口の表示（建物の前面に小さな四角形を追加）
            const entranceSize = building.size * 0.3;
            const entranceGeometry = new THREE.PlaneGeometry(entranceSize, entranceSize);
            const entranceEdges = new THREE.EdgesGeometry(entranceGeometry);
            const entranceMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff });
            const entrance = new THREE.LineSegments(entranceEdges, entranceMaterial);
            entrance.position.set(0, building.size * 0.3, building.size * 0.65);
            entrance.rotation.x = -Math.PI / 2;
            mesh.add(entrance);
            
            // 入り口位置のマーカーを表示（デバッグ用）
            const entrancePos = this.getBuildingEntrance(building);
            const markerGeometry = new THREE.SphereGeometry(0.2, 8, 8);
            const markerMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff00ff, 
                transparent: true, 
                opacity: 0.7 
            });
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.set(entrancePos.x, 0.3, entrancePos.z);
            scene.add(marker);
            
            scene.add(mesh);
        });
    }

    // 建物の入り口位置を計算
    getBuildingEntrance(building) {
        // 建物の前面（道路に向いている面）の中心を入り口とする
        const entranceOffset = building.size * 0.8; // 建物の前面から少し手前
        
        // 建物の向きに基づいて入り口位置を計算
        const entranceX = building.x + Math.sin(building.rotation) * entranceOffset;
        const entranceZ = building.z + Math.cos(building.rotation) * entranceOffset;
        
        return { x: entranceX, z: entranceZ };
    }
    
    // 建物内の中心位置を計算
    getBuildingCenter(building) {
        return { x: building.x, z: building.z };
    }
    
    // 建物の入り口から道路までの接続通路を作成
    createEntranceConnection(building) {
        const entrance = this.getBuildingEntrance(building);
        
        // 建物に記録された最も近い道路を使用
        let nearestRoad;
        if (building.nearestRoadIndex !== undefined) {
            nearestRoad = this.roadSystem.roads[building.nearestRoadIndex];
        } else {
            nearestRoad = this.roadSystem.findNearestRoad(entrance.x, entrance.z);
        }
        
        if (!nearestRoad) return null;
        
        // 道路上の最も近い点を計算
        const roadPoint = this.roadSystem.findNearestRoadPoint(entrance.x, entrance.z);
        
        // 入り口から道路までの通路を作成
        const connection = {
            start: { x: entrance.x, z: entrance.z },
            end: { x: roadPoint.x, z: roadPoint.z },
            type: 'entrance',
            building: building
        };
        
        return connection;
    }
} 