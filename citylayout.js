// 道路と建物の配置を管理するクラス
class CityLayout {
    constructor() {
        this.roads = [];
        this.buildings = [];
        this.intersections = [];
        this.gridSize = 150;
        this.roadWidth = 2;
        this.buildingSize = 4;
        this.minBuildingDistance = 6;
        this.blockSize = 10; // 街区のサイズ
        this.shortRoadRatio = 0.4; // 短い道路を生やす割合（0.0〜1.0）
        
        // 建物サイズの定義
        this.buildingSizes = {
            large: this.buildingSize * 2,    // 大：公園、学校、スーパーなど
            medium: this.buildingSize,       // 中：ファミレス、商店など
            small: this.buildingSize * 0.5   // 小：個人の自宅など
        };
    }

    // 道路の生成
    generateRoads() {
        // メインストリート（大通り）
        const mainStreets = this.generateMainStreets();
        
        // サブストリート（小道）
        const subStreets = this.generateSubStreets(mainStreets);
        
        this.roads = [...mainStreets, ...subStreets];
        this.findIntersections();
        // 短い道路を追加
        this.addShortRoads();
        
        // 建物を生成
        this.generateBuildings();
        
        // 施設を生成
        this.facilities = this.generateFacilities();
    }

    // メインストリートの生成
    generateMainStreets() {
        const mainStreets = [];
        const numMainStreets = 3; // メインストリートの本数
        const spacing = this.gridSize / (numMainStreets + 1);

        // 東西方向のメインストリート
        for (let i = 1; i <= numMainStreets; i++) {
            const z = -this.gridSize/2 + spacing * i;
            mainStreets.push({
                start: { x: -this.gridSize/2, z: z },
                end: { x: this.gridSize/2, z: z },
                type: 'main',
                isMain: Math.random() < 0.2 // 20%の確率で主要道路
            });
        }

        // 南北方向のメインストリート
        for (let i = 1; i <= numMainStreets; i++) {
            const x = -this.gridSize/2 + spacing * i;
            mainStreets.push({
                start: { x: x, z: -this.gridSize/2 },
                end: { x: x, z: this.gridSize/2 },
                type: 'main',
                isMain: Math.random() < 0.2
            });
        }

        return mainStreets;
    }

    // サブストリートの生成
    generateSubStreets(mainStreets) {
        const subStreets = [];
        const blockSize = this.blockSize;

        // メインストリートで区切られた各ブロック内にサブストリートを生成
        for (let i = 0; i < mainStreets.length; i++) {
            for (let j = i + 1; j < mainStreets.length; j++) {
                const street1 = mainStreets[i];
                const street2 = mainStreets[j];

                // 同じ方向の道路はスキップ
                if (this.isParallel(street1, street2)) continue;

                // 交差点を計算
                const intersection = this.findRoadIntersection(street1, street2);
                if (!intersection) continue;

                // ブロックの範囲を計算
                const blockBounds = this.calculateBlockBounds(street1, street2, intersection, mainStreets);
                if (!blockBounds) continue;

                // ブロック内にサブストリートを生成
                const blockSubStreets = this.generateBlockSubStreets(blockBounds);
                // サブストリートも20%で主要道路に
                blockSubStreets.forEach(street => {
                    street.isMain = Math.random() < 0.2;
                });
                subStreets.push(...blockSubStreets);
            }
        }

        return subStreets;
    }

    // 2つの道路が平行かどうかを判定
    isParallel(road1, road2) {
        const dx1 = road1.end.x - road1.start.x;
        const dz1 = road1.end.z - road1.start.z;
        const dx2 = road2.end.x - road2.start.x;
        const dz2 = road2.end.z - road2.start.z;

        // 方向ベクトルの外積が0なら平行
        return Math.abs(dx1 * dz2 - dx2 * dz1) < 0.001;
    }

    // ブロックの境界を計算
    calculateBlockBounds(street1, street2, intersection, mainStreets) {
        // 交差点から最も近い他のメインストリートとの交点を探す
        const otherIntersections = [];
        
        for (const street of mainStreets) {
            if (street === street1 || street === street2) continue;
            const otherIntersection = this.findRoadIntersection(street1, street);
            if (otherIntersection) otherIntersections.push(otherIntersection);
        }

        if (otherIntersections.length < 2) return null;

        // 最も近い2つの交点を選択
        otherIntersections.sort((a, b) => {
            const distA = Math.hypot(a.x - intersection.x, a.z - intersection.z);
            const distB = Math.hypot(b.x - intersection.x, b.z - intersection.z);
            return distA - distB;
        });

        return {
            minX: Math.min(intersection.x, otherIntersections[0].x),
            maxX: Math.max(intersection.x, otherIntersections[0].x),
            minZ: Math.min(intersection.z, otherIntersections[0].z),
            maxZ: Math.max(intersection.z, otherIntersections[0].z)
        };
    }

