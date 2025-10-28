/**
 * セグメンテーションベースの都市マップローダー
 * 航空写真からのセグメンテーションデータを読み込み、3D都市モデルを生成
 */

class SegmentationMapLoader {
    constructor() {
        this.meshData = null;
        this.metadata = null;
        this.buildingMeshes = new Map(); // building_id -> THREE.Mesh
        this.segmentCategories = new Map(); // segment_id -> category info
        this.facilityAssignments = new Map(); // segment_id -> facility_type
        this.roadSegments = [];
        this.buildingSegments = [];
        
        // カテゴリごとのメッシュグループ
        this.meshGroups = {};
        
        console.log('SegmentationMapLoader initialized');
    }
    
    /**
     * セグメンテーションJSONファイルを読み込む
     * @param {string} jsonPath - JSONファイルのパス
     * @returns {Promise<Object>} 読み込まれたデータ
     */
    async loadFromJSON(jsonPath) {
        console.log(`セグメンテーションデータを読み込み中: ${jsonPath}`);
        
        try {
            const response = await fetch(jsonPath);
            if (!response.ok) {
                throw new Error(`Failed to load: ${response.statusText}`);
            }
            
            const data = await JSON.parse(await response.text());
            return await this.loadFromData(data);
        } catch (error) {
            console.error('セグメンテーションデータの読み込みに失敗:', error);
            throw error;
        }
    }
    
    /**
     * セグメンテーションデータオブジェクトから読み込む
     * @param {Object} data - セグメンテーションデータ
     * @returns {Promise<Object>} 処理されたデータ
     */
    async loadFromData(data) {
        console.log('セグメンテーションデータを解析中...');
        
        this.metadata = data.metadata;
        this.meshData = data.meshes;
        
        console.log(`総メッシュ数: ${this.meshData.length}`);
        console.log(`カテゴリ:`, Object.keys(this.metadata.categories));
        
        // カテゴリごとにセグメントを分類
        this.classifySegments();
        
        // 施設を自動割り当て
        this.autoAssignFacilities();
        
        return {
            metadata: this.metadata,
            meshData: this.meshData,
            roads: this.roadSegments,
            buildings: this.buildingSegments,
            facilities: Array.from(this.facilityAssignments.entries())
        };
    }
    
    /**
     * セグメントをカテゴリごとに分類
     */
    classifySegments() {
        console.log('セグメントを分類中...');
        
        this.roadSegments = [];
        this.buildingSegments = [];
        
        this.meshData.forEach((mesh, index) => {
            const category = mesh.category;
            
            // カテゴリ情報を保存
            this.segmentCategories.set(mesh.id, {
                id: mesh.id,
                category: category,
                label: mesh.label,
                semantic_id: mesh.semantic_id,
                center: mesh.center,
                area: mesh.area,
                bbox: mesh.bbox,
                height: mesh.height
            });
            
            // 道路セグメント
            if (category === 'road') {
                this.roadSegments.push({
                    id: mesh.id,
                    center: mesh.center,
                    bbox: mesh.bbox,
                    area: mesh.area
                });
            }
            
            // 建物セグメント
            else if (category.startsWith('building_')) {
                this.buildingSegments.push({
                    id: mesh.id,
                    category: category,
                    center: mesh.center,
                    bbox: mesh.bbox,
                    area: mesh.area,
                    height: mesh.height
                });
            }
        });
        
        console.log(`道路セグメント: ${this.roadSegments.length}`);
        console.log(`建物セグメント: ${this.buildingSegments.length}`);
    }
    
