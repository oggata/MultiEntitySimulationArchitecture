// カメラシステム管理
class CameraSystem {
    constructor(scene) {
        this.scene = scene;
        this.camera = null;
        this.renderer = null;
        
        // カメラ制御用変数
        this.cameraMoveSpeed = 15.0;
        this.cameraKeys = {
            w: false,
            a: false,
            s: false,
            d: false,
            q: false, // 上昇
            e: false  // 下降
        };
        
        // カメラ制御用インデックス
        this.currentAgentIndex = 0;
        this.currentFacilityIndex = 0;
        this.targetAgent = null;
        this.targetFacility = null;
        this.cameraFollowEnabled = false;
        this.cameraMode = 'free'; // 'free', 'agent', 'facility'
        
        // カメラの回転角度を管理
        this.cameraRotationX = 0; // 上下の回転
        this.cameraRotationY = 0; // 左右の回転
        
        // ターゲットマーカー管理
        this.targetMarker = null;
        
        // マウス制御用変数
        this.mouseX = 0;
        this.mouseY = 0;
        this.isMouseDown = false;
        this.isPanelDragging = false;
    }
    
    // カメラの初期化
    initializeCamera(width, height) {
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.set(0, 35, 35);
        this.camera.lookAt(0, 0, 0);
        
        // デフォルトの回転角度を設定
        this.cameraRotationX = 0;
        this.cameraRotationY = 0;
        
        return this.camera;
    }
    
    // レンダラーの設定
    setRenderer(renderer) {
        this.renderer = renderer;
    }
    
    // カメラ追従更新関数
    updateCameraFollow() {
        if (!this.cameraFollowEnabled || this.cameraMode !== 'agent' || !this.targetAgent || !this.targetAgent.mesh) {
            return;
        }
        
        const agent = this.targetAgent;
        const pos = agent.mesh.position;
        
        // シンプルに人物の後ろに固定位置でカメラを配置
        const cameraOffsetX = -8; // 人物の後ろ8単位（距離を短縮）
        const cameraOffsetZ = 0;   // 左右のオフセットなし
        const cameraOffsetY = 4;   // 人物の上4単位（高さを下げる）
        
        // スムーズな追従のための補間
        const targetX = pos.x + cameraOffsetX;
        const targetY = pos.y + cameraOffsetY;
        const targetZ = pos.z + cameraOffsetZ;
        
        // 現在のカメラ位置から目標位置への補間
        const lerpFactor = 0.05;
        this.camera.position.x += (targetX - this.camera.position.x) * lerpFactor;
        this.camera.position.y += (targetY - this.camera.position.y) * lerpFactor;
        this.camera.position.z += (targetZ - this.camera.position.z) * lerpFactor;
        
        // カメラの向きを人物の位置に向ける（より自然な視点）
        this.camera.lookAt(pos.x, pos.y + 2.0, pos.z);
    }
    