    // ブロック内のサブストリートを生成
    generateBlockSubStreets(blockBounds) {
        const subStreets = [];
        const { minX, maxX, minZ, maxZ } = blockBounds;
        const blockWidth = maxX - minX;
        const blockDepth = maxZ - minZ;

        // ブロックが十分な大きさの場合のみサブストリートを生成
        if (blockWidth > this.blockSize && blockDepth > this.blockSize) {
            // 東西方向のサブストリート
            const numEastWest = Math.floor(blockDepth / this.blockSize);
            for (let i = 1; i < numEastWest; i++) {
                const z = minZ + (blockDepth * i / numEastWest);
                subStreets.push({
                    start: { x: minX, z: z },
                    end: { x: maxX, z: z },
                    type: 'sub'
                });
            }

            // 南北方向のサブストリート
            const numNorthSouth = Math.floor(blockWidth / this.blockSize);
            for (let i = 1; i < numNorthSouth; i++) {
                const x = minX + (blockWidth * i / numNorthSouth);
                subStreets.push({
                    start: { x: x, z: minZ },
                    end: { x: x, z: maxZ },
                    type: 'sub'
                });
            }
        }

        return subStreets;
    }

    // 交差点の検出
    findIntersections() {
        this.intersections = [];
        for (let i = 0; i < this.roads.length; i++) {
            for (let j = i + 1; j < this.roads.length; j++) {
                const intersection = this.findRoadIntersection(this.roads[i], this.roads[j]);
                if (intersection) {
                    this.intersections.push(intersection);
                }
            }
        }
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
        if (denominator === 0) return null;

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

    // 道路上の点を取得
    getRoadPoints(road) {
        const points = [];
        const steps = 100;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            points.push({
                x: road.start.x + (road.end.x - road.start.x) * t,
                z: road.start.z + (road.end.z - road.start.z) * t
            });
        }
        return points;
    }

    // 建物の位置が有効かチェック
    isValidBuildingPosition(x, z) {
        // 道路との最小距離をチェック
        for (const road of this.roads) {
            const distance = this.pointToLineDistance(x, z, road);
            if (distance < this.roadWidth + this.buildingSize/2) {
                return false;
            }
        }
        return true;
    }

    // 点と線分の距離を計算
    pointToLineDistance(x, z, road) {
        const x1 = road.start.x;
        const y1 = road.start.z;
        const x2 = road.end.x;
        const y2 = road.end.z;

        const A = x - x1;
        const B = z - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;

        if (len_sq !== 0) {
            param = dot / len_sq;
        }

        let xx, zz;

        if (param < 0) {
            xx = x1;
            zz = y1;
        } else if (param > 1) {
            xx = x2;
            zz = y2;
        } else {
            xx = x1 + param * C;
            zz = y1 + param * D;
        }

        const dx = x - xx;
        const dz = z - zz;

        return Math.sqrt(dx * dx + dz * dz);
    }

    // 最も近い道路上の点を見つける
    findNearestRoadPoint(x, z) {
        let minDistance = Infinity;
        let nearestPoint = null;

        for (const road of this.roads) {
            const points = this.getRoadPoints(road);
            for (const point of points) {
                const distance = Math.sqrt(
                    Math.pow(x - point.x, 2) + 
                    Math.pow(z - point.z, 2)
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestPoint = point;
                }
            }
        }

        return nearestPoint;
    }

    // 2点間の経路を計算（A*アルゴリズムを使用）
    findPath(start, end) {
        // 開始点と終了点から最も近い道路上の点を見つける
        const startRoadPoint = this.findNearestRoadPoint(start.x, start.z);
        const endRoadPoint = this.findNearestRoadPoint(end.x, end.z);

        if (!startRoadPoint || !endRoadPoint) {
            return null;
        }

        // A*アルゴリズムで経路を計算
        const path = this.aStarPathfinding(startRoadPoint, endRoadPoint);
        
        if (path && path.length > 0) {
            // 開始点と終了点を追加
            path.unshift(start);
            path.push(end);
        }

        return path;
    }

