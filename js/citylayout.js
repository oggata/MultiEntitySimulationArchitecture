// 道路と建物の配置を管理するクラス
class CityLayout {
    constructor() {
        this.roads = [];
        this.buildings = [];
        this.intersections = [];
        
        // config.jsから設定を読み込み
        this.gridSize = cityLayoutConfig.gridSize;
        this.roadWidth = cityLayoutConfig.roadWidth;
        this.buildingSize = cityLayoutConfig.buildingSize;
        this.minBuildingDistance = cityLayoutConfig.minBuildingDistance;
        this.blockSize = cityLayoutConfig.blockSize;
        this.shortRoadRatio = cityLayoutConfig.shortRoadRatio;
        
        // 建物サイズの定義
        this.buildingSizes = cityLayoutConfig.buildingSizes;
    }

    // 道路の生成
    generateRoads() {
        // メインストリート（大通り）
        const mainStreets = this.generateMainStreets();
        
        // サブストリート（小道）
        const subStreets = this.generateSubStreets(mainStreets);
        
        console.log(`道路生成完了: メインストリート=${mainStreets.length}本, サブストリート=${subStreets.length}本`);
        
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
        const numMainStreets = cityLayoutConfig.numMainStreets; // configから読み込み
        const spacing = this.gridSize / (numMainStreets + 1);
        
        console.log(`メインストリート生成開始: numMainStreets=${numMainStreets}, spacing=${spacing.toFixed(1)}`);

        // 東西方向のメインストリート
        for (let i = 1; i <= numMainStreets; i++) {
            const z = -this.gridSize/2 + spacing * i;
            const isMainStreet = i === 1 || i === numMainStreets; // 最初と最後の道路を主要道路に
            mainStreets.push({
                start: { x: -this.gridSize/2, z: z },
                end: { x: this.gridSize/2, z: z },
                type: 'main',
                isMain: isMainStreet
            });
            console.log(`東西方向メインストリート${i}: z=${z.toFixed(1)}, isMain=${isMainStreet}`);
        }

        // 南北方向のメインストリート
        for (let i = 1; i <= numMainStreets; i++) {
            const x = -this.gridSize/2 + spacing * i;
            const isMainStreet = i === 1 || i === numMainStreets; // 最初と最後の道路を主要道路に
            mainStreets.push({
                start: { x: x, z: -this.gridSize/2 },
                end: { x: x, z: this.gridSize/2 },
                type: 'main',
                isMain: isMainStreet
            });
            console.log(`南北方向メインストリート${i}: x=${x.toFixed(1)}, isMain=${isMainStreet}`);
        }
        
        console.log(`メインストリート生成完了: ${mainStreets.length}本`);
        return mainStreets;
    }

