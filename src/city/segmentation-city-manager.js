/**
 * セグメンテーションベースの都市管理システム
 * SegmentationMapLoaderと既存のMESAシステムを統合
 */

class SegmentationCityManager {
    constructor(scene) {
        this.scene = scene;
        this.segmentationLoader = new SegmentationMapLoader();
        this.locations = []; // MESAの既存システム用
        this.roads = [];
        this.buildings = [];
        this.facilities = new Map(); // segment_id -> facility info
        
        this.meshGroups = null;
        this.buildingMeshes = null;
        
        console.log('SegmentationCityManager initialized');
    }
    
    /**
     * セグメンテーションJSONを読み込んで都市を生成
     * @param {string} jsonPath - JSONファイルのパス
     * @returns {Promise<Object>} 都市データ
     */
    async loadFromSegmentationJSON(jsonPath) {
        console.log(`🏙️ セグメンテーションベース都市を読み込み中: ${jsonPath}`);
        
        try {
            // セグメンテーションデータを読み込み
            const segmentationData = await this.segmentationLoader.loadFromJSON(jsonPath);
            
            // Three.jsメッシュを生成
            console.log('Three.jsメッシュを生成してシーンに追加中...');
            const meshResult = this.segmentationLoader.createThreeMeshes(this.scene);
            this.meshGroups = meshResult.meshGroups;
            this.buildingMeshes = meshResult.buildingMeshes;
            
            console.log(`メッシュグループ数: ${Object.keys(this.meshGroups).length}`);
            Object.entries(this.meshGroups).forEach(([category, group]) => {
                console.log(`  ${category}: ${group.children.length}メッシュ, visible: ${group.visible}`);
            });
            
            // MESAの既存システム用にデータを変換
            this.convertToMESAFormat();
            
            console.log('✅ セグメンテーションベース都市の読み込み完了');
            console.log(`  総メッシュ数: ${meshResult.totalMeshes}`);
            console.log(`  施設数: ${this.locations.length}`);
            console.log(`  道路セグメント: ${this.roads.length}`);
            
            return {
                success: true,
                locations: this.locations,
                roads: this.roads,
                buildings: this.buildings,
                meshGroups: this.meshGroups,
                statistics: this.segmentationLoader.getStatistics()
            };
            
        } catch (error) {
            console.error('❌ セグメンテーション都市の読み込みに失敗:', error);
            throw error;
        }
    }
    