    // A*アルゴリズムによる経路探索
    aStarPathfinding(start, end) {
        const openSet = [start];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        // 初期化
        gScore.set(this.pointToString(start), 0);
        fScore.set(this.pointToString(start), this.heuristic(start, end));

        while (openSet.length > 0) {
            // fScoreが最小のノードを選択
            let current = openSet.reduce((min, node) => {
                const currentF = fScore.get(this.pointToString(node)) || Infinity;
                const minF = fScore.get(this.pointToString(min)) || Infinity;
                return currentF < minF ? node : min;
            });

            // 目的地に到達
            if (this.pointDistance(current, end) < 1.0) {
                return this.reconstructPath(cameFrom, current);
            }

            // 現在のノードを処理済みに
            openSet.splice(openSet.indexOf(current), 1);
            closedSet.add(this.pointToString(current));

            // 隣接ノードを探索
            const neighbors = this.getRoadNeighbors(current);
            for (const neighbor of neighbors) {
                const neighborStr = this.pointToString(neighbor);
                
                if (closedSet.has(neighborStr)) {
                    continue;
                }

                const tentativeGScore = (gScore.get(this.pointToString(current)) || Infinity) + 
                                       this.pointDistance(current, neighbor);

                if (!openSet.some(node => this.pointDistance(node, neighbor) < 0.1)) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= (gScore.get(neighborStr) || Infinity)) {
                    continue;
                }

                cameFrom.set(neighborStr, current);
                gScore.set(neighborStr, tentativeGScore);
                fScore.set(neighborStr, tentativeGScore + this.heuristic(neighbor, end));
            }
        }