    // カメラ移動更新関数
    updateCameraMovement(deltaTime) {
        if (this.cameraMode === 'free' || this.cameraMode === 'agent' || this.cameraMode === 'facility') {
            // カメラの前方・右方向ベクトルを計算
            const forward = new THREE.Vector3();
            this.camera.getWorldDirection(forward);
            
            // 水平移動用のベクトル（Y成分を0にする）
            const forwardHorizontal = forward.clone();
            forwardHorizontal.y = 0;
            forwardHorizontal.normalize();

            const right = new THREE.Vector3();
            right.crossVectors(forwardHorizontal, this.camera.up).normalize();
            
            const up = new THREE.Vector3(0, 1, 0);
            
            // 移動量を計算
            const moveAmount = this.cameraMoveSpeed * deltaTime;
            
            // 人物視点や施設視点でカメラ移動が開始された時に追従モードを一時的に無効
            if ((this.cameraMode === 'agent' || this.cameraMode === 'facility') && 
                (this.cameraKeys.w || this.cameraKeys.s || this.cameraKeys.a || this.cameraKeys.d || this.cameraKeys.q || this.cameraKeys.e)) {
                this.cameraFollowEnabled = false;
            }
            
            // 各キーの押下状態に応じて移動
            if (this.cameraKeys.w) {
                this.camera.position.add(forwardHorizontal.clone().multiplyScalar(moveAmount));
            }
            if (this.cameraKeys.s) {
                this.camera.position.add(forwardHorizontal.clone().multiplyScalar(-moveAmount));
            }
            if (this.cameraKeys.a) {
                this.camera.position.add(right.clone().multiplyScalar(-moveAmount));
            }
            if (this.cameraKeys.d) {
                this.camera.position.add(right.clone().multiplyScalar(moveAmount));
            }
            if (this.cameraKeys.q) {
                this.camera.position.add(up.clone().multiplyScalar(moveAmount));
            }
            if (this.cameraKeys.e) {
                this.camera.position.add(up.clone().multiplyScalar(-moveAmount));
            }
            
            // カメラの向きを維持（マウスで設定された角度を保持）
            this.updateCameraRotation();
        }
    }
    
    // カメラの回転を更新する関数
    updateCameraRotation() {
        // カメラの前方ベクトルを計算
        const forward = new THREE.Vector3(
            Math.sin(this.cameraRotationY) * Math.cos(this.cameraRotationX),
            Math.sin(this.cameraRotationX),
            Math.cos(this.cameraRotationY) * Math.cos(this.cameraRotationX)
        );
        
        // カメラの位置から前方に向けてlookAt
        const targetPosition = this.camera.position.clone().add(forward);
        this.camera.lookAt(targetPosition);
    }
    
    // カメラ回転角度をリセットする関数
    resetCameraRotation() {
        this.cameraRotationX = 0;
        this.cameraRotationY = 0;
        this.updateCameraRotation();
    }
    
    // 人物視点に切り替え
    focusCameraOnAgentByIndex(index, agents) {
        if (agents.length === 0) return;
        
        const agent = agents[index % agents.length];
        if (!agent || !agent.mesh) return;
        
        // ターゲットマーカーを削除
        this.removeTargetMarker();
        
        // カメラモードを設定
        this.cameraMode = 'agent';
        this.targetAgent = agent;
        this.cameraFollowEnabled = true;
        
        // カメラの回転角度をリセット（人物視点では固定の角度を使用）
        this.cameraRotationX = 0;
        this.cameraRotationY = 0;
        
        // カメラを人物の後ろに配置
        const pos = agent.mesh.position;
        
        // シンプルに人物の後ろに固定位置でカメラを配置
        const cameraOffsetX = -8; // 人物の後ろ8単位（距離を短縮）
        const cameraOffsetZ = 0;   // 左右のオフセットなし
        const cameraOffsetY = 4;   // 人物の上4単位（高さを下げる）
        
        this.camera.position.set(
            pos.x + cameraOffsetX,
            pos.y + cameraOffsetY,
            pos.z + cameraOffsetZ
        );
        // カメラを人物の位置に向ける（より自然な視点）
        this.camera.lookAt(pos.x, pos.y + 2.0, pos.z);
        
        // カメラモード表示を更新
        this.updateCameraModeDisplay();
        
        addLog(`👁️ ${agent.name}の視点に切り替えました（追従モード有効）`, 'system');
    }
    