    // サブストリートの生成
    generateSubStreets(mainStreets) {
        const subStreets = [];
        const blockSize = this.blockSize;
        
        console.log(`サブストリート生成開始: メインストリート数=${mainStreets.length}, ブロックサイズ=${blockSize}`);

        // メインストリートで区切られた各ブロック内にサブストリートを生成
        for (let i = 0; i < mainStreets.length; i++) {
            for (let j = i + 1; j < mainStreets.length; j++) {
                const street1 = mainStreets[i];
                const street2 = mainStreets[j];

                // 同じ方向の道路はスキップ
                if (this.isParallel(street1, street2)) {
                    console.log(`平行な道路をスキップ: street${i}とstreet${j}`);
                    continue;
                }

                // 交差点を計算
                const intersection = this.findRoadIntersection(street1, street2);
                if (!intersection) {
                    console.log(`交差点が見つからない: street${i}とstreet${j}`);
                    continue;
                }

                // ブロックの範囲を計算
                const blockBounds = this.calculateBlockBounds(street1, street2, intersection, mainStreets);
                if (!blockBounds) {
                    console.log(`ブロック境界が計算できない: street${i}とstreet${j}`);
                    continue;
                }

                // ブロック内にサブストリートを生成
                const blockSubStreets = this.generateBlockSubStreets(blockBounds);
                console.log(`ブロック内サブストリート生成: ${blockSubStreets.length}本`);
                
                // サブストリートは通常道路として設定（主要道路はメインストリートのみ）
                blockSubStreets.forEach(street => {
                    street.isMain = false;
                });
                subStreets.push(...blockSubStreets);
            }
        }
        
        console.log(`サブストリート生成完了: ${subStreets.length}本`);
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
        
        console.log(`ブロックサイズ: ${blockWidth.toFixed(1)} x ${blockDepth.toFixed(1)}, 最小サイズ: ${this.blockSize}`);

        // ブロックが十分な大きさの場合のみサブストリートを生成
        if (blockWidth > this.blockSize && blockDepth > this.blockSize) {
            // 東西方向のサブストリート
            const numEastWest = Math.floor(blockDepth / this.blockSize);
            console.log(`東西方向サブストリート数: ${numEastWest}`);
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
            console.log(`南北方向サブストリート数: ${numNorthSouth}`);
            for (let i = 1; i < numNorthSouth; i++) {
                const x = minX + (blockWidth * i / numNorthSouth);
                subStreets.push({
                    start: { x: x, z: minZ },
                    end: { x: x, z: maxZ },
                    type: 'sub'
                });
            }
        } else {
            console.log(`ブロックが小さすぎるためサブストリートを生成しません`);
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
            const roadWidth = road.isMain ? this.roadWidth * 2 : road.isShort ? this.roadWidth * 0.25 : this.roadWidth;
            
            // 建物が道路の上に配置されていないかチェック（より厳しく）
            if (distance < roadWidth/2 + this.buildingSize/2 + this.minBuildingDistance * 0.5) {
                return false;
            }
        }
        return true;
    }

    // 点と線分の距離を計算（新しい実装）
    pointToLineDistance(x, z, road) {
        return this.calculateDistanceToRoadLine(x, z, road);
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
        let mainRoadCount = 0;
        let normalRoadCount = 0;
        let shortRoadCount = 0;
        
        this.roads.forEach(road => {
            const dx = road.end.x - road.start.x;
            const dz = road.end.z - road.start.z;
            const length = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dz, dx);
            
            // 道路の幅を決定
            let roadWidth = this.roadWidth;
            let roadColor = 0x444444; // すべての道路を主要道路と同じ色に統一
            
            if (road.isMain) {
                roadWidth = this.roadWidth * 3; // 主要道路は3倍の幅
            } else if (road.isShort) {
                roadWidth = this.roadWidth * 0.5; // 短い道路は半分の幅
            }
            
            // 道路の平面を作成
            const roadGeometry = new THREE.PlaneGeometry(length, roadWidth);
            const roadMaterial = new THREE.MeshBasicMaterial({ 
                color: roadColor,
                transparent: true,
                opacity: 0.8
            });
            const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
            roadMesh.position.set(
                (road.start.x + road.end.x) / 2,
                0.1, // 地面より少し上に配置
                (road.start.z + road.end.z) / 2
            );
            roadMesh.rotation.x = -Math.PI / 2;
            roadMesh.rotation.z = angle;
            scene.add(roadMesh);
            
            // 道路の境界線を追加
            const edges = new THREE.EdgesGeometry(roadGeometry);
            const lineMaterial = new THREE.LineBasicMaterial({ 
                color: 0x333333,
                linewidth: 1
            });
            const line = new THREE.LineSegments(edges, lineMaterial);
            line.position.copy(roadMesh.position);
            line.rotation.copy(roadMesh.rotation);
            scene.add(line);
            
            // 道路の種類をカウント
            if (road.isMain) {
                mainRoadCount++;
            } else if (road.isShort) {
                shortRoadCount++;
            } else {
                normalRoadCount++;
            }
        });
        
        console.log(`道路描画完了: 主要道路=${mainRoadCount}本, 通常道路=${normalRoadCount}本, 短い道路=${shortRoadCount}本`);
        