        // 経路が見つからない場合は直線経路を返す
        return [start, end];
    }

    // 道路上の隣接点を取得
    getRoadNeighbors(point) {
        const neighbors = [];
        const searchRadius = 15; // 隣接点を探す半径

        // 交差点を隣接点として追加
        for (const intersection of this.intersections) {
            const distance = this.pointDistance(point, intersection);
            if (distance <= searchRadius && distance > 0.1) {
                neighbors.push(intersection);
            }
        }

        // 同じ道路上の近い点を隣接点として追加
        for (const road of this.roads) {
            const roadPoints = this.getRoadPoints(road);
            for (const roadPoint of roadPoints) {
                const distance = this.pointDistance(point, roadPoint);
                if (distance <= searchRadius && distance > 0.1) {
                    // 同じ道路上にあるかチェック
                    const distToRoad = this.pointToLineDistance(roadPoint.x, roadPoint.z, road);
                    if (distToRoad < 0.5) {
                        neighbors.push(roadPoint);
                    }
                }
            }
        }

        return neighbors;
    }

    // ヒューリスティック関数（直線距離）
    heuristic(point1, point2) {
        return this.pointDistance(point1, point2);
    }

    // 2点間の距離を計算
    pointDistance(point1, point2) {
        return Math.sqrt(
            Math.pow(point1.x - point2.x, 2) + 
            Math.pow(point1.z - point2.z, 2)
        );
    }

    // 点を文字列に変換（Mapのキーとして使用）
    pointToString(point) {
        return `${point.x.toFixed(1)},${point.z.toFixed(1)}`;
    }

    // 経路を再構築
    reconstructPath(cameFrom, current) {
        const path = [current];
        let currentStr = this.pointToString(current);
        
        while (cameFrom.has(currentStr)) {
            current = cameFrom.get(currentStr);
            path.unshift(current);
            currentStr = this.pointToString(current);
        }
        
        return path;
    }

    // 中間点を見つける（既存の関数を保持）
    findIntermediatePoint(start, end) {
        // 開始点と終了点が同じ道路上にある場合は中間点は不要
        if (this.arePointsOnSameRoad(start, end)) {
            return null;
        }

        // 最も近い交差点を探す
        let nearestIntersection = null;
        let minDistance = Infinity;

        for (const intersection of this.intersections) {
            const distance = Math.sqrt(
                Math.pow(start.x - intersection.x, 2) + 
                Math.pow(start.z - intersection.z, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearestIntersection = intersection;
            }
        }

        return nearestIntersection;
    }

    // 2点が同じ道路上にあるかチェック
    arePointsOnSameRoad(point1, point2) {
        for (const road of this.roads) {
            const dist1 = this.pointToLineDistance(point1.x, point1.z, road);
            const dist2 = this.pointToLineDistance(point2.x, point2.z, road);
            if (dist1 < 0.1 && dist2 < 0.1) {
                return true;
            }
        }
        return false;
    }

    // 短い道路を主要道路から生やす
    addShortRoads() {
        const shortRoads = [];
        const shortWidth = this.roadWidth * 0.25;
        const shortLength = this.gridSize * 0.08; // 短い道路の長さをさらに短縮
        
        console.log(`短い道路生成開始: 元の道路数 = ${this.roads.length}`);
        
        // すべての道路から短い道路を生やす
        this.roads.forEach((road, index) => {
            console.log(`道路 ${index}: ${road.type}, 長さ = ${Math.sqrt(Math.pow(road.end.x - road.start.x, 2) + Math.pow(road.end.z - road.start.z, 2))}`);
            
            // 道路の方向を計算
            const roadDirX = road.end.x - road.start.x;
            const roadDirZ = road.end.z - road.start.z;
            const roadLength = Math.sqrt(roadDirX * roadDirX + roadDirZ * roadDirZ);
            
            // 道路に垂直な方向を計算
            const perpDirX = -roadDirZ / roadLength;
            const perpDirZ = roadDirX / roadLength;
            
            // 道路の複数ポイントから短い道路を生やす
            const numPoints = 3; // 道路を3分割
            for (let i = 1; i < numPoints; i++) {
                const t = i / numPoints;
                const pointX = road.start.x + roadDirX * t;
                const pointZ = road.start.z + roadDirZ * t;
                
                // 両方向（+と-）に短い道路を生やす
                const directions = [
                    { x: perpDirX, z: perpDirZ },
                    { x: -perpDirX, z: -perpDirZ }
                ];
                
                directions.forEach((dir, dirIndex) => {
                    // 確率を上げて短い道路を生成
                    const randomValue = Math.random();
                    console.log(`  ポイント ${i}, 方向 ${dirIndex}: 乱数 = ${randomValue.toFixed(3)}, 閾値 = ${this.shortRoadRatio}`);
                    
                    if (randomValue < this.shortRoadRatio) {
                        console.log(`    短い道路生成試行`);
                        
                        // フィールドの境界をチェック
                        const boundaryX = this.gridSize / 2;
                        const boundaryZ = this.gridSize / 2;
                        
                        // 方向に応じて最大長さを制限
                        let maxLength = shortLength;
                        if (dir.x > 0) maxLength = Math.min(maxLength, boundaryX - pointX);
                        if (dir.x < 0) maxLength = Math.min(maxLength, pointX + boundaryX);
                        if (dir.z > 0) maxLength = Math.min(maxLength, boundaryZ - pointZ);
                        if (dir.z < 0) maxLength = Math.min(maxLength, pointZ + boundaryZ);
                        
                        // 他の道路との交差をチェック
                        const step = maxLength / 10;
                        let safeLength = 0;
                        
                        for (let t = step; t <= maxLength; t += step) {
                            const testX = pointX + dir.x * t;
                            const testZ = pointZ + dir.z * t;
                            
                            // 他の道路との最短距離をチェック
                            let tooClose = false;
                            for (const other of this.roads) {
                                if (other === road) continue;
                                const dist = this.pointToLineDistance(testX, testZ, other);
                                if (dist < this.roadWidth * 2.5) {
                                    tooClose = true;
                                    console.log(`      他の道路と近すぎる: 距離 = ${dist.toFixed(2)}`);
                                    break;
                                }
                            }
                            
                            if (tooClose) {
                                break;
                            }
                            
                            safeLength = t;
                        }
                        
                        // 安全な長さが確保できない場合は、最小限の長さで強制的に生成
                        if (safeLength === 0) {
                            safeLength = this.roadWidth * 2; // 最小限の長さ
                            console.log(`      強制的に最小長さで生成: ${safeLength}`);
                        }
                        
                        // 終点を設定
                        const endX = pointX + dir.x * safeLength;
                        const endZ = pointZ + dir.z * safeLength;
                        
                        // 最低限の長さがある場合のみ追加
                        const actualLength = Math.sqrt(Math.pow(endX - pointX, 2) + Math.pow(endZ - pointZ, 2));
                        const minLength = this.roadWidth * 1.5; // 最小長さを道路幅の1.5倍に設定
                        console.log(`      実際の長さ = ${actualLength.toFixed(2)}, 最小長さ = ${minLength.toFixed(2)}`);
                        
                        if (actualLength > minLength) {
                            shortRoads.push({
                                start: { x: pointX, z: pointZ },
                                end: { x: endX, z: endZ },
                                type: 'short',
                                isMain: false,
                                isShort: true,
                                width: shortWidth
                            });
                            console.log(`      短い道路追加成功`);
                        } else {
                            console.log(`      短すぎるため除外`);
                        }
                    }
                });
            }
        });
        
        // 短い道路を追加
        this.roads.push(...shortRoads);
        console.log(`短い道路を ${shortRoads.length} 本生成しました`);
    }

    // 道路の描画を修正
    drawRoads() {
        this.roads.forEach(road => {
            const dx = road.end.x - road.start.x;
            const dz = road.end.z - road.start.z;
            const length = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dz, dx);
            // 主要道路は幅2倍、短い道路は1/4幅
            let roadWidth = this.roadWidth;
            if (road.isMain) roadWidth = this.roadWidth * 2;
            if (road.isShort) roadWidth = this.roadWidth * 0.25;
            const geometry = new THREE.PlaneGeometry(length, roadWidth, Math.ceil(length), 2);
            const edges = new THREE.EdgesGeometry(geometry);
            const material = new THREE.LineBasicMaterial({ color: 0x87ceeb });
            const line = new THREE.LineSegments(edges, material);
            line.position.set(
                (road.start.x + road.end.x) / 2,
                0.12,
                (road.start.z + road.end.z) / 2
            );
            line.rotation.x = -Math.PI / 2;
            line.rotation.z = angle;
            scene.add(line);
        });
    }

    // 建物の配置を道路の位置関係を考慮して生成
    generateBuildings() {
        this.buildings = [];
        const intersectionBuffer = this.buildingSize * 2; // 交差点からの最小距離
        
        console.log(`建物生成開始: 道路数 = ${this.roads.length}`);
        
        // 各道路に沿って建物を配置
        this.roads.forEach((road, roadIndex) => {
            console.log(`道路 ${roadIndex} に沿って建物を配置`);
            
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
                // 道路に沿って建物を配置するポイントを計算（最小サイズで計算）
                const minBuildingSpacing = this.buildingSizes.small + this.minBuildingDistance;
                const numBuildings = Math.floor(roadLength / minBuildingSpacing);
                
                for (let i = 0; i < numBuildings; i++) {
                    // 道路に沿った位置
                    const roadT = (i + 0.5) / numBuildings;
                    const roadX = road.start.x + roadDirX * roadT;
                    const roadZ = road.start.z + roadDirZ * roadT;
                    
                    // 交差点からの距離をチェック
                    let tooCloseToIntersection = false;
                    for (const intersection of this.intersections) {
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
                        console.log(`  交差点に近すぎるため除外: (${roadX.toFixed(1)}, ${roadZ.toFixed(1)})`);
                        continue;
                    }
                    
                    // 建物タイプを決定
                    const buildingType = this.getRandomBuildingType();
                    const buildingSize = this.getBuildingSizeByType(buildingType);
                    
                    // 道路から建物までの距離を計算（道路に接するように）
                    const roadWidth = road.isMain ? this.roadWidth * 2 : road.isShort ? this.roadWidth * 0.25 : this.roadWidth;
                    const buildingDistance = roadWidth + buildingSize/2 + this.minBuildingDistance * 0.5; // 距離を短縮
                    let buildingX = roadX + side.x * buildingDistance;
                    let buildingZ = roadZ + side.z * buildingDistance;
                    
                    // 建物が実際に道路に接しているかチェック
                    let distanceToRoad = this.pointToLineDistance(buildingX, buildingZ, road);
                    const maxDistanceToRoad = roadWidth + buildingSize/2 + this.minBuildingDistance;
                    
                    // 建物が道路から離れすぎている場合、位置を調整
                    if (distanceToRoad > maxDistanceToRoad) {
                        console.log(`  建物位置を調整: 元の距離=${distanceToRoad.toFixed(2)}`);
                        
                        // 建物を道路に近づける
                        const adjustmentFactor = maxDistanceToRoad / distanceToRoad;
                        const adjustedDistance = buildingDistance * adjustmentFactor;
                        buildingX = roadX + side.x * adjustedDistance;
                        buildingZ = roadZ + side.z * adjustedDistance;
                        
                        // 調整後の距離を再計算
                        distanceToRoad = this.pointToLineDistance(buildingX, buildingZ, road);
                        console.log(`  調整後: 新しい距離=${distanceToRoad.toFixed(2)}`);
                    }
                    
                    // 建物の位置が有効かチェック
                    if (this.isValidBuildingPosition(buildingX, buildingZ)) {
                        // 他の建物との重複をチェック
                        if (!this.isBuildingOverlapping(buildingX, buildingZ, buildingSize)) {
                            // 建物の向きを道路の方向に向ける（入り口が道路を向くように）
                            const buildingRotation = Math.atan2(roadDirX, roadDirZ);
                            
                            this.buildings.push({
                                x: buildingX,
                                z: buildingZ,
                                type: buildingType,
                                size: buildingSize,
                                rotation: buildingRotation, // 建物の向き（道路方向）
                                roadIndex: roadIndex, // どの道路に接しているか
                                side: sideIndex, // 道路のどちら側か
                                distanceToRoad: distanceToRoad // 道路からの距離
                            });
                            console.log(`  建物配置成功: ${buildingType} (${buildingX.toFixed(1)}, ${buildingZ.toFixed(1)}) サイズ: ${buildingSize} 道路距離: ${distanceToRoad.toFixed(2)} 向き: ${(buildingRotation * 180 / Math.PI).toFixed(1)}°`);
                        } else {
                            console.log(`  建物重複のため除外: (${buildingX.toFixed(1)}, ${buildingZ.toFixed(1)})`);
                        }
                    } else {
                        console.log(`  無効な位置のため除外: (${buildingX.toFixed(1)}, ${buildingZ.toFixed(1)})`);
                    }
                }
            });
        });
        
        console.log(`建物生成完了: ${this.buildings.length} 棟配置`);
    }
    
    // 建物の重複チェック
    isBuildingOverlapping(x, z, buildingSize) {
        for (const building of this.buildings) {
            const distance = Math.sqrt(
                Math.pow(x - building.x, 2) + 
                Math.pow(z - building.z, 2)
            );
            if (distance < buildingSize + this.minBuildingDistance) {
                return true;
            }
        }
        return false;
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
            
            // 中サイズの建物
            'shop': 'medium',
            'restaurant': 'medium',
            'office': 'medium',
            'cafe': 'medium',
            'bank': 'medium',
            'post_office': 'medium',
            
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
            
            // 中サイズの建物（商業施設）
            'shop': 0xFF69B4,        // ピンク
            'restaurant': 0xFF4500,  // オレンジ
            'office': 0x808080,      // グレー
            'cafe': 0x8B4513,        // 茶色
            'bank': 0x32CD32,        // ライムグリーン
            'post_office': 0x4169E1, // ロイヤルブルー
            
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
            
            // デバッグ用：建物から道路への接続線を表示（道路距離が大きい場合）
            if (building.distanceToRoad > this.roadWidth + building.size/2 + this.minBuildingDistance * 0.8) {
                const road = this.roads[building.roadIndex];
                const roadDirX = road.end.x - road.start.x;
                const roadDirZ = road.end.z - road.start.z;
                const roadLength = Math.sqrt(roadDirX * roadDirX + roadDirZ * roadDirZ);
                
                // 建物から最も近い道路上の点を計算
                const roadT = Math.max(0, Math.min(1, 
                    ((building.x - road.start.x) * roadDirX + (building.z - road.start.z) * roadDirZ) / (roadLength * roadLength)
                ));
                const nearestRoadX = road.start.x + roadDirX * roadT;
                const nearestRoadZ = road.start.z + roadDirZ * roadT;
                
                // 接続線を描画
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(building.x, building.size/2, building.z),
                    new THREE.Vector3(nearestRoadX, 0.1, nearestRoadZ)
                ]);
                const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
                const line = new THREE.Line(lineGeometry, lineMaterial);
                scene.add(line);
            }
            
            scene.add(mesh);
        });
    }

    // 施設の配置を道路の位置関係を考慮して生成
    generateFacilities() {
        const facilities = [];
        const facilityTypes = [
            'カフェ', '公園', '図書館', 'スポーツジム', '町の広場', 
            '学校', '病院', 'スーパーマーケット', 'ファミレス'
        ];
        
        console.log(`施設生成開始: 道路数 = ${this.roads.length}`);
        
        // 各道路に沿って施設を配置
        this.roads.forEach((road, roadIndex) => {
            console.log(`道路 ${roadIndex} に沿って施設を配置`);
            
            // 道路の方向を計算
            const roadDirX = road.end.x - road.start.x;
            const roadDirZ = road.end.z - road.start.z;
            const roadLength = Math.sqrt(roadDirX * roadDirX + roadDirZ * roadDirZ);
            
            // 道路に垂直な方向を計算
            const perpDirX = -roadDirZ / roadLength;
            const perpDirZ = roadDirX / roadLength;
            
            // 道路の両側に施設を配置
            const sides = [
                { x: perpDirX, z: perpDirZ },   // 道路の片側
                { x: -perpDirX, z: -perpDirZ }  // 道路の反対側
            ];
            
            sides.forEach((side, sideIndex) => {
                // 道路に沿って施設を配置するポイントを計算
                const numFacilities = Math.floor(roadLength / (this.buildingSize * 3)); // 施設は建物より間隔を広く
                
                for (let i = 0; i < numFacilities; i++) {
                    // 道路に沿った位置
                    const roadT = (i + 0.5) / numFacilities;
                    const roadX = road.start.x + roadDirX * roadT;
                    const roadZ = road.start.z + roadDirZ * roadT;
                    
                    // 道路から離れた施設の位置
                    const facilityDistance = this.roadWidth + this.buildingSize + this.minBuildingDistance * 2;
                    const facilityX = roadX + side.x * facilityDistance;
                    const facilityZ = roadZ + side.z * facilityDistance;
                    
                    // 施設の位置が有効かチェック
                    if (this.isValidBuildingPosition(facilityX, facilityZ)) {
                        // 他の建物・施設との重複をチェック
                        if (!this.isBuildingOverlapping(facilityX, facilityZ, this.buildingSize) && !this.isFacilityOverlapping(facilityX, facilityZ, facilities)) {
                            const facilityType = facilityTypes[Math.floor(Math.random() * facilityTypes.length)];
                            facilities.push({
                                name: facilityType,
                                x: facilityX,
                                z: facilityZ,
                                type: 'facility',
                                size: this.buildingSize * 1.5, // 施設は建物より大きい
                                rotation: Math.atan2(roadDirX, roadDirZ), // 施設の向き（道路方向）
                                roadIndex: roadIndex // どの道路に接しているか
                            });
                            console.log(`  施設配置成功: ${facilityType} (${facilityX.toFixed(1)}, ${facilityZ.toFixed(1)}) 向き: ${(Math.atan2(roadDirX, roadDirZ) * 180 / Math.PI).toFixed(1)}°`);
                        } else {
                            console.log(`  施設重複のため除外: (${facilityX.toFixed(1)}, ${facilityZ.toFixed(1)})`);
                        }
                    } else {
                        console.log(`  無効な位置のため除外: (${facilityX.toFixed(1)}, ${facilityZ.toFixed(1)})`);
                    }
                }
            });
        });
        
        console.log(`施設生成完了: ${facilities.length} 施設配置`);
        return facilities;
    }
    
    // 施設の重複チェック
    isFacilityOverlapping(x, z, facilities) {
        for (const facility of facilities) {
            const distance = Math.sqrt(
                Math.pow(x - facility.x, 2) + 
                Math.pow(z - facility.z, 2)
            );
            if (distance < this.buildingSize * 3) { // 施設間はより広い間隔
                return true;
            }
        }
        return false;
    }

    // 施設の描画
    drawFacilities() {
        this.facilities.forEach(facility => {
            const geometry = new THREE.BoxGeometry(facility.size, facility.size, facility.size);
            const edges = new THREE.EdgesGeometry(geometry);
            const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
            const mesh = new THREE.LineSegments(edges, material);
            mesh.position.set(facility.x, facility.size/2, facility.z);
            
            // 施設の向きを設定（入り口が道路に向くように）
            if (facility.rotation !== undefined) {
                mesh.rotation.y = facility.rotation;
            }
            
            scene.add(mesh);
            
            // 施設名の表示
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 64;
            context.fillStyle = 'white';
            context.font = '24px Arial';
            context.fillText(facility.name, 10, 40);
            
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.set(facility.x, facility.size + 1, facility.z);
            sprite.scale.set(2, 0.5, 1);
            scene.add(sprite);
            
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

    // 道路経路の視覚化
    visualizePath(path, color = 0x00ff00) {
        // 既存の経路表示を削除
        this.clearPathVisualization();
        
        if (!path || path.length < 2) return;
        
        // 経路の線を作成
        const points = [];
        for (const point of path) {
            points.push(new THREE.Vector3(point.x, 0.1, point.z));
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: color, 
            linewidth: 3,
            transparent: true,
            opacity: 0.8
        });
        
        this.pathLine = new THREE.Line(geometry, material);
        scene.add(this.pathLine);
        
        // 経路ポイントを表示
        this.pathPoints = [];
        for (let i = 0; i < path.length; i++) {
            const point = path[i];
            const geometry = new THREE.SphereGeometry(0.3, 8, 8);
            const material = new THREE.MeshBasicMaterial({ 
                color: i === 0 ? 0xff0000 : i === path.length - 1 ? 0x0000ff : color,
                transparent: true,
                opacity: 0.7
            });
            
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(point.x, 0.2, point.z);
            scene.add(sphere);
            this.pathPoints.push(sphere);
        }
    }
    
    // 経路表示をクリア
    clearPathVisualization() {
        if (this.pathLine) {
            scene.remove(this.pathLine);
            this.pathLine.geometry.dispose();
            this.pathLine.material.dispose();
            this.pathLine = null;
        }
        
        if (this.pathPoints) {
            for (const point of this.pathPoints) {
                scene.remove(point);
                point.geometry.dispose();
                point.material.dispose();
            }
            this.pathPoints = [];
        }
    }
    
    // 道路ネットワークの視覚化（デバッグ用）
    visualizeRoadNetwork() {
        this.clearRoadNetworkVisualization();
        
        // 交差点を表示
        this.intersectionPoints = [];
        for (const intersection of this.intersections) {
            const geometry = new THREE.SphereGeometry(0.5, 8, 8);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0xffff00,
                transparent: true,
                opacity: 0.6
            });
            
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(intersection.x, 0.3, intersection.z);
            scene.add(sphere);
            this.intersectionPoints.push(sphere);
        }
        
        // 道路の中心線を表示
        this.roadCenterLines = [];
        for (const road of this.roads) {
            const points = this.getRoadPoints(road);
            if (points.length >= 2) {
                const linePoints = points.map(p => new THREE.Vector3(p.x, 0.05, p.z));
                const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                const material = new THREE.LineBasicMaterial({ 
                    color: road.isMain ? 0xff8800 : road.isShort ? 0x888888 : 0x00ff88,
                    linewidth: 2,
                    transparent: true,
                    opacity: 0.5
                });
                
                const line = new THREE.Line(geometry, material);
                scene.add(line);
                this.roadCenterLines.push(line);
            }
        }
    }
    
    // 道路ネットワーク表示をクリア
    clearRoadNetworkVisualization() {
        if (this.intersectionPoints) {
            for (const point of this.intersectionPoints) {
                scene.remove(point);
                point.geometry.dispose();
                point.material.dispose();
            }
            this.intersectionPoints = [];
        }
        
        if (this.roadCenterLines) {
            for (const line of this.roadCenterLines) {
                scene.remove(line);
                line.geometry.dispose();
                line.material.dispose();
            }
            this.roadCenterLines = [];
        }
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
    
    // 建物への経路を計算（入り口経由）
    findPathToBuilding(start, building) {
        // 建物の入り口位置を取得
        const entrance = this.getBuildingEntrance(building);
        
        // 現在位置から入り口までの経路を計算
        const pathToEntrance = this.findPath(start, entrance);
        
        if (pathToEntrance && pathToEntrance.length > 0) {
            // 入り口から建物内の中心までの経路を追加
            const buildingCenter = this.getBuildingCenter(building);
            
            // 入り口から建物内への直接経路を追加
            pathToEntrance.push(entrance); // 入り口位置を追加
            pathToEntrance.push(buildingCenter); // 建物内の中心を追加
            
            return pathToEntrance;
        }
        
        // 経路が見つからない場合は直線経路を作成
        const directPath = [
            start,
            entrance,
            this.getBuildingCenter(building)
        ];
        
        return directPath;
    }
}

// グローバル変数に追加
let cityLayout;