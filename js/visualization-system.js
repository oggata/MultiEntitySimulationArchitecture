// 視覚化システムを管理するクラス
class VisualizationSystem {
    constructor(roadSystem, buildingSystem, facilitySystem) {
        this.roadSystem = roadSystem;
        this.buildingSystem = buildingSystem;
        this.facilitySystem = facilitySystem;
        
        // 視覚化要素の管理
        this.pathLine = null;
        this.pathPoints = [];
        this.intersectionPoints = [];
        this.roadCenterLines = [];
        this.entranceConnections = [];
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
                color: i === 0 ? 0xF5F5F5 : i === path.length - 1 ? 0xF5F5F5 : color,
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
        for (const intersection of this.roadSystem.intersections) {
            const geometry = new THREE.SphereGeometry(0.5, 8, 8);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0xF5F5F5,
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
        for (const road of this.roadSystem.roads) {
            const points = this.roadSystem.getRoadPoints(road);
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
        for (const building of this.buildingSystem.buildings) {
            const connection = this.buildingSystem.createEntranceConnection(building);
            if (connection) {
                // 入り口接続の線を描画
                const linePoints = [
                    new THREE.Vector3(connection.start.x, 0.08, connection.start.z),
                    new THREE.Vector3(connection.end.x, 0.08, connection.end.z)
                ];
                const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                const material = new THREE.LineBasicMaterial({ 
                    color: 0xFF0000, // デバッグ用に赤色
                    linewidth: 3,
                    transparent: true,
                    opacity: 0.8
                });
                
                const line = new THREE.Line(geometry, material);
                scene.add(line);
                this.entranceConnections.push(line);
                
                // 入り口通路の地面（塗りつぶし）
                const dx = connection.end.x - connection.start.x;
                const dz = connection.end.z - connection.start.z;
                const length = Math.sqrt(dx * dx + dz * dz);
                const angle = Math.atan2(dz, dx);
                const roadGeometry = new THREE.PlaneGeometry(length, 1.5);
                const roadMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xFF0000, // デバッグ用に赤色
                    transparent: true,
                    opacity: 0.9
                });
                const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
                roadMesh.position.set(
                    (connection.start.x + connection.end.x) / 2,
                    0.15, // 地面より少し上に配置
                    (connection.start.z + connection.end.z) / 2
                );
                roadMesh.rotation.x = -Math.PI / 2;
                roadMesh.rotation.z = angle;
                scene.add(roadMesh);
                this.entranceConnections.push(roadMesh);
                
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
        for (const facility of this.facilitySystem.facilities) {
            const connection = this.facilitySystem.createEntranceConnection(facility);
            if (connection) {
                // 入り口接続の線を描画
                const linePoints = [
                    new THREE.Vector3(connection.start.x, 0.08, connection.start.z),
                    new THREE.Vector3(connection.end.x, 0.08, connection.end.z)
                ];
                const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                const material = new THREE.LineBasicMaterial({ 
                    color: 0xFF0000, // デバッグ用に赤色
                    linewidth: 3,
                    transparent: true,
                    opacity: 0.8
                });
                
                const line = new THREE.Line(geometry, material);
                scene.add(line);
                this.entranceConnections.push(line);
                
                // 入り口通路の地面（塗りつぶし）
                const dx = connection.end.x - connection.start.x;
                const dz = connection.end.z - connection.start.z;
                const length = Math.sqrt(dx * dx + dz * dz);
                const angle = Math.atan2(dz, dx);
                const roadGeometry = new THREE.PlaneGeometry(length, 1.5);
                const roadMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xFF0000, // デバッグ用に赤色
                    transparent: true,
                    opacity: 0.9
                });
                const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
                roadMesh.position.set(
                    (connection.start.x + connection.end.x) / 2,
                    0.15, // 地面より少し上に配置
                    (connection.start.z + connection.end.z) / 2
                );
                roadMesh.rotation.x = -Math.PI / 2;
                roadMesh.rotation.z = angle;
                scene.add(roadMesh);
                this.entranceConnections.push(roadMesh);
                
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
                    
                    const connection = this.buildingSystem.createEntranceConnection(homeBuilding);
                    if (connection) {
                        // 入り口接続の線を描画
                        const linePoints = [
                            new THREE.Vector3(connection.start.x, 0.08, connection.start.z),
                            new THREE.Vector3(connection.end.x, 0.08, connection.end.z)
                        ];
                        const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                        const material = new THREE.LineBasicMaterial({ 
                            color: 0xFF0000, // デバッグ用に赤色
                            linewidth: 3,
                            transparent: true,
                            opacity: 0.8
                        });
                        
                        const line = new THREE.Line(geometry, material);
                        scene.add(line);
                        this.entranceConnections.push(line);
                        
                        // 入り口通路の地面（塗りつぶし）
                        const dx = connection.end.x - connection.start.x;
                        const dz = connection.end.z - connection.start.z;
                        const length = Math.sqrt(dx * dx + dz * dz);
                        const angle = Math.atan2(dz, dx);
                        const roadGeometry = new THREE.PlaneGeometry(length, 1.5);
                        const roadMaterial = new THREE.MeshBasicMaterial({ 
                            color: 0xFF0000, // デバッグ用に赤色
                            transparent: true,
                            opacity: 0.9
                        });
                        const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
                        roadMesh.position.set(
                            (connection.start.x + connection.end.x) / 2,
                            0.15, // 地面より少し上に配置
                            (connection.start.z + connection.end.z) / 2
                        );
                        roadMesh.rotation.x = -Math.PI / 2;
                        roadMesh.rotation.z = angle;
                        scene.add(roadMesh);
                        this.entranceConnections.push(roadMesh);
                        
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
        for (const building of this.buildingSystem.buildings) {
            const connection = this.buildingSystem.createEntranceConnection(building);
            if (connection) {
                const dx = connection.end.x - connection.start.x;
                const dz = connection.end.z - connection.start.z;
                const length = Math.sqrt(dx * dx + dz * dz);
                const angle = Math.atan2(dz, dx);
                
                // 入り口通路の地面
                const pathGeometry = new THREE.PlaneGeometry(length, 1.5, Math.ceil(length), 2);
                const pathEdges = new THREE.EdgesGeometry(pathGeometry);
                const pathMaterial = new THREE.LineBasicMaterial({ color: 0xF5F5F5 });
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
                const stepMaterial = new THREE.LineBasicMaterial({ color: 0xF5F5F5 });
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
        for (const facility of this.facilitySystem.facilities) {
            const connection = this.facilitySystem.createEntranceConnection(facility);
            if (connection) {
                const dx = connection.end.x - connection.start.x;
                const dz = connection.end.z - connection.start.z;
                const length = Math.sqrt(dx * dx + dz * dz);
                const angle = Math.atan2(dz, dx);
                
                // 入り口通路の地面
                const pathGeometry = new THREE.PlaneGeometry(length, 2, Math.ceil(length), 2);
                const pathEdges = new THREE.EdgesGeometry(pathGeometry);
                const pathMaterial = new THREE.LineBasicMaterial({ color: 0xF5F5F5 });
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
                const stepMaterial = new THREE.LineBasicMaterial({ color: 0xF5F5F5 });
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

    // 入り口接続を通常の道路として描画
    drawEntranceConnectionsAsRoads() {
        // 建物の入り口接続を描画
        for (const building of this.buildingSystem.buildings) {
            const connection = this.buildingSystem.createEntranceConnection(building);
            if (connection) {
                const dx = connection.end.x - connection.start.x;
                const dz = connection.end.z - connection.start.z;
                const length = Math.sqrt(dx * dx + dz * dz);
                const angle = Math.atan2(dz, dx);
                
                // 入り口通路を道路として描画（他の道路と同じ色に統一）
                const roadGeometry = new THREE.PlaneGeometry(length, 1.5);
                const roadMaterial = new THREE.MeshBasicMaterial({ 
                    color: cityLayoutConfig.roadColors.entranceRoad, // 設定ファイルから読み込み
                    transparent: true,
                    opacity: cityLayoutConfig.roadColors.opacity // 設定ファイルから読み込み
                });
                const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
                roadMesh.position.set(
                    (connection.start.x + connection.end.x) / 2,
                    0.15, // 地面より少し上に配置（他の道路より高く）
                    (connection.start.z + connection.end.z) / 2
                );
                roadMesh.rotation.x = -Math.PI / 2;
                roadMesh.rotation.z = angle;
                scene.add(roadMesh);
                
                // 境界線（無効化）
                // const edges = new THREE.EdgesGeometry(roadGeometry);
                // const lineMaterial = new THREE.LineBasicMaterial({ 
                //     color: cityLayoutConfig.roadColors.borderLine, // 透明
                //     linewidth: 2
                // });
                // const line = new THREE.LineSegments(edges, lineMaterial);
                // line.position.copy(roadMesh.position);
                // line.rotation.copy(roadMesh.rotation);
                // scene.add(line);
            }
        }
        
        // 施設の入り口接続を描画
        for (const facility of this.facilitySystem.facilities) {
            const connection = this.facilitySystem.createEntranceConnection(facility);
            if (connection) {
                const dx = connection.end.x - connection.start.x;
                const dz = connection.end.z - connection.start.z;
                const length = Math.sqrt(dx * dx + dz * dz);
                const angle = Math.atan2(dz, dx);
                
                // 入り口通路を道路として描画（他の道路と同じ色に統一）
                const roadGeometry = new THREE.PlaneGeometry(length, 2);
                const roadMaterial = new THREE.MeshBasicMaterial({ 
                    color: cityLayoutConfig.roadColors.entranceRoad, // 設定ファイルから読み込み
                    transparent: true,
                    opacity: cityLayoutConfig.roadColors.opacity // 設定ファイルから読み込み
                });
                const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
                roadMesh.position.set(
                    (connection.start.x + connection.end.x) / 2,
                    0.15, // 地面より少し上に配置（他の道路より高く）
                    (connection.start.z + connection.end.z) / 2
                );
                roadMesh.rotation.x = -Math.PI / 2;
                roadMesh.rotation.z = angle;
                scene.add(roadMesh);
                
                // 境界線（無効化）
                // const edges = new THREE.EdgesGeometry(roadGeometry);
                // const lineMaterial = new THREE.LineBasicMaterial({ 
                //     color: cityLayoutConfig.roadColors.borderLine, // 透明
                //     linewidth: 2
                // });
                // const line = new THREE.LineSegments(edges, lineMaterial);
                // line.position.copy(roadMesh.position);
                // line.rotation.copy(roadMesh.rotation);
                // scene.add(line);
            }
        }
        // エージェントの自宅の入り口接続も道路として描画
        if (window.agents && window.agents.length > 0) {
            for (const agent of window.agents) {
                if (agent.home) {
                    const homeBuilding = {
                        x: agent.home.x,
                        z: agent.home.z,
                        size: 2,
                        rotation: 0,
                        type: 'home'
                    };
                    const connection = this.buildingSystem.createEntranceConnection(homeBuilding);
                    if (connection) {
                        const dx = connection.end.x - connection.start.x;
                        const dz = connection.end.z - connection.start.z;
                        const length = Math.sqrt(dx * dx + dz * dz);
                        const angle = Math.atan2(dz, dx);

                        const roadGeometry = new THREE.PlaneGeometry(length, 1.5);
                        const roadMaterial = new THREE.MeshBasicMaterial({ 
                            color: cityLayoutConfig.roadColors.entranceRoad, // 設定ファイルから読み込み
                            transparent: true,
                            opacity: cityLayoutConfig.roadColors.opacity // 設定ファイルから読み込み
                        });
                        const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
                        roadMesh.position.set(
                            (connection.start.x + connection.end.x) / 2,
                            0.15,
                            (connection.start.z + connection.end.z) / 2
                        );
                        roadMesh.rotation.x = -Math.PI / 2;
                        roadMesh.rotation.z = angle;
                        scene.add(roadMesh);

                        // 境界線（無効化）
                        // const edges = new THREE.EdgesGeometry(roadGeometry);
                        // const lineMaterial = new THREE.LineBasicMaterial({
                        //     color: cityLayoutConfig.roadColors.borderLine,
                        //     linewidth: 2
                        // });
                        // const line = new THREE.LineSegments(edges, lineMaterial);
                        // line.position.copy(roadMesh.position);
                        // line.rotation.copy(roadMesh.rotation);
                        // scene.add(line);
                    }
                }
            }
        }
    }
} 