        // 入り口接続を通常の道路として描画
        this.drawEntranceConnectionsAsRoads();
    }
    
    // 入り口接続を通常の道路として描画
    drawEntranceConnectionsAsRoads() {
        // 建物の入り口接続を描画
        for (const building of this.buildings) {
            const connection = this.createEntranceConnection(building);
            if (connection) {
                const dx = connection.end.x - connection.start.x;
                const dz = connection.end.z - connection.start.z;
                const length = Math.sqrt(dx * dx + dz * dz);
                const angle = Math.atan2(dz, dx);
                
                // 入り口通路を道路として描画
                const roadGeometry = new THREE.PlaneGeometry(length, 1.5);
                const roadMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x444444,
                    transparent: true,
                    opacity: 0.8
                });
                const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
                roadMesh.position.set(
                    (connection.start.x + connection.end.x) / 2,
                    0.1, // 地面より少し上に配置
                    (connection.start.z + connection.end.z) / 2
                );
                roadMesh.rotation.x = -Math.PI / 2;
                roadMesh.rotation.z = angle;
                scene.add(roadMesh);
                
                // 道路の境界線を追加
                const edges = new THREE.EdgesGeometry(roadGeometry);
                const lineMaterial = new THREE.LineBasicMaterial({ 
                    color: 0x333333,
                    linewidth: 1
                });
                const line = new THREE.LineSegments(edges, lineMaterial);
                line.position.copy(roadMesh.position);
                line.rotation.copy(roadMesh.rotation);
                scene.add(line);
            }
        }
        
        // 施設の入り口接続を描画
        for (const facility of this.facilities) {
            const connection = this.createEntranceConnection(facility);
            if (connection) {
                const dx = connection.end.x - connection.start.x;
                const dz = connection.end.z - connection.start.z;
                const length = Math.sqrt(dx * dx + dz * dz);
                const angle = Math.atan2(dz, dx);
                
                // 入り口通路を道路として描画
                const roadGeometry = new THREE.PlaneGeometry(length, 2);
                const roadMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x444444,
                    transparent: true,
                    opacity: 0.8
                });
                const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
                roadMesh.position.set(
                    (connection.start.x + connection.end.x) / 2,
                    0.1, // 地面より少し上に配置
                    (connection.start.z + connection.end.z) / 2
                );
                roadMesh.rotation.x = -Math.PI / 2;
                roadMesh.rotation.z = angle;
                scene.add(roadMesh);
                
                // 道路の境界線を追加
                const edges = new THREE.EdgesGeometry(roadGeometry);
                const lineMaterial = new THREE.LineBasicMaterial({ 
                    color: 0x333333,
                    linewidth: 1
                });
                const line = new THREE.LineSegments(edges, lineMaterial);
                line.position.copy(roadMesh.position);
                line.rotation.copy(roadMesh.rotation);
                scene.add(line);
            }
        }
    }

    // citylayout.js の generateBuildings() メソッドの修正版