    // 施設視点に切り替え
    focusCameraOnFacilityByIndex(index, locations) {
        // 実際に生成された施設のみを対象にする
        const facilities = locations.filter(loc => !loc.isHome && loc.mesh);
        if (facilities.length === 0) {
            addLog('❌ 生成された施設が見つかりません', 'system');
            return;
        }
        
        const facility = facilities[index % facilities.length];
        
        // カメラモードを設定
        this.cameraMode = 'facility';
        this.targetFacility = facility;
        this.cameraFollowEnabled = false; // 施設は固定なので追従不要
        
        // カメラの回転角度をリセット（施設視点では固定の角度を使用）
        this.cameraRotationX = 0;
        this.cameraRotationY = 0;
        
        // 施設の正しい位置情報を使用
        const pos = facility.position;
        
        // カメラを施設の正面からより下向きに見下ろすように配置
        this.camera.position.set(pos.x, 10, pos.z - 20);
        this.camera.lookAt(pos.x, pos.y - 1000, pos.z);
        
        // ターゲットマーカーを表示
        this.createTargetMarker(pos, 0xFF0000);
        
        // カメラモード表示を更新
        this.updateCameraModeDisplay();
        
        addLog(`🏢 ${facility.name}の視点に切り替えました（ターゲットマーカー表示）`, 'system');
    }
    
    // カメラをリセット
    resetCamera() {
        // ターゲットマーカーを削除
        this.removeTargetMarker();
        
        this.cameraMode = 'free';
        this.targetAgent = null;
        this.targetFacility = null;
        this.cameraFollowEnabled = false;
        
        // カメラの回転角度をリセット（全体表示では自由な角度を許可）
        this.cameraRotationX = 0;
        this.cameraRotationY = 0;
        
        this.camera.position.set(0, 30, 30);
        this.camera.lookAt(0, 0, 0);
        
        // カメラモード表示を更新
        this.updateCameraModeDisplay();
        
        addLog(`🗺️ 全体表示に切り替えました`, 'system');
    }
    
    // ターゲットマーカーを作成
    createTargetMarker(position, color = 0xFF0000) {
        // 既存のマーカーを削除
        if (this.targetMarker) {
            this.scene.remove(this.targetMarker);
        }
        
        // 新しいマーカーを作成（より大きく、目立つように）
        const markerGeometry = new THREE.SphereGeometry(3.0, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.9
        });
        
        this.targetMarker = new THREE.Mesh(markerGeometry, markerMaterial);
        this.targetMarker.position.set(position.x, position.y + 10, position.z);
        this.scene.add(this.targetMarker);
        
        // アニメーション効果を追加（上下に浮遊、より大きく）
        const originalY = this.targetMarker.position.y;
        const animate = () => {
            if (this.targetMarker) {
                this.targetMarker.position.y = originalY + Math.sin(Date.now() * 0.003) * 2.0;
                // マーカーの色も変化させる
                this.targetMarker.material.color.setHex(color);
                this.targetMarker.material.opacity = 0.7 + Math.sin(Date.now() * 0.005) * 0.3;
            }
        };
        
