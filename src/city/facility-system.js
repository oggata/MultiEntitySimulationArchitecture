// 施設システムを管理するクラス
class FacilitySystem {
    constructor(config, roadSystem, buildingSystem) {
        this.config = config;
        this.roadSystem = roadSystem;
        this.buildingSystem = buildingSystem;
        this.facilities = [];
        
        // config.jsから設定を読み込み
        this.gridSize = config.gridSize;
        this.roadWidth = config.roadWidth;
        this.buildingSize = config.buildingSize;
        this.buildingSizes = config.buildingSizes;
    }

    // 施設の配置を道路の位置関係を考慮して生成
    generateFacilities() {
        const facilities = [];
        
        // config.jsのlocationDataの施設タイプを使用してランダム配置
        locationData.forEach(loc => {
            // ランダムな座標を生成（重複しないように）
            let attempts = 0;
            let facilityX, facilityZ;
            let placed = false;
            
            while (attempts < 500 && !placed) {
                // ランダムな座標を生成（範囲を拡大）
                facilityX = (Math.random() - 0.5) * this.gridSize * 0.9;
                facilityZ = (Math.random() - 0.5) * this.gridSize * 0.9;
                
                // 施設のサイズを決定（configから読み込み）
                const facilitySize = this.buildingSize * this.config.facilitySizeMultiplier;
                
                // 建物や他の施設との重複をチェック（条件を緩和）
                if (!this.buildingSystem.isBuildingOverlapping(facilityX, facilityZ, facilitySize) && 
                    !this.isFacilityOverlapping(facilityX, facilityZ, facilities) &&
                    !this.buildingSystem.isHomeOverlapping(facilityX, facilityZ, facilitySize)) {
                    
                    // 新しい道路距離チェック関数を使用して施設の位置を検証
                    if (this.isValidBuildingPositionWithRoadDistance(facilityX, facilityZ, facilitySize)) {
                        // 最も近い道路を見つける
                        const nearestRoad = this.roadSystem.findNearestRoad(facilityX, facilityZ);
                        if (nearestRoad) {
                            const roadIndex = this.roadSystem.roads.indexOf(nearestRoad);
                            
                            // 施設の向きを最も近い道路の方向に計算
                            const facilityRotation = this.calculateBuildingRotation(facilityX, facilityZ, nearestRoad);
                            
                            facilities.push({
                                name: loc.name,
                                x: facilityX,
                                z: facilityZ,
                                type: 'facility',
                                size: facilitySize,
                                rotation: facilityRotation,
                                roadIndex: roadIndex,
                                distanceToRoad: this.roadSystem.calculateMinDistanceToRoads(facilityX, facilityZ),
                                nearestRoadIndex: roadIndex
                            });
                            
                            placed = true;
                        }
                    }
                }
                attempts++;
            }
            
            if (!placed) {
                // フォールバック: より緩い条件で配置を試行
                let fallbackAttempts = 0;
                const maxFallbackAttempts = 100;
                
                while (fallbackAttempts < maxFallbackAttempts && !placed) {
                    facilityX = (Math.random() - 0.5) * this.gridSize * 0.95;
                    facilityZ = (Math.random() - 0.5) * this.gridSize * 0.95;
                    
                    // フォールバック用の施設サイズを定義
                    const fallbackFacilitySize = this.buildingSize * this.config.facilitySizeMultiplier * 0.8;
                    
                    // より緩い条件でチェック
                    if (!this.buildingSystem.isBuildingOverlapping(facilityX, facilityZ, fallbackFacilitySize) && 
                        !this.isFacilityOverlapping(facilityX, facilityZ, facilities) &&
                        !this.buildingSystem.isHomeOverlapping(facilityX, facilityZ, fallbackFacilitySize)) {
                        
                        const nearestRoad = this.roadSystem.findNearestRoad(facilityX, facilityZ);
                        if (nearestRoad) {
                            const roadIndex = this.roadSystem.roads.indexOf(nearestRoad);
                            const facilityRotation = this.calculateBuildingRotation(facilityX, facilityZ, nearestRoad);
                            
                            facilities.push({
                                name: loc.name,
                                x: facilityX,
                                z: facilityZ,
                                type: 'facility',
                                size: fallbackFacilitySize,
                                rotation: facilityRotation,
                                roadIndex: roadIndex,
                                distanceToRoad: this.roadSystem.calculateMinDistanceToRoads(facilityX, facilityZ),
                                nearestRoadIndex: roadIndex
                            });
                            
                            placed = true;
                        }
                    }
                    fallbackAttempts++;
                }
            }
        });
        
        this.facilities = facilities;
        return facilities;
    }
    
