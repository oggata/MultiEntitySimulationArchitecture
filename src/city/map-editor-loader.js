// エディタのJSON形式からMESAのマップ生成システムへの変換機能
class MapEditorLoader {
    constructor(config) {
        this.config = config;
        this.gridData = null;
        this.gridSize = 0; // 受け取り時に決定
        
        // エディタの1マス = MESAの自宅サイズ（small: 2）
        this.homeSize = config.buildingSizes.small; // 2
        this.scaleFactor = this.homeSize; // 1マス = 2単位
        
        console.log(`スケール設定: エディタ1マス = MESA ${this.homeSize}単位`);
    }

    // エディタのJSONデータを読み込み
    loadFromEditorData(jsonData) {
        this.gridData = jsonData;
        this.gridSize = Array.isArray(jsonData) ? jsonData.length : 0;
        if (this.gridSize === 0) {
            throw new Error('エディタデータのサイズが不正です');
        }
        console.log(`エディタデータを読み込みました: ${this.gridSize}x${this.gridSize}`);
        return this.convertToMesaFormat();
    }

    // エディタのグリッドデータをMESA形式に変換
    convertToMesaFormat() {
        if (!this.gridData) {
            throw new Error('グリッドデータが読み込まれていません');
        }

        const cityData = {
            roads: [],
            buildings: [],
            facilities: [],
            intersections: []
        };

        // 道路の抽出と変換
        cityData.roads = this.extractRoads();
        
        // 建物の抽出と変換
        cityData.buildings = this.extractBuildings();
        
        // 施設の抽出と変換
        cityData.facilities = this.extractFacilities();
        
        // 交差点の検出
        cityData.intersections = this.findIntersections(cityData.roads);

        console.log(`変換完了: 道路=${cityData.roads.length}本, 建物=${cityData.buildings.length}個, 施設=${cityData.facilities.length}個`);
        return cityData;
    }

