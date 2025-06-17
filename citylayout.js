
// 道路と建物の配置を管理するクラス
class CityLayout {
    constructor() {
        this.roads = [];
        this.buildings = [];
        this.intersections = [];
        this.gridSize = 50;
        this.roadWidth = 2;
        this.buildingSize = 4;
        this.minBuildingDistance = 6;
        this.blockSize = 10; // 街区のサイズ
    }

    // 道路の生成
    generateRoads() {
        // メインストリート（大通り）
        const mainStreets = this.generateMainStreets();
        
        // サブストリート（小道）
        const subStreets = this.generateSubStreets(mainStreets);
        
        this.roads = [...mainStreets, ...subStreets];
        this.findIntersections();
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
                type: 'main'
            });
        }

        // 南北方向のメインストリート
        for (let i = 1; i <= numMainStreets; i++) {
            const x = -this.gridSize/2 + spacing * i;
            mainStreets.push({
                start: { x: x, z: -this.gridSize/2 },
                end: { x: x, z: this.gridSize/2 },
                type: 'main'
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
                const blockBounds = this.calculateBlockBounds(street1, street2, intersection);
                if (!blockBounds) continue;

                // ブロック内にサブストリートを生成
                const blockSubStreets = this.generateBlockSubStreets(blockBounds);
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
    calculateBlockBounds(street1, street2, intersection) {
        // 交差点から最も近い他のメインストリートとの交点を探す
        const otherIntersections = [];
        
        for (const street of this.roads) {
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

    // 2点間の経路を計算
    findPath(start, end) {
        // 開始点と終了点から最も近い道路上の点を見つける
        const startRoadPoint = this.findNearestRoadPoint(start.x, start.z);
        const endRoadPoint = this.findNearestRoadPoint(end.x, end.z);

        if (!startRoadPoint || !endRoadPoint) {
            return null;
        }

        // 経路を計算
        const path = [];
        path.push(startRoadPoint);

        // 中間点を追加（道路の交差点を経由）
        const midPoint = this.findIntermediatePoint(startRoadPoint, endRoadPoint);
        if (midPoint) {
            path.push(midPoint);
        }

        path.push(endRoadPoint);
        return path;
    }

    // 中間点を見つける
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

    // 道路の描画を修正
    drawRoads() {
        this.roads.forEach(road => {
            // 道路の長さを計算
            const length = Math.sqrt(
                Math.pow(road.end.x - road.start.x, 2) + 
                Math.pow(road.end.z - road.start.z, 2)
            );

            // 道路の幅を設定（メインストリートは広く）
            const width = road.type === 'main' ? this.roadWidth * 1.5 : this.roadWidth;

            // 道路のジオメトリを作成（高さを0.1に設定）
            const roadGeometry = new THREE.BoxGeometry(length, 0.1, width);
            const roadMaterial = new THREE.MeshLambertMaterial({ 
                color: road.type === 'main' ? 0x444444 : 0x666666,
                emissive: road.type === 'main' ? 0x444444 : 0x666666,
                emissiveIntensity: 0.1
            });
            const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
            
            // 道路の位置を設定（中央点）
            const midX = (road.start.x + road.end.x) / 2;
            const midZ = (road.start.z + road.end.z) / 2;
            roadMesh.position.set(midX, 0.05, midZ); // 地面より少し上に配置
            
            // 道路の向きを設定
            const angle = Math.atan2(road.end.z - road.start.z, road.end.x - road.start.x);
            roadMesh.rotation.y = angle;
            
            // 影の設定
            roadMesh.receiveShadow = true;
            
            scene.add(roadMesh);

            // 道路の端に白線を追加（オプション）
            if (road.type === 'main') {
                const lineGeometry = new THREE.BoxGeometry(length, 0.11, 0.1);
                const lineMaterial = new THREE.MeshLambertMaterial({ 
                    color: 0xFFFFFF,
                    emissive: 0xFFFFFF,
                    emissiveIntensity: 0.2
                });

                // 左側の白線
                const leftLine = new THREE.Mesh(lineGeometry, lineMaterial);
                leftLine.position.set(midX, 0.06, midZ - width/2 + 0.1);
                leftLine.rotation.y = angle;
                scene.add(leftLine);

                // 右側の白線
                const rightLine = new THREE.Mesh(lineGeometry, lineMaterial);
                rightLine.position.set(midX, 0.06, midZ + width/2 - 0.1);
                rightLine.rotation.y = angle;
                scene.add(rightLine);
            }
        });
    }
}

// グローバル変数に追加
let cityLayout;