    /**
     * セグメンテーションデータをMESAの既存形式に変換
     */
    convertToMESAFormat() {
        console.log('セグメンテーションデータをMESA形式に変換中...');
        
        this.locations = [];
        this.roads = [];
        this.buildings = [];
        
        // 建物と施設を変換
        this.segmentationLoader.buildingSegments.forEach(building => {
            const facility = this.segmentationLoader.getFacilityBySegmentId(building.id);
            
            if (facility) {
                // 施設タイプをMESAの形式に変換
                const mesaType = this.convertFacilityTypeToMESA(facility.type);
                
                // セグメンテーションメッシュを取得
                const buildingMesh = this.buildingMeshes ? this.buildingMeshes.get(building.id) : null;
                
                const location = {
                    id: building.id,
                    type: mesaType,
                    name: facility.label,
                    x: building.center[0],
                    y: building.center[1],
                    z: building.center[2],
                    // 既存のコードとの互換性のためpositionオブジェクトも追加
                    position: {
                        x: building.center[0],
                        y: building.center[1],
                        z: building.center[2]
                    },
                    size: Math.sqrt(building.area) * 0.05, // 面積からサイズを推定
                    height: building.height,
                    segmentId: building.id,
                    category: building.category,
                    // 入り口座標（建物の中心に設定、後でパスファインディングで最適化）
                    entrance: {
                        x: building.center[0],
                        y: 0,
                        z: building.center[2]
                    },
                    // 施設視点用のプロパティ
                    mesh: buildingMesh, // セグメンテーションメッシュへの参照
                    isHome: mesaType === 'home' // 住宅かどうかのフラグ
                };
                
                this.locations.push(location);
                this.facilities.set(building.id, facility);
                
                // 建物リストにも追加
                this.buildings.push({
                    ...building,
                    facilityType: facility.type,
                    facilityLabel: facility.label
                });
            }
        });
        
        // 道路ポイントを取得
        const roadPoints = this.segmentationLoader.getRoadNetwork();
        
        // 道路ポイントから道路セグメント（エッジ）を生成
        this.roads = [];
        const processedPairs = new Set();
        
        roadPoints.forEach(point => {
            point.neighbors.forEach(neighbor => {
                // 重複を避けるためのキー
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
        
        console.log(`  変換完了: ${this.locations.length}施設, ${roadPoints.length}道路ポイント, ${this.roads.length}道路セグメント`);
        
        // 施設の内訳をログ出力
        const facilityCounts = {};
        const homesCount = this.locations.filter(loc => loc.isHome).length;
        const facilitiesCount = this.locations.filter(loc => !loc.isHome).length;
        const withMeshCount = this.locations.filter(loc => loc.mesh).length;
        
        console.log(`  施設内訳:`);
        console.log(`    - 住宅: ${homesCount}軒`);
        console.log(`    - 施設: ${facilitiesCount}件`);
        console.log(`    - メッシュあり: ${withMeshCount}件`);
        
        this.locations.forEach(loc => {
            if (!loc.isHome) {
                console.log(`    - ${loc.name} (ID: ${loc.id}, type: ${loc.type}, mesh: ${loc.mesh ? 'あり' : 'なし'})`);
            }
        });
    }
    
    /**
     * 施設タイプをMESAの既存形式に変換
     * @param {string} segmentationType - セグメンテーションの施設タイプ
     * @returns {string} MESAの施設タイプ
     */
    convertFacilityTypeToMESA(segmentationType) {
        const typeMapping = {
            'hospital': 'hospital',
            'school': 'school',
            'library': 'library',
            'gym': 'gym',
            'supermarket': 'supermarket',
            'bank': 'bank',
            'post_office': 'post_office',
            'family_restaurant': 'family_restaurant',
            'cafe': 'cafe',
            'convenience_store': 'convenience_store',
            'pharmacy': 'pharmacy',
            'bakery': 'bakery',
            'bookstore': 'bookstore',
            'residential': 'home'
        };
        
        return typeMapping[segmentationType] || 'other';
    }
    
    /**
     * MESA用のロケーションリストを取得
     * @returns {Array} ロケーションリスト
     */
    getLocations() {
        return this.locations;
    }
    
    /**
     * 特定タイプの施設を取得
     * @param {string} facilityType - 施設タイプ
     * @returns {Array} マッチする施設のリスト
     */
    getLocationsByType(facilityType) {
        return this.locations.filter(loc => loc.type === facilityType);
    }
    
    /**
     * 最も近い施設を検索
     * @param {Object} position - 位置 {x, y, z}
     * @param {string} facilityType - 施設タイプ（オプション）
     * @returns {Object|null} 最も近い施設
     */
    findNearestFacility(position, facilityType = null) {
        let candidates = this.locations;
        
        if (facilityType) {
            candidates = this.getLocationsByType(facilityType);
        }
        
        if (candidates.length === 0) return null;
        
        let nearest = null;
        let minDistance = Infinity;
        
        candidates.forEach(location => {
            const dx = location.x - position.x;
            const dz = location.z - position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = location;
            }
        });
        
        return nearest;
    }
    
    /**
     * 道路ネットワークを取得
     * @returns {Array} 道路リスト
     */
    getRoads() {
        return this.roads;
    }
    
    /**
     * バウンディングボックスを取得
     * @returns {Object} バウンディングボックス
     */
    getBoundingBox() {
        return this.segmentationLoader.getBoundingBox();
    }
    
    /**
     * 統計情報を取得
     * @returns {Object} 統計情報
     */
    getStatistics() {
        const facilityTypes = {};
        
        this.locations.forEach(loc => {
            facilityTypes[loc.type] = (facilityTypes[loc.type] || 0) + 1;
        });
        
        return {
            totalLocations: this.locations.length,
            totalRoads: this.roads.length,
            totalBuildings: this.buildings.length,
            facilityDistribution: facilityTypes,
            segmentationStats: this.segmentationLoader.getStatistics()
        };
    }
    
    /**
     * メッシュグループの表示/非表示を切り替え
     * @param {string} category - カテゴリ名
     * @param {boolean} visible - 表示するかどうか
     */
    toggleCategoryVisibility(category, visible) {
        if (this.meshGroups && this.meshGroups[category]) {
            this.meshGroups[category].visible = visible;
        }
    }
    
    /**
     * 全てのカテゴリを表示
     */
    showAllCategories() {
        if (this.meshGroups) {
            Object.values(this.meshGroups).forEach(group => {
                group.visible = true;
            });
        }
    }
    
    /**
     * 全てのカテゴリを非表示
     */
    hideAllCategories() {
        if (this.meshGroups) {
            Object.values(this.meshGroups).forEach(group => {
                group.visible = false;
            });
        }
    }
}

// グローバルにエクスポート
if (typeof window !== 'undefined') {
    window.SegmentationCityManager = SegmentationCityManager;
}