    // 道路を抽出
    extractRoads() {
        const roads = [];
        const visited = new Set();
        let roadTileCount = 0;

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const raw = this.gridData[y][x];
                const tileType = typeof raw === 'string' ? raw.split('|')[0] : raw;
                const key = `${x},${y}`;
                
                if ((tileType === 'road' || tileType === 'railway') && !visited.has(key)) {
                    roadTileCount++;
                    const roadSegment = this.extractRoadSegment(x, y, tileType, visited);
                    if (roadSegment) {
                        roads.push(roadSegment);
                    }
                }
            }
        }

        console.log(`道路タイル数: ${roadTileCount}個`);
        console.log(`抽出された道路セグメント数: ${roads.length}個`);
        
        // 最初の数個の道路の座標をログ出力
        if (roads.length > 0) {
            console.log('最初の5個の道路セグメント:');
            roads.slice(0, 5).forEach((road, index) => {
                console.log(`道路${index + 1}: (${road.start.x.toFixed(2)}, ${road.start.z.toFixed(2)}) → (${road.end.x.toFixed(2)}, ${road.end.z.toFixed(2)})`);
            });
        }

        return roads;
    }

    // 道路セグメントを抽出（連続する道路を1つのセグメントとして処理）
    extractRoadSegment(startX, startY, tileType, visited) {
        const segment = {
            start: this.gridToMesaCoords(startX, startY),
            end: null,
            type: tileType === 'railway' ? 'railway' : 'main',
            // エディタ由来の道路は最細幅に統一
            isMain: false,
            isShort: true
        };

        // 道路の方向を検出（水平または垂直）
        const direction = this.detectRoadDirection(startX, startY, tileType);
        
        if (direction === 'horizontal') {
            // 水平道路の場合、右端まで追跡
            let endX = startX;
            while (endX + 1 < this.gridSize && 
                   (this.gridData[startY][endX + 1] === tileType || this.gridData[startY][endX + 1] === 'road')) {
                endX++;
                visited.add(`${endX},${startY}`);
            }
            segment.end = this.gridToMesaCoords(endX, startY);
        } else if (direction === 'vertical') {
            // 垂直道路の場合、下端まで追跡
            let endY = startY;
            while (endY + 1 < this.gridSize && 
                   (this.gridData[endY + 1][startX] === tileType || this.gridData[endY + 1][startX] === 'road')) {
                endY++;
                visited.add(`${startX},${endY}`);
            }
            segment.end = this.gridToMesaCoords(startX, endY);
        } else {
            // 単一セルは水平優先で1マス延長
            const preferHorizontal = true;
            if (preferHorizontal) {
                const endX = Math.min(this.gridSize - 1, startX + 1);
                segment.end = this.gridToMesaCoords(endX, startY);
            } else {
                const endY = Math.min(this.gridSize - 1, startY + 1);
                segment.end = this.gridToMesaCoords(startX, endY);
            }
            segment.isShort = true;
        }

        visited.add(`${startX},${startY}`);
        return segment;
    }

    // 道路の方向を検出
    detectRoadDirection(x, y, tileType) {
        const isHorizontal = (x + 1 < this.gridSize && this.gridData[y][x + 1] === tileType) ||
                            (x - 1 >= 0 && this.gridData[y][x - 1] === tileType);
        const isVertical = (y + 1 < this.gridSize && this.gridData[y + 1][x] === tileType) ||
                          (y - 1 >= 0 && this.gridData[y - 1][x] === tileType);

        if (isHorizontal && !isVertical) return 'horizontal';
        if (isVertical && !isHorizontal) return 'vertical';
        return 'single';
    }

    // メイン道路かどうかを判定
    isMainRoad(x, y) {
        // エディタのメイン道路は、グリッドの境界近くまたは特定のパターンで判定
        const margin = this.gridSize * 0.1; // 10%のマージン
        return (x < margin || x > this.gridSize - margin || 
                y < margin || y > this.gridSize - margin);
    }

    // 建物を抽出
    extractBuildings() {
        const buildings = [];
        const visited = new Set();

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const raw = this.gridData[y][x];
                const tileType = typeof raw === 'string' ? raw.split('|')[0] : raw;
                const key = `${x},${y}`;
                
                // 施設タイルを除外
                if (this.isFacilityTile(tileType)) {
                    continue;
                }
                
                if (this.isBuildingTile(tileType) && !visited.has(key)) {
                    if (tileType === 'residential') {
                        // 住宅は1マス=1軒として個別に出力
                        const center = this.gridToMesaCoords(x, y);
                        // 向きの指定があれば反映
                        let rotation = 0;
                        if (typeof raw === 'string' && raw.includes('|dir:')) {
                            const dir = (raw.match(/\|dir:([^|]+)/) || [null, 'up'])[1];
                            rotation = this.directionToRotation(dir);
                        }
                        buildings.push({
                            x: center.x,
                            z: center.z,
                            size: 1 * this.scaleFactor,
                            rotation: rotation,
                            type: this.mapTileTypeToBuildingType('residential')
                        });
                        visited.add(key);
                    } else {
                        const building = this.extractBuilding(x, y, tileType, visited);
                        if (building) {
                            buildings.push(building);
                        }
                    }
                }
            }
        }

        return buildings;
    }

    // 建物タイプかどうかを判定
    isBuildingTile(tileType) {
        // facility: は施設扱いにするため除外
        if (typeof tileType === 'string' && tileType.startsWith('facility:')) return false;
        const buildingTypes = ['residential', 'office', 'industrial', 'convenience'];
        return buildingTypes.includes(tileType);
    }

    // 建物を抽出（連続する同じタイプのセルを1つの建物として処理）
    extractBuilding(startX, startY, tileType, visited) {
        // 建物の境界を検出
        const bounds = this.findBuildingBounds(startX, startY, tileType, visited);
        
        if (!bounds) return null;

        const { minX, maxX, minY, maxY } = bounds;
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // 訪問済みマーク
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                visited.add(`${x},${y}`);
            }
        }

        const base = {
            x: this.gridToMesaCoords(centerX, 0).x,
            z: this.gridToMesaCoords(0, centerY).z,
            size: Math.max(width, height) * this.scaleFactor,
            rotation: this.calculateBuildingRotation(width, height),
            type: this.mapTileTypeToBuildingType(tileType),
            width: width * this.scaleFactor,
            height: height * this.scaleFactor
        };
        // 向きオーバーライド（セルの一つを参照してdir:があれば適用）
        const sampleRaw = this.gridData[startY][startX];
        if (typeof sampleRaw === 'string' && sampleRaw.includes('|dir:')) {
            const dir = (sampleRaw.match(/\|dir:([^|]+)/) || [null, 'up'])[1];
            base.rotation = this.directionToRotation(dir);
        }
        return base;
    }

    // 建物の境界を検出
    findBuildingBounds(startX, startY, tileType, visited) {
        const queue = [{x: startX, y: startY}];
        const buildingCells = new Set();
        
        while (queue.length > 0) {
            const {x, y} = queue.shift();
            const key = `${x},${y}`;
            
            if (visited.has(key) || buildingCells.has(key)) continue;
            if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) continue;
            
            // グリッドデータのベースタイプを取得（パイプ区切りの最初の部分）
            const raw = this.gridData[y][x];
            const cellBaseType = typeof raw === 'string' ? raw.split('|')[0] : raw;
            if (cellBaseType !== tileType) continue;
            
            buildingCells.add(key);
            
            // 4方向をチェック
            queue.push({x: x + 1, y}, {x: x - 1, y}, {x, y: y + 1}, {x, y: y - 1});
        }

        if (buildingCells.size === 0) return null;

        // 境界を計算
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const key of buildingCells) {
            const [x, y] = key.split(',').map(Number);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }

        return { minX, maxX, minY, maxY };
    }

    // 建物の向きを計算
    calculateBuildingRotation(width, height) {
        // 長方形の場合、長い辺を道路に平行にする
        if (width > height) return 0; // 水平
        if (height > width) return Math.PI / 2; // 垂直
        return 0; // 正方形
    }

    // タイルタイプを建物タイプにマッピング
    mapTileTypeToBuildingType(tileType) {
        // locationData 由来の施設を優先
        if (typeof tileType === 'string' && tileType.startsWith('facility:')) {
            // 施設は name をそのまま type として扱い、BuildingSystem 側でサイズ/色を解決
            return tileType.replace('facility:', '');
        }
        // BuildingSystemの期待する型に寄せる
        const mapping = {
            'residential': 'house',        // 住宅は house
            'office': 'office',            // 中サイズ相当
            'industrial': 'industrial',    // 追加対応
            'convenience': 'shop'          // コンビニは shop として扱う
        };
        return mapping[tileType] || 'house';
    }

    // 施設を抽出
    extractFacilities() {
        const facilities = [];
        const visited = new Set();

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const raw = this.gridData[y][x];
                const tileType = typeof raw === 'string' ? raw.split('|')[0] : raw;
                const key = `${x},${y}`;
                
                if (this.isFacilityTile(tileType) && !visited.has(key)) {
                    const facility = this.extractFacility(x, y, tileType, visited);
                    if (facility) {
                        facilities.push(facility);
                    }
                }
            }
        }

        return facilities;
    }

    // 施設タイプかどうかを判定
    isFacilityTile(tileType) {
        if (typeof tileType === 'string' && tileType.startsWith('facility:')) return true;
        const facilityTypes = ['park', 'supermarket', 'school', 'hospital', 'police'];
        return facilityTypes.includes(tileType);
    }

    // 施設を抽出
    extractFacility(startX, startY, tileType, visited) {
        const bounds = this.findBuildingBounds(startX, startY, tileType, visited);
        
        if (!bounds) return null;

        const { minX, maxX, minY, maxY } = bounds;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // 訪問済みマーク
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                visited.add(`${x},${y}`);
            }
        }

        // facility:名称 の場合は名称をそのまま採用
        let facilityName;
        if (typeof tileType === 'string' && tileType.startsWith('facility:')) {
            // "facility:公園" → "公園" に変換し、さらに |dir: 以降を削除
            facilityName = tileType.replace('facility:', '').split('|')[0];
        } else {
            // 既存の英名→日本語名マッピング
            const nameMap = {
                'park': '公園',
                'supermarket': 'スーパーマーケット',
                'school': '学校',
                'hospital': '病院',
                'police': '警察署'
            };
            facilityName = nameMap[tileType] || '公園';
        }
        
        const base = {
            name: facilityName,
            x: this.gridToMesaCoords(centerX, 0).x,
            z: this.gridToMesaCoords(0, centerY).z,
            type: 'facility',
            size: Math.max(maxX - minX + 1, maxY - minY + 1) * this.scaleFactor
        };
        // 向きオーバーライド
        const sampleRaw = this.gridData[startY][startX];
        if (typeof sampleRaw === 'string' && sampleRaw.includes('|dir:')) {
            const dir = (sampleRaw.match(/\|dir:([^|]+)/) || [null, 'up'])[1];
            base.rotation = this.directionToRotation(dir);
        }
        return base;
    }

    // タイルタイプを施設タイプにマッピング
    mapTileTypeToFacilityType(tileType) {
        const mapping = {
            'park': 'park',
            'supermarket': 'supermarket',
            'school': 'school',
            'hospital': 'hospital',
            'police': 'police'
        };
        return mapping[tileType] || 'park';
    }

    // 交差点を検出
    findIntersections(roads) {
        const intersections = [];
        
        for (let i = 0; i < roads.length; i++) {
            for (let j = i + 1; j < roads.length; j++) {
                const intersection = this.findRoadIntersection(roads[i], roads[j]);
                if (intersection) {
                    intersections.push(intersection);
                }
            }
        }
        
        return intersections;
    }

    // 2つの道路の交差点を計算
    findRoadIntersection(road1, road2) {
        const x1 = road1.start.x;
        const y1 = road1.start.z;
        const x2 = road1.end.x;
        const y2 = road1.end.z;
        const x3 = road2.start.x;
        const y3 = road2.start.z;
        const x4 = road2.end.x;
        const y4 = road2.end.z;

        const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denominator) < 0.001) return null;

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                z: y1 + t * (y2 - y1)
            };
        }
        return null;
    }

    // グリッド座標をMESA座標に変換
    gridToMesaCoords(gridX, gridY) {
        // エディタのグリッド座標（0 ～ gridSize-1）をMESA座標に変換
        // エディタの中心(gridSize/2, gridSize/2)をMESAの中心(0, 0)に対応
        const centerX = this.gridSize / 2;
        const centerY = this.gridSize / 2;
        
        // 中心からの相対位置を計算し、スケールファクターを適用
        const mesaX = (gridX - centerX) * this.scaleFactor;
        const mesaZ = (gridY - centerY) * this.scaleFactor;
        
        return { x: mesaX, z: mesaZ };
    }

    // 方向を回転角に変換（Y回転、ラジアン）
    directionToRotation(dir) {
        switch (dir) {
            case 'up': return Math.PI;      // 住宅の向き修正
            case 'right': return -Math.PI / 2;
            case 'down': return 0;
            case 'left': return Math.PI / 2;
            default: return 0;
        }
    }

    // エディタデータの統計情報を取得
    getStatistics() {
        if (!this.gridData) return null;

        const stats = {
            totalCells: this.gridSize * this.gridSize,
            tileCounts: {},
            buildingCounts: {},
            facilityCounts: {}
        };

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const tileType = this.gridData[y][x];
                stats.tileCounts[tileType] = (stats.tileCounts[tileType] || 0) + 1;
                
                if (this.isBuildingTile(tileType)) {
                    stats.buildingCounts[tileType] = (stats.buildingCounts[tileType] || 0) + 1;
                }
                if (this.isFacilityTile(tileType)) {
                    stats.facilityCounts[tileType] = (stats.facilityCounts[tileType] || 0) + 1;
                }
            }
        }

        return stats;
    }
}

// グローバル変数に追加
window.MapEditorLoader = MapEditorLoader;
