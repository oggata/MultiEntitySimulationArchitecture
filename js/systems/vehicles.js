// 車の通行システム
class Vehicle {
    constructor(road, direction) {
        this.road = road;
        this.direction = direction; // 'forward' or 'backward'
        this.speed = 8 + Math.random() * 4; // 8-12のランダムな速度
        this.progress = 0; // 道路上の進行度（0-1）
        this.mesh = null;
        this.color = this.getRandomColor();
        
        // 道路の開始点と終了点を設定
        this.setupPath();
        this.createMesh();
    }
    
    setupPath() {
        const road = this.road;
        if (this.direction === 'forward') {
            this.startPoint = road.startPoint;
            this.endPoint = road.endPoint;
        } else {
            this.startPoint = road.endPoint;
            this.endPoint = road.startPoint;
        }
        
        // 初期位置を設定
        this.currentPosition = this.startPoint.clone();
    }
    
    createMesh() {
        // 車のジオメトリ（より大きく、見やすく）
        const geometry = new THREE.BoxGeometry(2.5, 1.2, 4.5);
        const material = new THREE.MeshLambertMaterial({ color: this.color });
        this.mesh = new THREE.Mesh(geometry, material);
        
        // 影を有効化
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // 車の上部に小さな立方体を追加（車の屋根のような効果）
        const roofGeometry = new THREE.BoxGeometry(2.2, 0.3, 3.5);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: this.color });
        this.roof = new THREE.Mesh(roofGeometry, roofMaterial);
        this.roof.position.y = 0.75;
        this.mesh.add(this.roof);
        
        // 車の前部にライトを追加（より見やすくするため）
        const lightGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8 });
        this.frontLight = new THREE.Mesh(lightGeometry, lightMaterial);
        this.frontLight.position.set(0, 0.5, 2.5);
        this.mesh.add(this.frontLight);
        
        // 初期位置に配置
        this.updatePosition();
        
        // シーンに追加
        if (scene) {
            scene.add(this.mesh);
        }
    }
    
    getRandomColor() {
        const colors = [
            0xff0000, // 赤
            0x00ff00, // 緑
            0x0000ff, // 青
            0xffff00, // 黄
            0xff00ff, // マゼンタ
            0x00ffff, // シアン
            0xffa500, // オレンジ
            0x800080, // 紫
            0x008000, // ダークグリーン
            0x000080, // ダークブルー
            0xff4444, // 明るい赤
            0x44ff44, // 明るい緑
            0x4444ff, // 明るい青
            0xffaa00, // 明るいオレンジ
            0xaa00ff   // 明るい紫
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    update(deltaTime) {
        if (!this.mesh) return;
        
        // 進行度を更新
        const moveDistance = this.speed * deltaTime;
        const roadLength = this.startPoint.distanceTo(this.endPoint);
        this.progress += moveDistance / roadLength;
        
        // 道路の終点に到達したら削除対象にする
        if (this.progress >= 1.0) {
            this.shouldRemove = true;
            return;
        }
        
        // 位置を更新
        this.updatePosition();
    }
    
    updatePosition() {
        if (!this.mesh) return;
        
        // 道路に沿って位置を補間
        this.currentPosition.lerpVectors(this.startPoint, this.endPoint, this.progress);
        
        // 車の向きを道路の方向に合わせる
        const direction = new THREE.Vector3().subVectors(this.endPoint, this.startPoint).normalize();
        const angle = Math.atan2(direction.x, direction.z);
        
        // メッシュの位置と回転を更新
        this.mesh.position.copy(this.currentPosition);
        this.mesh.position.y = 0.8; // 地面からより高く配置
        this.mesh.rotation.y = angle;
        
        // 前部ライトの色を点滅させる（より目立たせる）
        if (this.frontLight) {
            const time = Date.now() * 0.005;
            const intensity = 0.5 + 0.5 * Math.sin(time);
            this.frontLight.material.opacity = intensity;
        }
    }
    
    remove() {
        if (this.mesh && scene) {
            // 子要素も含めて削除
            if (this.roof) {
                this.roof.geometry.dispose();
                this.roof.material.dispose();
            }
            if (this.frontLight) {
                this.frontLight.geometry.dispose();
                this.frontLight.material.dispose();
            }
            
            scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}

// 車の管理システム
class VehicleManager {
    constructor() {
        this.vehicles = [];
        this.maxVehicles = 15; // 最大車両数
        this.spawnInterval = 2.0; // 車両生成間隔（秒）
        this.lastSpawnTime = 0;
        this.availableRoads = [];
    }
    
    initialize(roads) {
        this.availableRoads = roads.filter(road => 
            road.startPoint && road.endPoint && 
            road.startPoint.distanceTo(road.endPoint) > 5 // 短すぎる道路は除外
        );
        console.log(`車両システム初期化完了: ${this.availableRoads.length}本の道路で車両が通行可能`);
    }
    
    update(deltaTime) {
        // 既存の車両を更新
        this.vehicles.forEach(vehicle => {
            vehicle.update(deltaTime);
        });
        
        // 削除対象の車両を除去
        this.vehicles = this.vehicles.filter(vehicle => {
            if (vehicle.shouldRemove) {
                vehicle.remove();
                return false;
            }
            return true;
        });
        
        // 車両生成の管理
        this.manageVehicleSpawn(deltaTime);
    }
    
    manageVehicleSpawn(deltaTime) {
        this.lastSpawnTime += deltaTime;
        
        // 一定間隔で車両を生成
        if (this.lastSpawnTime >= this.spawnInterval && this.vehicles.length < this.maxVehicles) {
            this.spawnVehicle();
            this.lastSpawnTime = 0;
            
            // 車両数に応じて生成間隔を調整
            const spawnRate = Math.max(1.0, this.maxVehicles - this.vehicles.length);
            this.spawnInterval = 2.0 / spawnRate;
        }
    }
    
    spawnVehicle() {
        if (this.availableRoads.length === 0) return;
        
        // ランダムな道路を選択
        const roadIndex = Math.floor(Math.random() * this.availableRoads.length);
        const road = this.availableRoads[roadIndex];
        
        // ランダムな方向を選択
        const direction = Math.random() < 0.5 ? 'forward' : 'backward';
        
        // 新しい車両を作成
        const vehicle = new Vehicle(road, direction);
        this.vehicles.push(vehicle);
        
        console.log(`新しい車両が生成されました: ${this.vehicles.length}/${this.maxVehicles}`);
    }
    
    // 車両数を調整
    setMaxVehicles(count) {
        this.maxVehicles = Math.max(1, Math.min(50, count));
        console.log(`最大車両数を${this.maxVehicles}に設定しました`);
    }
    
    // 現在の車両数を取得
    getVehicleCount() {
        return this.vehicles.length;
    }
    
    // すべての車両を削除
    clearAllVehicles() {
        this.vehicles.forEach(vehicle => vehicle.remove());
        this.vehicles = [];
        console.log('すべての車両を削除しました');
    }
    
    // 車両の統計情報を取得
    getStats() {
        return {
            current: this.vehicles.length,
            max: this.maxVehicles,
            spawnInterval: this.spawnInterval.toFixed(2)
        };
    }
}

// グローバル変数として車両マネージャーを作成
let vehicleManager = null;

// 車両システムの初期化関数
function initializeVehicleSystem() {
    if (!vehicleManager) {
        vehicleManager = new VehicleManager();
        
        // 利用可能な道路を取得（cityLayoutから）
        if (typeof cityLayout !== 'undefined' && cityLayout.roads && cityLayout.roads.length > 0) {
            vehicleManager.initialize(cityLayout.roads);
            console.log('車両システムが初期化されました');
        } else {
            // 道路がまだ生成されていない場合は少し待ってから再試行
            console.log('道路がまだ生成されていません。1秒後に再試行します...');
            setTimeout(() => {
                if (typeof cityLayout !== 'undefined' && cityLayout.roads && cityLayout.roads.length > 0) {
                    vehicleManager.initialize(cityLayout.roads);
                    console.log('車両システムが初期化されました（再試行成功）');
                } else {
                    console.log('道路の生成を待機中...');
                    // さらに待機
                    setTimeout(() => {
                        if (typeof cityLayout !== 'undefined' && cityLayout.roads && cityLayout.roads.length > 0) {
                            vehicleManager.initialize(cityLayout.roads);
                            console.log('車両システムが初期化されました（最終試行成功）');
                        } else {
                            console.error('道路の生成に失敗しました。車両システムを初期化できません。');
                        }
                    }, 2000);
                }
            }, 1000);
        }
    }
}

// 車両システムの更新関数
function updateVehicleSystem(deltaTime) {
    if (vehicleManager) {
        vehicleManager.update(deltaTime);
    }
}

// 車両数の設定関数
function setVehicleCount(count) {
    if (vehicleManager) {
        vehicleManager.setMaxVehicles(count);
    }
}

// 車両統計の取得関数
function getVehicleStats() {
    if (vehicleManager) {
        return vehicleManager.getStats();
    }
    return { current: 0, max: 0, spawnInterval: 0 };
}

// グローバルスコープに公開
window.initializeVehicleSystem = initializeVehicleSystem;
window.updateVehicleSystem = updateVehicleSystem;
window.setVehicleCount = setVehicleCount;
window.getVehicleStats = getVehicleStats; 