        // アニメーションループに追加
        if (!window.targetMarkerAnimation) {
            window.targetMarkerAnimation = animate;
        }
    }
    
    // ターゲットマーカーを削除
    removeTargetMarker() {
        if (this.targetMarker) {
            this.scene.remove(this.targetMarker);
            this.targetMarker = null;
        }
        window.targetMarkerAnimation = null;
    }
    
    // カメラモード表示を更新
    updateCameraModeDisplay() {
        const display = document.getElementById('cameraModeDisplay');
        if (!display) return;
        
        switch (this.cameraMode) {
            case 'agent':
                if (this.targetAgent) {
                    display.textContent = `${this.targetAgent.name}の視点`;
                    display.style.color = '#4CAF50';
                }
                break;
            case 'facility':
                if (this.targetFacility) {
                    display.textContent = `${this.targetFacility.name}の視点`;
                    display.style.color = '#FFC107';
                }
                break;
            case 'free':
            default:
                display.textContent = '全体表示';
                display.style.color = '#fff';
                break;
        }
        
        // 追従対象の表示も更新
        this.updateCameraTargetDisplay();
    }
    
    // カメラ追従対象の表示を更新
    updateCameraTargetDisplay() {
        const targetDisplay = document.getElementById('cameraTargetDisplay');
        const targetName = document.getElementById('cameraTargetName');
        
        if (!targetDisplay || !targetName) return;
        
        if (this.cameraMode === 'agent' && this.targetAgent) {
            targetDisplay.style.display = 'block';
            
            // 人物の移動状態を確認
            const isMoving = this.targetAgent.movementTarget !== null;
            const movementStatus = isMoving ? ' (移動中)' : ' (停止中)';
            
            targetName.textContent = `👤 ${this.targetAgent.name} を追従中${movementStatus}`;
            targetName.style.color = isMoving ? '#4CAF50' : '#888';
        } else if (this.cameraMode === 'facility' && this.targetFacility) {
            targetDisplay.style.display = 'block';
            targetName.textContent = `🏢 ${this.targetFacility.name} を表示中`;
            targetName.style.color = '#FFC107';
        } else {
            targetDisplay.style.display = 'none';
        }
    }
    
    // マウスコントロールの設定
    setupMouseControls() {
        document.addEventListener('mousemove', (event) => {
            // 人物視点モード中はマウス操作を無効
            if (this.cameraMode === 'agent' && this.cameraFollowEnabled) {
                return;
            }
            
            if (this.isMouseDown && !this.isPanelDragging) { // パネルドラッグ中でない場合のみカメラを回転
                const deltaX = event.clientX - this.mouseX;
                const deltaY = event.clientY - this.mouseY;
                
                // マウスの移動量に応じてカメラの回転角度を更新
                this.cameraRotationY -= deltaX * 0.01; // 左右の回転
                this.cameraRotationX -= deltaY * 0.01; // 上下の回転
                
                // 上下の回転角度を制限（-80度から80度まで）
                this.cameraRotationX = Math.max(-Math.PI * 0.4, Math.min(Math.PI * 0.4, this.cameraRotationX));
                
                // カメラの向きを更新
                this.updateCameraRotation();
            }
            this.mouseX = event.clientX;
            this.mouseY = event.clientY;
        });
        
        document.addEventListener('mousedown', () => {
            this.isMouseDown = true;
        });
        
        document.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });
        
        document.addEventListener('wheel', (event) => {
            // 人物視点モード中はズーム操作を無効
            if (this.cameraMode === 'agent' && this.cameraFollowEnabled) {
                return;
            }
            
            if (!this.isPanelDragging) { // パネルドラッグ中でない場合のみズーム可能
                // カメラの高さ（Y座標）だけを変更
                const heightChange = event.deltaY > 0 ? 1.0 : -1.0; // 上スクロールで上昇、下スクロールで下降
                this.camera.position.y += heightChange;
                
                // 高さの制限を設定（10から50の範囲）
                this.camera.position.y = Math.max(10, Math.min(50, this.camera.position.y));
                
                // カメラの向きを維持
                this.updateCameraRotation();
            }
        });
    }
    
    // キーイベントリスナーの設定
    setupKeyboardControls() {
        window.addEventListener('keydown', (e) => {
            if (this.cameraMode !== 'free' && this.cameraMode !== 'agent' && this.cameraMode !== 'facility') return;
            
            const key = e.key.toLowerCase();
            if (this.cameraKeys.hasOwnProperty(key)) {
                this.cameraKeys[key] = true;
                e.preventDefault(); // デフォルトの動作を防ぐ
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.cameraMode !== 'free' && this.cameraMode !== 'agent' && this.cameraMode !== 'facility') return;
            
            const key = e.key.toLowerCase();
            if (this.cameraKeys.hasOwnProperty(key)) {
                this.cameraKeys[key] = false;
                e.preventDefault(); // デフォルトの動作を防ぐ
            }
        });
    }
    
    // パネルドラッグ状態を設定
    setPanelDragging(dragging) {
        this.isPanelDragging = dragging;
    }
    
    // ウィンドウリサイズ対応
    onWindowResize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        if (this.renderer) {
            this.renderer.setSize(width, height);
        }
    }
}

// グローバルに公開
window.CameraSystem = CameraSystem; 