    /**
     * 建物セグメントに施設を自動割り当て
     */
    autoAssignFacilities() {
        console.log('施設を自動割り当て中...');
        
        // 建物を高さとサイズで分類
        const sortedBuildings = [...this.buildingSegments].sort((a, b) => {
            // 高さ優先、次に面積
            if (Math.abs(a.height - b.height) > 0.1) {
                return b.height - a.height;
            }
            return b.area - a.area;
        });
        
        // 施設タイプの定義（優先度順）
        const facilityTypes = [
            // 大型施設（高い建物）
            { type: 'hospital', label: '病院', minHeight: 2.0, count: 1 },
            { type: 'school', label: '学校', minHeight: 1.5, count: 2 },
            { type: 'library', label: '図書館', minHeight: 1.5, count: 1 },
            { type: 'gym', label: 'ジム', minHeight: 1.0, count: 1 },
            
            // 中型施設
            { type: 'supermarket', label: 'スーパーマーケット', minHeight: 0.8, count: 3 },
            { type: 'bank', label: '銀行', minHeight: 1.0, count: 2 },
            { type: 'post_office', label: '郵便局', minHeight: 0.8, count: 2 },
            { type: 'family_restaurant', label: 'ファミレス', minHeight: 0.6, count: 2 },
            { type: 'cafe', label: 'カフェ', minHeight: 0.6, count: 3 },
            
            // 小型施設
            { type: 'convenience_store', label: 'コンビニ', minHeight: 0.5, count: 5 },
            { type: 'pharmacy', label: '薬局', minHeight: 0.5, count: 2 },
            { type: 'bakery', label: 'パン屋', minHeight: 0.5, count: 2 },
            { type: 'bookstore', label: '本屋', minHeight: 0.6, count: 2 },
        ];
        
        // 残りは住宅
        let facilityIndex = 0;
        let assignedCount = 0;
        
        for (const building of sortedBuildings) {
            let assigned = false;
            
            // 施設タイプを順番にチェック
            while (facilityIndex < facilityTypes.length) {
                const facility = facilityTypes[facilityIndex];
                
                // 高さ条件をチェック
                if (building.height >= facility.minHeight) {
                    this.facilityAssignments.set(building.id, {
                        type: facility.type,
                        label: facility.label,
                        buildingId: building.id
                    });
                    
                    assignedCount++;
                    assigned = true;
                    
                    // このタイプの割り当て数を減らす
                    facility.count--;
                    
                    // このタイプの割り当てが完了したら次へ
                    if (facility.count <= 0) {
                        facilityIndex++;
                    }
                    
                    break;
                }
                
                // 高さが足りない場合は次の施設タイプへ
                facilityIndex++;
            }
            
            // 施設が割り当てられなかった場合は住宅
            if (!assigned) {
                this.facilityAssignments.set(building.id, {
                    type: 'residential',
                    label: '住宅',
                    buildingId: building.id
                });
            }
        }
        
        console.log(`施設割り当て完了: ${assignedCount}施設 + ${sortedBuildings.length - assignedCount}住宅`);
    }
    
    /**
     * Three.jsメッシュを生成してシーンに追加
     * @param {THREE.Scene} scene - Three.jsシーン
     * @returns {Object} 生成されたメッシュ情報
     */
    createThreeMeshes(scene) {
        console.log('Three.jsメッシュを生成中...');
        
        if (!this.meshData) {
            throw new Error('セグメンテーションデータが読み込まれていません');
        }
        
        // カテゴリごとのグループを作成
        const categoryColors = {
            'road': 0x804080,
            'forest': 0x228B22,
            'park': 0x90EE90,
            'water': 0x1E90FF,
            'building_a': 0xFFC896,
            'building_b': 0xFFA07A,
            'building_c': 0xF0785A,
            'building_d': 0xDC503C,
            'building_e': 0xC82828,
            'bare_land': 0xD2B48C,
            'infrastructure': 0x646464,
            'other': 0x505050
        };
        
        Object.keys(categoryColors).forEach(category => {
            this.meshGroups[category] = new THREE.Group();
            this.meshGroups[category].name = category;
            scene.add(this.meshGroups[category]);
        });
        
        let successCount = 0;
        let errorCount = 0;
        
        // 各メッシュを生成
        this.meshData.forEach((meshData, index) => {
            try {
                if (index % 100 === 0) {
                    console.log(`  メッシュ生成中: ${index}/${this.meshData.length}`);
                }
                
                const geometry = new THREE.BufferGeometry();
                
                // 頂点データ
                const vertices = [];
                const colors = [];
                const indices = [];
                
                meshData.vertices.forEach(v => {
                    vertices.push(v[0], v[1], v[2]);
                });
                
                meshData.colors.forEach(c => {
                    colors.push(c[0], c[1], c[2]);
                });
                
                meshData.faces.forEach(f => {
                    indices.push(f[0], f[1], f[2]);
                });
                
                if (vertices.length === 0 || indices.length === 0) {
                    errorCount++;
                    return;
                }
                
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                geometry.setIndex(indices);
                geometry.computeVertexNormals();
                
                // マテリアル（影とライティングが効く）
                const material = new THREE.MeshPhongMaterial({
                    vertexColors: true,
                    side: THREE.DoubleSide,
                    shininess: 30,
                    specular: 0x222222,
                    flatShading: false
                });
                
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                
                // ユーザーデータ
                mesh.userData = {
                    segmentId: meshData.id,
                    category: meshData.category,
                    label: meshData.label,
                    semantic_id: meshData.semantic_id,
                    area: meshData.area,
                    bbox: meshData.bbox,
                    height: meshData.height,
                    center: meshData.center
                };
                
                // 施設情報を追加
                if (this.facilityAssignments.has(meshData.id)) {
                    const facility = this.facilityAssignments.get(meshData.id);
                    mesh.userData.facilityType = facility.type;
                    mesh.userData.facilityLabel = facility.label;
                }
                
                // カテゴリグループに追加
                const category = meshData.category;
                if (this.meshGroups[category]) {
                    this.meshGroups[category].add(mesh);
                    this.buildingMeshes.set(meshData.id, mesh);
                    successCount++;
                }
                
            } catch (error) {
                console.error(`メッシュ生成エラー (ID: ${meshData.id}):`, error);
                errorCount++;
            }
        });
        
        console.log(`✅ メッシュ生成完了: ${successCount}成功, ${errorCount}エラー`);
        
        return {
            meshGroups: this.meshGroups,
            buildingMeshes: this.buildingMeshes,
            totalMeshes: successCount
        };
    }
    