    // 施設の重複チェック
    isFacilityOverlapping(x, z, facilities) {
        for (const facility of facilities) {
            const distance = Math.sqrt(
                Math.pow(x - facility.x, 2) + 
                Math.pow(z - facility.z, 2)
            );
            if (distance < this.buildingSize * 1.5) {
                return true;
            }
        }
        return false;
    }
    
    // 施設と建物の重複チェック
    isFacilityBuildingOverlapping(x, z, buildingSize) {
        // 建物との重複チェック
        for (const building of this.buildingSystem.buildings) {
            const distance = Math.sqrt(
                Math.pow(x - building.x, 2) + 
                Math.pow(z - building.z, 2)
            );
            
            // 建物サイズと施設サイズを考慮した重複チェック
            const combinedRadius = (buildingSize + building.size) / 2;
            const overlapMargin = this.buildingSystem.getOverlapMarginByBuildingSize(buildingSize, building.size);
            const requiredDistance = combinedRadius + overlapMargin;
            
            if (distance < requiredDistance) {
                return true;
            }
        }
        
        // 施設との重複チェック
        for (const facility of this.facilities || []) {
            const distance = Math.sqrt(
                Math.pow(x - facility.x, 2) + 
                Math.pow(z - facility.z, 2)
            );
            
            const facilitySize = facility.size || this.buildingSize * this.config.facilitySizeMultiplier;
            const combinedRadius = (buildingSize + facilitySize) / 2;
            const overlapMargin = this.buildingSystem.getOverlapMarginByBuildingSize(buildingSize, facilitySize);
            const requiredDistance = combinedRadius + overlapMargin;
            
            if (distance < requiredDistance) {
                return true;
            }
        }
        
        return false;
    }

    // 道路を関数として扱い、建物の位置が安全かチェックする新しい関数
    isValidBuildingPositionWithRoadDistance(x, z, buildingSize) {
        const buildingRadius = buildingSize / 2;
        
        // 建物サイズに応じて安全マージンを動的に調整
        const safetyMargin = this.buildingSystem.getSafetyMarginByBuildingSize(buildingSize);
        
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

    // 施設の描画
    drawFacilities() {
        this.facilities.forEach(facility => {
            // buildings.jsの詳細な建物作成関数を使用
            const locationGroup = new THREE.Group();
            
            // 施設情報を取得
            const facilityInfo = getFacilityInfo(facility.name);
            const facilitySize = getFacilitySize(facility.name);
            const facilityHeight = facilitySize * 0.8;
            
            // 詳細な建物を作成
            createDetailedBuilding(locationGroup, {
                name: facility.name,
                color: facilityInfo.color
            }, facilitySize, facilityHeight);
            
            // 建物の位置と向きを設定
            locationGroup.position.set(facility.x, 0, facility.z);
            if (facility.rotation !== undefined) {
                locationGroup.rotation.y = facility.rotation;
            }
            
            scene.add(locationGroup);
            
            // 施設名の表示は削除
            
            // 施設の入り口位置のマーカーを表示（デバッグ用）
            const entrancePos = this.getBuildingEntrance(facility);
            const markerGeometry = new THREE.SphereGeometry(0.2, 8, 8);
            const markerMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffff00, 
                transparent: true, 
                opacity: 0.7 
            });
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.set(entrancePos.x, 0.3, entrancePos.z);
            scene.add(marker);
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