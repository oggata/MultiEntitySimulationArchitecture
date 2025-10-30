// 経路探索システムを管理するクラス
class PathfindingSystem {
    constructor(roadSystem) {
        this.roadSystem = roadSystem;
    }

    // 2点間の経路を計算（A*アルゴリズムを使用）
    findPath(start, end) {
        // デバッグ: 道路システムの状態を確認
        if (this.roadSystem.roads.length === 0) {
            console.warn('⚠️ PathfindingSystem: 道路データがありません');
            return [start, end]; // 直線経路を返す
        }
        
        // 開始点と終了点から最も近い道路上の点を見つける
        const startRoadPoint = this.roadSystem.findNearestRoadPoint(start.x, start.z);
        const endRoadPoint = this.roadSystem.findNearestRoadPoint(end.x, end.z);

        if (!startRoadPoint || !endRoadPoint) {
            console.warn('⚠️ PathfindingSystem: 道路上の点が見つかりません');
            console.log(`  開始点: (${start.x.toFixed(1)}, ${start.z.toFixed(1)}) → 道路点: ${startRoadPoint ? 'あり' : 'なし'}`);
            console.log(`  終了点: (${end.x.toFixed(1)}, ${end.z.toFixed(1)}) → 道路点: ${endRoadPoint ? 'あり' : 'なし'}`);
            return [start, end]; // 直線経路を返す
        }

        // A*アルゴリズムで経路を計算
        const path = this.aStarPathfinding(startRoadPoint, endRoadPoint);
        
        if (path && path.length > 0) {
            // 開始点と終了点を追加
            path.unshift(start);
            path.push(end);
        } else {
            // 経路が見つからない場合は直線経路
            console.warn('⚠️ PathfindingSystem: A*で経路が見つかりません。直線経路を使用。');
            return [start, end];
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
        
        let iterations = 0;
        const maxIterations = 1000; // 無限ループ防止

        while (openSet.length > 0 && iterations < maxIterations) {
            iterations++;
            
            // fScoreが最小のノードを選択
            let current = openSet.reduce((min, node) => {
                const currentF = fScore.get(this.pointToString(node)) || Infinity;
                const minF = fScore.get(this.pointToString(min)) || Infinity;
                return currentF < minF ? node : min;
            });

            // 目的地に到達
            if (this.pointDistance(current, end) < 1.0) {
                const finalPath = this.reconstructPath(cameFrom, current);
                console.log(`✅ A*: 経路発見 (${iterations}回反復, ${finalPath.length}ポイント)`);
                return finalPath;
            }

            // 現在のノードを処理済みに
            openSet.splice(openSet.indexOf(current), 1);
            closedSet.add(this.pointToString(current));

            // 隣接ノードを探索
            const neighbors = this.getRoadNeighbors(current);
            
            if (neighbors.length === 0 && iterations < 5) {
                console.warn(`⚠️ A*: 隣接ノードなし at (${current.x.toFixed(1)}, ${current.z.toFixed(1)})`);
            }
            
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
        const searchRadius = 25; // 隣接点を探す半径（セグメンテーションマップ用に拡大）

        // 交差点を隣接点として追加
        for (const intersection of this.roadSystem.intersections) {
            const distance = this.pointDistance(point, intersection);
            if (distance <= searchRadius && distance > 0.1) {
                neighbors.push(intersection);
            }
        }

        // 道路セグメント（start-end形式）から隣接点を見つける
        for (const road of this.roadSystem.roads) {
            // 道路の開始点と終了点をチェック
            const startDist = this.pointDistance(point, road.start);
            const endDist = this.pointDistance(point, road.end);
            
            // 開始点が近い場合、終了点を隣接点として追加
            if (startDist <= searchRadius && startDist > 0.1) {
                // 現在のポイントが開始点に近いなら、終了点を隣接点に
                if (startDist < 1.0) {
                    neighbors.push({ x: road.end.x, z: road.end.z });
                } else {
                    // 開始点自体を隣接点に
                    neighbors.push({ x: road.start.x, z: road.start.z });
                }
            }
            
            // 終了点が近い場合、開始点を隣接点として追加
            if (endDist <= searchRadius && endDist > 0.1) {
                // 現在のポイントが終了点に近いなら、開始点を隣接点に
                if (endDist < 1.0) {
                    neighbors.push({ x: road.start.x, z: road.start.z });
                } else {
                    // 終了点自体を隣接点に
                    neighbors.push({ x: road.end.x, z: road.end.z });
                }
            }
        }

        // 重複を削除（同じ座標の点が複数追加される可能性がある）
        const uniqueNeighbors = [];
        const seen = new Set();
        
        for (const neighbor of neighbors) {
            const key = `${neighbor.x.toFixed(1)},${neighbor.z.toFixed(1)}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueNeighbors.push(neighbor);
            }
        }

        return uniqueNeighbors;
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

        for (const intersection of this.roadSystem.intersections) {
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
        for (const road of this.roadSystem.roads) {
            const dist1 = this.roadSystem.pointToLineDistance(point1.x, point1.z, road);
            const dist2 = this.roadSystem.pointToLineDistance(point2.x, point2.z, road);
            if (dist1 < 0.1 && dist2 < 0.1) {
                return true;
            }
        }
        return false;
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
} 