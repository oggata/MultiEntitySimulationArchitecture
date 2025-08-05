// 道路システムを管理するクラス
class RoadSystem {
    constructor(config) {
        this.config = config;
        this.roads = [];
        this.intersections = [];
        
        // config.jsから設定を読み込み
        this.gridSize = config.gridSize;
        this.roadWidth = config.roadWidth;
        this.blockSize = config.blockSize;
        this.shortRoadRatio = config.shortRoadRatio;
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
        
        return this.roads;
    }

    // メインストリートの生成
    generateMainStreets() {
        const mainStreets = [];
        const numMainStreets = this.config.numMainStreets;
        const spacing = this.gridSize / (numMainStreets + 1);

        // 東西方向のメインストリート
        for (let i = 1; i <= numMainStreets; i++) {
            const z = -this.gridSize/2 + spacing * i;
            const isMainStreet = i === 1 || i === numMainStreets;
            mainStreets.push({
                start: { x: -this.gridSize/2, z: z },
                end: { x: this.gridSize/2, z: z },
                type: 'main',
                isMain: isMainStreet
            });
        }

        // 南北方向のメインストリート
        for (let i = 1; i <= numMainStreets; i++) {
            const x = -this.gridSize/2 + spacing * i;
            const isMainStreet = i === 1 || i === numMainStreets;
            mainStreets.push({
                start: { x: x, z: -this.gridSize/2 },
                end: { x: x, z: this.gridSize/2 },
                type: 'main',
                isMain: isMainStreet
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
                if (this.isParallel(street1, street2)) {
                    continue;
                }

                // 交差点を計算
                const intersection = this.findRoadIntersection(street1, street2);
                if (!intersection) {
                    continue;
                }

                // ブロックの範囲を計算
                const blockBounds = this.calculateBlockBounds(street1, street2, intersection, mainStreets);
                if (!blockBounds) {
                    continue;
                }

                // ブロック内にサブストリートを生成
                const blockSubStreets = this.generateBlockSubStreets(blockBounds);
                
                // サブストリートは通常道路として設定
                blockSubStreets.forEach(street => {
                    street.isMain = false;
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

    // 短い道路を主要道路から生やす
    addShortRoads() {
        const shortRoads = [];
        const shortWidth = this.roadWidth * 0.25;
        const shortLength = this.gridSize * 0.08;
        
        // すべての道路から短い道路を生やす
        this.roads.forEach((road, index) => {
            // 道路の方向を計算
            const roadDirX = road.end.x - road.start.x;
            const roadDirZ = road.end.z - road.start.z;
            const roadLength = Math.sqrt(roadDirX * roadDirX + roadDirZ * roadDirZ);
            
            // 道路に垂直な方向を計算
            const perpDirX = -roadDirZ / roadLength;
            const perpDirZ = roadDirX / roadLength;
            
            // 道路の複数ポイントから短い道路を生やす
            const numPoints = 3;
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
                    const randomValue = Math.random();
                    
                    if (randomValue < this.shortRoadRatio) {
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
                            safeLength = this.roadWidth * 2;
                        }
                        
                        // 終点を設定
                        const endX = pointX + dir.x * safeLength;
                        const endZ = pointZ + dir.z * safeLength;
                        
                        // 最低限の長さがある場合のみ追加
                        const actualLength = Math.sqrt(Math.pow(endX - pointX, 2) + Math.pow(endZ - pointZ, 2));
                        const minLength = this.roadWidth * 1.5;
                        
                        if (actualLength > minLength) {
                            shortRoads.push({
                                start: { x: pointX, z: pointZ },
                                end: { x: endX, z: endZ },
                                type: 'short',
                                isMain: false,
                                isShort: true,
                                width: shortWidth
                            });
                        }
                    }
                });
            }
        });
        
        // 短い道路を追加
        this.roads.push(...shortRoads);
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

    // 点と線分の距離を計算
    pointToLineDistance(x, z, road) {
        return this.calculateDistanceToRoadLine(x, z, road);
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

    // 道路の描画
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
            let roadColor = 0x444444;
            
            if (road.isMain) {
                roadWidth = this.roadWidth * 3;
            } else if (road.isShort) {
                roadWidth = this.roadWidth * 0.5;
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
                0.1,
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
    }
} 