// 建物の配置を道路の位置関係を考慮して生成（修正版）
generateBuildings() {
    this.buildings = [];
    const intersectionBuffer = this.buildingSize * 3; // 交差点からの最小距離を増加
    
    console.log(`建物生成開始: 道路数 = ${this.roads.length}`);
    
    // まず、locationDataの施設を優先的に配置
    const placedFacilities = new Set();
    
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
            // 道路に沿って建物を配置するポイントを計算（建物間隔を増加）
            const minBuildingSpacing = this.buildingSizes.medium + this.minBuildingDistance * 2;
            const numBuildings = Math.floor(roadLength / minBuildingSpacing);
            
            for (let i = 0; i < numBuildings; i++) {
                // 道路に沿った位置（端から少し離す）
                const roadT = (i + 1) / (numBuildings + 1); // 道路の端から離す
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
                
                // 建物タイプとサイズを決定
                let buildingType;
                let buildingSize;
                
                if (placedFacilities.size < locationData.length) {
                    const unplacedFacilities = locationData.filter(loc => !placedFacilities.has(loc.name));
                    const selectedFacility = unplacedFacilities[Math.floor(Math.random() * unplacedFacilities.length)];
                    buildingType = selectedFacility.name;
                    buildingSize = this.getBuildingSizeByType(buildingType);
                    placedFacilities.add(selectedFacility.name);
                    console.log(`  locationData施設を選択: ${buildingType} サイズ: ${buildingSize}`);
                } else {
                    buildingType = this.getRandomBuildingType();
                    buildingSize = this.getBuildingSizeByType(buildingType);
                }
                
                // 道路の幅を取得
                const roadWidth = road.isMain ? this.roadWidth * 2 : road.isShort ? this.roadWidth * 0.25 : this.roadWidth;
                
                                    // 建物を道路の端から適切な距離に配置（改善版）
                    // 道路の幅を考慮した安全な距離を計算
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
                    
                    console.log(`  建物配置試行: ${buildingType} 位置:(${buildingX.toFixed(1)}, ${buildingZ.toFixed(1)}) サイズ:${buildingSize} 道路からの距離:${totalDistance.toFixed(2)} 安全マージン:${safetyMargin.toFixed(2)}`);
                    
                    // 位置調整の試行回数をチェック
                    if (attempts >= maxAttempts) {
                        console.log(`  位置調整失敗: 最大試行回数に達しました (${buildingX.toFixed(1)}, ${buildingZ.toFixed(1)})`);
                        continue;
                    }
                    
                    // 新しい道路距離チェック関数を使用
                    if (!this.isValidBuildingPositionWithRoadDistance(buildingX, buildingZ, buildingSize)) {
                        console.log(`  道路距離チェックで除外: (${buildingX.toFixed(1)}, ${buildingZ.toFixed(1)})`);
                        continue;
                    }
                
                                    // 他の建物との重複をチェック
                    if (!this.isBuildingOverlapping(buildingX, buildingZ, buildingSize)) {
                        // 最も近い道路の方向を計算して建物の向きを決定
                        const nearestRoad = this.findNearestRoad(buildingX, buildingZ);
                        const buildingRotation = this.calculateBuildingRotation(buildingX, buildingZ, nearestRoad);
                        
                        this.buildings.push({
                            x: buildingX,
                            z: buildingZ,
                            type: buildingType,
                            size: buildingSize,
                            rotation: buildingRotation,
                            roadIndex: roadIndex,
                            side: sideIndex,
                            distanceToRoad: this.calculateMinDistanceToRoads(buildingX, buildingZ), // 実際の距離を記録
                            nearestRoadIndex: this.roads.indexOf(nearestRoad) // 最も近い道路のインデックスを記録
                        });
                    
                    console.log(`  建物配置成功: ${buildingType} (${buildingX.toFixed(1)}, ${buildingZ.toFixed(1)}) サイズ:${buildingSize} 実際の道路距離:${this.calculateMinDistanceToRoads(buildingX, buildingZ).toFixed(2)}`);
                } else {
                    console.log(`  建物重複のため除外: (${buildingX.toFixed(1)}, ${buildingZ.toFixed(1)})`);
                }
            }
        });
    });
    
    console.log(`建物生成完了: ${this.buildings.length} 棟配置 (locationData施設: ${placedFacilities.size}個)`);
}

    // 道路を関数として扱い、建物の位置が安全かチェックする新しい関数
    isValidBuildingPositionWithRoadDistance(x, z, buildingSize) {
        const buildingRadius = buildingSize / 2;
        
        // 建物サイズに応じて安全マージンを動的に調整
        const safetyMargin = this.getSafetyMarginByBuildingSize(buildingSize);
        
        // すべての道路に対して距離をチェック
        for (const road of this.roads) {
            // 道路を直線関数として扱う
            const distance = this.calculateDistanceToRoadLine(x, z, road);
            const roadWidth = road.isMain ? this.roadWidth * 2 : road.isShort ? this.roadWidth * 0.25 : this.roadWidth;
            
            // 必要な最小距離 = 道路の半分幅 + 建物の半径 + 安全マージン
            const requiredDistance = (roadWidth / 2) + buildingRadius + safetyMargin;
            
            if (distance < requiredDistance) {
                console.log(`    道路距離不足: 実際距離=${distance.toFixed(2)}, 必要距離=${requiredDistance.toFixed(2)}, 建物サイズ=${buildingSize}, 安全マージン=${safetyMargin.toFixed(2)}`);
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
            return cityLayoutConfig.safetyMargins.large;
        } else if (buildingSize >= this.buildingSizes.medium) {
            // 中サイズの建物（商店、オフィスなど）は中程度の安全マージン
            return cityLayoutConfig.safetyMargins.medium;
        } else {
            // 小サイズの建物（住宅など）は標準の安全マージン
            return cityLayoutConfig.safetyMargins.small;
        }
    }

// 道路を直線関数として扱い、点と道路の距離を計算
calculateDistanceToRoadLine(x, z, road) {
    // 道路の始点と終点
    const x1 = road.start.x;
    const y1 = road.start.z;
    const x2 = road.end.x;
    const y2 = road.end.z;
    
    // 道路の方向ベクトル
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    // 道路の長さ
    const roadLength = Math.sqrt(dx * dx + dy * dy);
    
    if (roadLength === 0) {
        // 道路が点の場合
        return Math.sqrt((x - x1) * (x - x1) + (z - y1) * (z - y1));
    }
    
    // 点から道路の始点へのベクトル
    const px = x - x1;
    const py = z - y1;
    
    // 道路の方向ベクトルの単位ベクトル
    const unitDx = dx / roadLength;
    const unitDy = dy / roadLength;
    
    // 点から道路への射影のパラメータ t
    const t = px * unitDx + py * unitDy;
    
    let closestX, closestZ;
    
    if (t <= 0) {
        // 最も近い点は道路の始点
        closestX = x1;
        closestZ = y1;
    } else if (t >= roadLength) {
        // 最も近い点は道路の終点
        closestX = x2;
        closestZ = y2;
    } else {
        // 最も近い点は道路上の点
        closestX = x1 + t * unitDx;
        closestZ = y1 + t * unitDy;
    }
    
    // 点から最も近い道路上の点までの距離
    return Math.sqrt((x - closestX) * (x - closestX) + (z - closestZ) * (z - closestZ));
}

// すべての道路に対する最小距離を計算
calculateMinDistanceToRoads(x, z) {
    let minDistance = Infinity;
    
    for (const road of this.roads) {
        const distance = this.calculateDistanceToRoadLine(x, z, road);
        if (distance < minDistance) {
            minDistance = distance;
        }
    }
    
    return minDistance;
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
            return cityLayoutConfig.overlapMargins.large;
        } else if (maxSize >= this.buildingSizes.medium) {
            // 中サイズの建物は中程度の間隔
            return cityLayoutConfig.overlapMargins.medium;
        } else {
            // 小サイズの建物は標準の間隔
            return cityLayoutConfig.overlapMargins.small;
        }
    }

    // 建物の向きを最も近い道路の方向に計算
    calculateBuildingRotation(buildingX, buildingZ, nearestRoad) {
        if (!nearestRoad) {
            return 0; // デフォルトの向き
        }
        
        // 建物から最も近い道路上の点を計算
        const nearestPoint = this.findNearestRoadPoint(buildingX, buildingZ);
        if (!nearestPoint) {
            return 0;
        }
        
        // 建物から最も近い道路点への方向ベクトル
        const dirX = nearestPoint.x - buildingX;
        const dirZ = nearestPoint.z - buildingZ;
        
        // 建物の入り口が道路の方を向くように回転を計算
        // 建物の前面（入り口）が道路の方向を向くようにする
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
            /*
            // デバッグ用：建物から最も近い道路への接続線を表示
            if (building.nearestRoadIndex !== undefined) {
                const nearestRoad = this.roads[building.nearestRoadIndex];
                const nearestPoint = this.findNearestRoadPoint(building.x, building.z);
                
                if (nearestPoint) {
                    // 接続線を描画
                    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(building.x, building.size/2, building.z),
                        new THREE.Vector3(nearestPoint.x, 0.1, nearestPoint.z)
                    ]);
                    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
                    const line = new THREE.Line(lineGeometry, lineMaterial);
                    scene.add(line);
                }
            }
                */
            
            scene.add(mesh);
        });
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
            
            while (attempts < 500 && !placed) { // 試行回数を増加
                // ランダムな座標を生成（範囲を拡大）
                facilityX = (Math.random() - 0.5) * this.gridSize * 0.9;
                facilityZ = (Math.random() - 0.5) * this.gridSize * 0.9;
                
                // 施設のサイズを決定（configから読み込み）
                const facilitySize = this.buildingSize * cityLayoutConfig.facilitySizeMultiplier;
                
                // 建物や他の施設との重複をチェック（条件を緩和）
                if (!this.isBuildingOverlapping(facilityX, facilityZ, facilitySize) && 
                    !this.isFacilityOverlapping(facilityX, facilityZ, facilities)) {
                    
                    // 新しい道路距離チェック関数を使用して施設の位置を検証
                    if (this.isValidBuildingPositionWithRoadDistance(facilityX, facilityZ, facilitySize)) {
                        // 最も近い道路を見つける
                        const nearestRoad = this.findNearestRoad(facilityX, facilityZ);
                        if (nearestRoad) {
                            const roadIndex = this.roads.indexOf(nearestRoad);
                            
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
                                distanceToRoad: this.calculateMinDistanceToRoads(facilityX, facilityZ),
                                nearestRoadIndex: roadIndex
                            });
                            
                            console.log(`  施設配置成功: ${loc.name} (${facilityX.toFixed(1)}, ${facilityZ.toFixed(1)}) サイズ:${facilitySize} 道路距離:${this.calculateMinDistanceToRoads(facilityX, facilityZ).toFixed(2)}`);
                            placed = true;
                        }
                    } else {
                        console.log(`  施設位置が道路に近すぎるため除外: ${loc.name} (${facilityX.toFixed(1)}, ${facilityZ.toFixed(1)})`);
                    }
                }
                attempts++;
            }
            
            if (!placed) {
                console.log(`  施設配置失敗: ${loc.name} (試行回数: ${attempts})`);
                
                // フォールバック: より緩い条件で配置を試行
                console.log(`  フォールバック配置を試行: ${loc.name}`);
                let fallbackAttempts = 0;
                const maxFallbackAttempts = 100;
                
                while (fallbackAttempts < maxFallbackAttempts && !placed) {
                    facilityX = (Math.random() - 0.5) * this.gridSize * 0.95;
                    facilityZ = (Math.random() - 0.5) * this.gridSize * 0.95;
                    
                    // フォールバック用の施設サイズを定義
                    const fallbackFacilitySize = this.buildingSize * cityLayoutConfig.facilitySizeMultiplier * 0.8;
                    
                    // より緩い条件でチェック
                    if (!this.isBuildingOverlapping(facilityX, facilityZ, fallbackFacilitySize) && 
                        !this.isFacilityOverlapping(facilityX, facilityZ, facilities)) {
                        
                        const nearestRoad = this.findNearestRoad(facilityX, facilityZ);
                        if (nearestRoad) {
                            const roadIndex = this.roads.indexOf(nearestRoad);
                            const facilityRotation = this.calculateBuildingRotation(facilityX, facilityZ, nearestRoad);
                            
                            facilities.push({
                                name: loc.name,
                                x: facilityX,
                                z: facilityZ,
                                type: 'facility',
                                size: fallbackFacilitySize, // フォールバック用のサイズ
                                rotation: facilityRotation,
                                roadIndex: roadIndex,
                                distanceToRoad: this.calculateMinDistanceToRoads(facilityX, facilityZ),
                                nearestRoadIndex: roadIndex
                            });
                            
                            console.log(`  フォールバック配置成功: ${loc.name} (${facilityX.toFixed(1)}, ${facilityZ.toFixed(1)})`);
                            placed = true;
                        }
                    }
                    fallbackAttempts++;
                }
                
                if (!placed) {
                    console.log(`  フォールバック配置も失敗: ${loc.name}`);
                }
            }
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
            if (distance < this.buildingSize * 1.5) { // 施設間の間隔をさらに緩和
                return true;
            }
        }
        return false;
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
            sprite.position.set(facility.x, facilitySize + 1, facility.z);
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
                    color: 0x444444,
                    linewidth: 2,
                    transparent: true,
                    opacity: 0.5
                });
                
                const line = new THREE.Line(geometry, material);
                scene.add(line);
                this.roadCenterLines.push(line);
            }
        }
        
        // 建物の入り口接続を表示
        this.entranceConnections = [];
        
        // 建物の入り口接続を描画
        for (const building of this.buildings) {
            const connection = this.createEntranceConnection(building);
            if (connection) {
                // 入り口接続の線を描画
                const linePoints = [
                    new THREE.Vector3(connection.start.x, 0.08, connection.start.z),
                    new THREE.Vector3(connection.end.x, 0.08, connection.end.z)
                ];
                const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                const material = new THREE.LineBasicMaterial({ 
                    color: 0x444444,
                    linewidth: 3,
                    transparent: true,
                    opacity: 0.8
                });
                
                const line = new THREE.Line(geometry, material);
                scene.add(line);
                this.entranceConnections.push(line);
                
                // 入り口位置にマーカーを表示
                const entranceGeometry = new THREE.SphereGeometry(0.3, 8, 8);
                const entranceMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x444444,
                    transparent: true,
                    opacity: 0.7
                });
                const entranceMarker = new THREE.Mesh(entranceGeometry, entranceMaterial);
                entranceMarker.position.set(connection.start.x, 0.2, connection.start.z);
                scene.add(entranceMarker);
                this.entranceConnections.push(entranceMarker);
            }
        }
        
        // 施設の入り口接続を描画
        for (const facility of this.facilities) {
            const connection = this.createEntranceConnection(facility);
            if (connection) {
                // 入り口接続の線を描画
                const linePoints = [
                    new THREE.Vector3(connection.start.x, 0.08, connection.start.z),
                    new THREE.Vector3(connection.end.x, 0.08, connection.end.z)
                ];
                const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                const material = new THREE.LineBasicMaterial({ 
                    color: 0x444444,
                    linewidth: 3,
                    transparent: true,
                    opacity: 0.8
                });
                
                const line = new THREE.Line(geometry, material);
                scene.add(line);
                this.entranceConnections.push(line);
                
                // 入り口位置にマーカーを表示
                const entranceGeometry = new THREE.SphereGeometry(0.3, 8, 8);
                const entranceMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x444444,
                    transparent: true,
                    opacity: 0.7
                });
                const entranceMarker = new THREE.Mesh(entranceGeometry, entranceMaterial);
                entranceMarker.position.set(connection.start.x, 0.2, connection.start.z);
                scene.add(entranceMarker);
                this.entranceConnections.push(entranceMarker);
            }
        }
        
        // エージェントの自宅の入り口接続を描画
        if (window.agents && window.agents.length > 0) {
            for (const agent of window.agents) {
                if (agent.home) {
                    const homeBuilding = {
                        x: agent.home.x,
                        z: agent.home.z,
                        size: 2, // 家のサイズ
                        rotation: 0, // 家は正面を向いていると仮定
                        type: 'home'
                    };
                    
                    const connection = this.createEntranceConnection(homeBuilding);
                    if (connection) {
                        // 入り口接続の線を描画
                        const linePoints = [
                            new THREE.Vector3(connection.start.x, 0.08, connection.start.z),
                            new THREE.Vector3(connection.end.x, 0.08, connection.end.z)
                        ];
                        const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                        const material = new THREE.LineBasicMaterial({ 
                            color: 0x444444,
                            linewidth: 3,
                            transparent: true,
                            opacity: 0.8
                        });
                        
                        const line = new THREE.Line(geometry, material);
                        scene.add(line);
                        this.entranceConnections.push(line);
                        
                        // 入り口位置にマーカーを表示
                        const entranceGeometry = new THREE.SphereGeometry(0.3, 8, 8);
                        const entranceMaterial = new THREE.MeshBasicMaterial({ 
                            color: 0x444444,
                            transparent: true,
                            opacity: 0.7
                        });
                        const entranceMarker = new THREE.Mesh(entranceGeometry, entranceMaterial);
                        entranceMarker.position.set(connection.start.x, 0.2, connection.start.z);
                        scene.add(entranceMarker);
                        this.entranceConnections.push(entranceMarker);
                    }
                }
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
        
        if (this.entranceConnections) {
            for (const connection of this.entranceConnections) {
                scene.remove(connection);
                connection.geometry.dispose();
                connection.material.dispose();
            }
            this.entranceConnections = [];
        }
        
        // 入り口接続の配列を初期化
        this.entranceConnections = [];
    }
    
    // 入り口接続を描画
    drawEntranceConnections() {
        this.entranceConnections = [];
        
        // 建物の入り口接続を描画
        for (const building of this.buildings) {
            const connection = this.createEntranceConnection(building);
            if (connection) {
                const dx = connection.end.x - connection.start.x;
                const dz = connection.end.z - connection.start.z;
                const length = Math.sqrt(dx * dx + dz * dz);
                const angle = Math.atan2(dz, dx);
                
                // 入り口通路の地面
                const pathGeometry = new THREE.PlaneGeometry(length, 1.5, Math.ceil(length), 2);
                const pathEdges = new THREE.EdgesGeometry(pathGeometry);
                const pathMaterial = new THREE.LineBasicMaterial({ color: 0x444444 });
                const path = new THREE.LineSegments(pathEdges, pathMaterial);
                path.position.set(
                    (connection.start.x + connection.end.x) / 2,
                    0.03,
                    (connection.start.z + connection.end.z) / 2
                );
                path.rotation.x = -Math.PI / 2;
                path.rotation.z = angle;
                scene.add(path);
                this.entranceConnections.push(path);
                
                // 入り口の階段
                const stepGeometry = new THREE.BoxGeometry(1.2, 0.1, 0.2);
                const stepEdges = new THREE.EdgesGeometry(stepGeometry);
                const stepMaterial = new THREE.LineBasicMaterial({ color: 0x444444 });
                const step = new THREE.LineSegments(stepEdges, stepMaterial);
                step.position.set(
                    connection.start.x,
                    0.05,
                    connection.start.z
                );
                scene.add(step);
                this.entranceConnections.push(step);
            }
        }
        
        // 施設の入り口接続を描画
        for (const facility of this.facilities) {
            const connection = this.createEntranceConnection(facility);
            if (connection) {
                const dx = connection.end.x - connection.start.x;
                const dz = connection.end.z - connection.start.z;
                const length = Math.sqrt(dx * dx + dz * dz);
                const angle = Math.atan2(dz, dx);
                
                // 入り口通路の地面
                const pathGeometry = new THREE.PlaneGeometry(length, 2, Math.ceil(length), 2);
                const pathEdges = new THREE.EdgesGeometry(pathGeometry);
                const pathMaterial = new THREE.LineBasicMaterial({ color: 0x444444 });
                const path = new THREE.LineSegments(pathEdges, pathMaterial);
                path.position.set(
                    (connection.start.x + connection.end.x) / 2,
                    0.03,
                    (connection.start.z + connection.end.z) / 2
                );
                path.rotation.x = -Math.PI / 2;
                path.rotation.z = angle;
                scene.add(path);
                this.entranceConnections.push(path);
                
                // 入り口の階段
                const stepGeometry = new THREE.BoxGeometry(1.5, 0.1, 0.3);
                const stepEdges = new THREE.EdgesGeometry(stepGeometry);
                const stepMaterial = new THREE.LineBasicMaterial({ color: 0x444444 });
                const step = new THREE.LineSegments(stepEdges, stepMaterial);
                step.position.set(
                    connection.start.x,
                    0.05,
                    connection.start.z
                );
                scene.add(step);
                this.entranceConnections.push(step);
            }
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
    
    // 建物の入り口から道路までの接続通路を作成
    createEntranceConnection(building) {
        const entrance = this.getBuildingEntrance(building);
        
        // 建物に記録された最も近い道路を使用
        let nearestRoad;
        if (building.nearestRoadIndex !== undefined) {
            nearestRoad = this.roads[building.nearestRoadIndex];
        } else {
            nearestRoad = this.findNearestRoad(entrance.x, entrance.z);
        }
        
        if (!nearestRoad) return null;
        
        // 道路上の最も近い点を計算
        const roadPoint = this.findNearestRoadPoint(entrance.x, entrance.z);
        
        // 入り口から道路までの通路を作成
        const connection = {
            start: { x: entrance.x, z: entrance.z },
            end: { x: roadPoint.x, z: roadPoint.z },
            type: 'entrance',
            building: building
        };
        
        return connection;
    }
    
    // 最も近い道路を検索
    findNearestRoad(x, z) {
        let nearestRoad = null;
        let minDistance = Infinity;
        
        for (const road of this.roads) {
            const distance = this.pointToLineDistance(x, z, road);
            if (distance < minDistance) {
                minDistance = distance;
                nearestRoad = road;
            }
        }
        
        return nearestRoad;
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