    /**
     * セグメントIDから施設情報を取得
     * @param {number} segmentId - セグメントID
     * @returns {Object|null} 施設情報
     */
    getFacilityBySegmentId(segmentId) {
        return this.facilityAssignments.get(segmentId) || null;
    }
    
    /**
     * 施設タイプでフィルタリング
     * @param {string} facilityType - 施設タイプ
     * @returns {Array} マッチする施設のリスト
     */
    getFacilitiesByType(facilityType) {
        const facilities = [];
        
        this.facilityAssignments.forEach((facility, segmentId) => {
            if (facility.type === facilityType) {
                const segmentInfo = this.segmentCategories.get(segmentId);
                facilities.push({
                    ...facility,
                    ...segmentInfo
                });
            }
        });
        
        return facilities;
    }
    
    /**
     * 道路ネットワークを取得（パスファインディング用）
     * 道路セグメントの頂点から道路ポイントを抽出
     * @returns {Array} 道路ポイントのリスト
     */
    getRoadNetwork() {
        const roadPoints = [];
        
        this.roadSegments.forEach(road => {
            // 道路の頂点から道路ポイントを生成
            if (road.vertices && road.vertices.length > 0) {
                road.vertices.forEach((vertex, index) => {
                    roadPoints.push({
                        id: `${road.id}_v${index}`,
                        roadSegmentId: road.id,
                        x: vertex[0],
                        y: vertex[1] || 0,
                        z: vertex[2],
                        area: road.area,
                        neighbors: [] // 隣接ポイント（後で計算）
                    });
                });
                
                // 道路の中心点も追加（大きな道路の場合に重要）
                roadPoints.push({
                    id: `${road.id}_center`,
                    roadSegmentId: road.id,
                    x: road.center[0],
                    y: road.center[1] || 0,
                    z: road.center[2],
                    area: road.area,
                    neighbors: []
                });
            } else {
                // 頂点情報がない場合は中心点のみ使用
                roadPoints.push({
                    id: `${road.id}_center`,
                    roadSegmentId: road.id,
                    x: road.center[0],
                    y: road.center[1] || 0,
                    z: road.center[2],
                    area: road.area,
                    neighbors: []
                });
            }
        });
        
        // 近接ポイント間の接続を計算
        this.calculateRoadPointNeighbors(roadPoints);
        
        console.log(`道路ネットワーク: ${roadPoints.length}ポイント生成`);
        return roadPoints;
    }
    
    /**
     * 道路ポイント間の隣接関係を計算
     * @param {Array} roadPoints - 道路ポイントの配列
     */
    calculateRoadPointNeighbors(roadPoints) {
        const maxNeighborDistance = 25; // 隣接と見なす最大距離
        
        for (let i = 0; i < roadPoints.length; i++) {
            const point1 = roadPoints[i];
            
            for (let j = i + 1; j < roadPoints.length; j++) {
                const point2 = roadPoints[j];
                
                const dx = point1.x - point2.x;
                const dz = point1.z - point2.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                // 同じ道路セグメント内、または近接している場合は接続
                if (point1.roadSegmentId === point2.roadSegmentId || distance < maxNeighborDistance) {
                    point1.neighbors.push({
                        id: point2.id,
                        x: point2.x,
                        y: point2.y,
                        z: point2.z,
                        distance: distance
                    });
                    point2.neighbors.push({
                        id: point1.id,
                        x: point1.x,
                        y: point1.y,
                        z: point1.z,
                        distance: distance
                    });
                }
            }
        }
    }
    
    /**
     * 全建物の入り口座標を取得
     * @returns {Array} 建物の入り口情報
     */
    getBuildingEntrances() {
        const entrances = [];
        
        this.buildingSegments.forEach(building => {
            const facility = this.facilityAssignments.get(building.id);
            
            entrances.push({
                buildingId: building.id,
                position: {
                    x: building.center[0],
                    y: 0,
                    z: building.center[2]
                },
                facilityType: facility ? facility.type : 'unknown',
                facilityLabel: facility ? facility.label : '不明'
            });
        });
        
        return entrances;
    }
    
    /**
     * 統計情報を取得
     * @returns {Object} 統計情報
     */
    getStatistics() {
        const facilityCount = {};
        
        this.facilityAssignments.forEach(facility => {
            facilityCount[facility.type] = (facilityCount[facility.type] || 0) + 1;
        });
        
        return {
            totalSegments: this.meshData ? this.meshData.length : 0,
            roadSegments: this.roadSegments.length,
            buildingSegments: this.buildingSegments.length,
            facilityDistribution: facilityCount,
            categories: this.metadata ? this.metadata.categories : {}
        };
    }
}

// グローバルにエクスポート
if (typeof window !== 'undefined') {
    window.SegmentationMapLoader = SegmentationMapLoader;
}

