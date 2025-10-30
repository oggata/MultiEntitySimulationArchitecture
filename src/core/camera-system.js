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
        this.cameraMode = 'free'; // 'free', 'agent', 'facility', 'auto'
        
        // カメラの回転角度を管理
        this.cameraRotationX = 0; // 上下の回転
        this.cameraRotationY = 0; // 左右の回転
        
        // ターゲットマーカー管理
        this.targetMarker = null;
        
        // 自動視点切り替え
        this.autoViewEnabled = false;
        this.autoViewInterval = null;
        this.autoViewTimer = 0;
        this.autoViewDuration = 5000; // 5秒
        
        // マウス制御用変数
        this.mouseX = 0;
        this.mouseY = 0;
        this.isMouseDown = false;
        this.isPanelDragging = false;
        
        // 初期回転保持フラグ
        this.preserveInitialRotation = false;
        
        // ハイライトされている施設メッシュ
        this.highlightedFacilityMesh = null;
        
        // カテゴリ別にハイライトされているメッシュ
        this.highlightedCategoryMeshes = new Map(); // category -> array of meshes
    }
    
    // カメラの初期化
    initializeCamera(width, height) {
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        
        // エディターマップの場合は北向き、少し高い位置から見下ろす
        if (window.isEditorMap) {
            this.camera.position.set(0, 50, 60);  // 高めの位置から、南側に配置
            
            // 見下ろす角度を設定（回転ベースでカメラを制御）
            this.cameraRotationX = -0.3;     // 少し下向き
            this.cameraRotationY = Math.PI;  // 北向き（Z軸負の方向）
            
            // カメラの向きを更新
            this.updateCameraRotation();
        } else {
            // 通常モードのカメラ位置
            this.camera.position.set(0, 35, 35);
            this.camera.lookAt(0, 0, 0);
            
            // デフォルトの回転角度を設定
            this.cameraRotationX = 0;
            this.cameraRotationY = 0;
        }
        
        return this.camera;
    }
    
    // レンダラーの設定
    setRenderer(renderer) {
        this.renderer = renderer;
    }
    
    // カメラ追従更新関数
    updateCameraFollow() {
        // 自動視点モードまたは通常のエージェント追従モード
        if (!this.cameraFollowEnabled || 
            (this.cameraMode !== 'agent' && this.cameraMode !== 'auto') || 
            !this.targetAgent || 
            !this.targetAgent.mesh) {
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
            
            // カメラの高さ制限（地面より下に潜らないように）
            const minCameraHeight = 0.5; // 地面（Y=0）より少し上
            if (this.camera.position.y < minCameraHeight) {
                this.camera.position.y = minCameraHeight;
            }
            
            // カメラの向きを維持（マウスで設定された角度を保持）
            // 初期回転を保持する場合はupdateCameraRotationをスキップ
            if (!this.preserveInitialRotation) {
                this.updateCameraRotation();
            }
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
        
        // ハイライトを解除
        if (this.highlightedFacilityMesh) {
            this.unhighlightFacilityMesh(this.highlightedFacilityMesh);
            this.highlightedFacilityMesh = null;
        }
        
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
        
        // エージェント情報パネルを該当のエージェントまでスクロール
        this.scrollToAgentCard(agent.name);
        
        addLog(`👁️ ${agent.name}の視点に切り替えました（追従モード有効）`, 'system');
    }
    
    // 施設視点に切り替え
    focusCameraOnFacilityByIndex(index, locations) {
        // デバッグ: locationsの内容を確認
        console.log(`📍 施設視点切り替え: 全locations数=${locations.length}`);
        console.log(`  - 住宅以外: ${locations.filter(loc => !loc.isHome).length}件`);
        console.log(`  - メッシュあり: ${locations.filter(loc => loc.mesh).length}件`);
        
        // 実際に生成された施設のみを対象にする
        const facilities = locations.filter(loc => !loc.isHome && loc.mesh);
        console.log(`  - フィルタ後の施設数: ${facilities.length}件`);
        
        if (facilities.length === 0) {
            console.warn('❌ 施設が見つかりません。全locationsを確認:');
            locations.slice(0, 5).forEach(loc => {
                console.log(`    - ${loc.name}: isHome=${loc.isHome}, mesh=${loc.mesh ? 'あり' : 'なし'}`);
            });
            addLog('❌ 生成された施設が見つかりません', 'system');
            return;
        }
        
        const facility = facilities[index % facilities.length];
        console.log(`  → 選択された施設: ${facility.name} (ID: ${facility.id})`);
        
        // 前回ハイライトした施設のハイライトを解除
        if (this.highlightedFacilityMesh) {
            this.unhighlightFacilityMesh(this.highlightedFacilityMesh);
        }
        
        // 新しい施設をハイライト
        if (facility.mesh) {
            this.highlightFacilityMesh(facility.mesh);
            this.highlightedFacilityMesh = facility.mesh;
        }
        
        // カメラモードを設定
        this.cameraMode = 'facility';
        this.targetFacility = facility;
        this.cameraFollowEnabled = false; // 施設は固定なので追従不要
        
        // カメラの回転角度をリセット（施設視点では固定の角度を使用）
        this.cameraRotationX = 0;
        this.cameraRotationY = 0;
        
        // 施設の正しい位置情報を使用
        const pos = facility.position;
        
        // セグメンテーションマップの場合は適切な距離を計算
        let cameraHeight = 10;
        let cameraDistance = 20;
        
        if (window.isSegmentationMap && this.cityRange) {
            cameraHeight = Math.max(10, this.cityRange * 0.1);
            cameraDistance = Math.max(20, this.cityRange * 0.3);
        }
        
        // カメラを施設の正面からより下向きに見下ろすように配置
        this.camera.position.set(pos.x, cameraHeight, pos.z - cameraDistance);
        this.camera.lookAt(pos.x, pos.y, pos.z);
        
        // カメラモード表示を更新
        this.updateCameraModeDisplay();
        
        addLog(`🏢 ${facility.name}の視点に切り替えました`, 'system');
    }
    
    // 自動視点切り替えを開始
    startAutoView() {
        this.autoViewEnabled = true;
        this.cameraMode = 'auto';
        
        // 最初の視点切り替えを実行
        this.switchToNextMovingAgent();
        
        // 5秒ごとに切り替え
        this.autoViewInterval = setInterval(() => {
            if (this.autoViewEnabled && window.simulationRunning && !window.simulationPaused) {
                this.switchToNextMovingAgent();
            }
        }, this.autoViewDuration);
        
        addLog('🎬 自動視点切り替えを開始しました（5秒ごと）', 'system');
        this.updateCameraModeDisplay();
    }
    
    // 自動視点切り替えを停止
    stopAutoView() {
        this.autoViewEnabled = false;
        
        if (this.autoViewInterval) {
            clearInterval(this.autoViewInterval);
            this.autoViewInterval = null;
        }
        
        addLog('⏹️ 自動視点切り替えを停止しました', 'system');
    }
    
    // 次の移動中のエージェントに切り替え
    switchToNextMovingAgent() {
        if (!window.agents || window.agents.length === 0) {
            addLog('❌ エージェントが見つかりません', 'system');
            return;
        }
        
        // 移動中のエージェントを優先的に取得
        const movingAgents = window.agents.filter(agent => {
            return agent.movementTarget && 
                   agent.mesh && 
                   !agent.isInConversation;
        });
        
        // 移動中のエージェントがいない場合は全エージェントから選択
        const candidateAgents = movingAgents.length > 0 ? movingAgents : window.agents.filter(agent => agent.mesh);
        
        if (candidateAgents.length === 0) {
            addLog('❌ 表示可能なエージェントが見つかりません', 'system');
            return;
        }
        
        // ランダムにエージェントを選択
        const randomIndex = Math.floor(Math.random() * candidateAgents.length);
        const selectedAgent = candidateAgents[randomIndex];
        
        // エージェント視点に切り替え
        this.targetAgent = selectedAgent;
        this.cameraFollowEnabled = true;
        
        // カメラの回転角度をリセット
        this.cameraRotationX = 0;
        this.cameraRotationY = 0;
        
        // カメラを人物の後ろに配置
        const pos = selectedAgent.mesh.position;
        
        const cameraOffsetX = -8;
        const cameraOffsetZ = 0;
        const cameraOffsetY = 4;
        
        this.camera.position.set(
            pos.x + cameraOffsetX,
            pos.y + cameraOffsetY,
            pos.z + cameraOffsetZ
        );
        this.camera.lookAt(pos.x, pos.y + 2.0, pos.z);
        
        // ステータスメッセージ
        const movingStatus = selectedAgent.movementTarget ? '移動中' : '停止中';
        const destination = selectedAgent.targetLocation ? ` → ${selectedAgent.targetLocation.name}へ` : '';
        addLog(`👤 ${selectedAgent.name}（${movingStatus}${destination}）を追跡中`, 'info');
        
        // エージェント情報パネルを該当のエージェントまでスクロール
        this.scrollToAgentCard(selectedAgent.name);
        
        this.updateCameraModeDisplay();
    }
    
    // エージェントカードまでスクロールする関数
    scrollToAgentCard(agentName) {
        // エージェント名からIDを生成（スペースをアンダースコアに変換）
        const cardId = `agent-card-${agentName.replace(/\s/g, '_')}`;
        const agentCard = document.getElementById(cardId);
        
        if (agentCard) {
            // スムーズスクロールでカードまで移動
            agentCard.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
            
            // カードを強調表示（0.5秒間）
            agentCard.style.transition = 'background-color 0.3s';
            const originalBg = agentCard.style.backgroundColor;
            agentCard.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
            
            setTimeout(() => {
                agentCard.style.backgroundColor = originalBg;
            }, 500);
        }
    }
    
    // カメラをリセット
    resetCamera() {
        // 自動視点を停止
        if (this.autoViewEnabled) {
            this.stopAutoView();
        }
        
        // ターゲットマーカーを削除
        this.removeTargetMarker();
        
        // ハイライトを解除
        if (this.highlightedFacilityMesh) {
            this.unhighlightFacilityMesh(this.highlightedFacilityMesh);
            this.highlightedFacilityMesh = null;
        }
        
        this.cameraMode = 'free';
        this.targetAgent = null;
        this.targetFacility = null;
        this.cameraFollowEnabled = false;
        
        // セグメンテーションマップの場合は初期設定の位置に戻す
        if (window.isSegmentationMap) {
            // 初期位置に戻す
            this.camera.position.set(-1.9, 23.7, -17.1);
            
            // 初期回転を設定
            this.camera.rotation.order = 'XYZ';
            this.camera.rotation.x = -112.6 * Math.PI / 180;
            this.camera.rotation.y = 0.1 * Math.PI / 180;
            this.camera.rotation.z = 179.8 * Math.PI / 180;
            
            // 初期回転を保持
            this.preserveInitialRotation = true;
            
            // 変更を強制的に適用
            this.camera.updateMatrixWorld(true);
            
            console.log(`📷 セグメンテーションマップ: カメラを初期位置にリセット`);
            console.log(`   位置: (-1.9, 23.7, -17.1)`);
            console.log(`   回転: (-112.6°, 0.1°, 179.8°)`);
        }
        // エディターマップの場合は北向き、少し高い位置から見下ろす
        else if (window.isEditorMap) {
            this.camera.position.set(0, 50, 60);
            
            // 見下ろす角度を設定
            this.cameraRotationX = -0.3;     // 少し下向き
            this.cameraRotationY = Math.PI;  // 北向き（Z軸負の方向）
            
            // カメラの向きを更新
            this.updateCameraRotation();
        } else {
            // 通常モードのカメラ位置
            this.camera.position.set(0, 30, 30);
            this.camera.lookAt(0, 0, 0);
            
            // カメラの回転角度をリセット（全体表示では自由な角度を許可）
            this.cameraRotationX = 0;
            this.cameraRotationY = 0;
        }
        
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
            case 'auto':
                if (this.targetAgent) {
                    const movingStatus = this.targetAgent.movementTarget ? '移動中' : '停止中';
                    display.textContent = `🎬 自動視点: ${this.targetAgent.name} (${movingStatus})`;
                    display.style.color = '#4CAF50';
                } else {
                    display.textContent = '🎬 自動視点（待機中）';
                    display.style.color = '#4CAF50';
                }
                break;
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
                
                // マウスで回転を変更する場合は初期回転保持を解除
                if (this.preserveInitialRotation && (deltaX !== 0 || deltaY !== 0)) {
                    this.preserveInitialRotation = false;
                    // 現在のカメラ回転からcameraRotationX/Yを設定
                    this.cameraRotationX = this.camera.rotation.x;
                    this.cameraRotationY = this.camera.rotation.y;
                }
                
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
                
                // 高さの制限を設定（地面より下に潜らないように、上限は柔軟に）
                const minCameraHeight = 0.5; // 地面（Y=0）より少し上
                const maxCameraHeight = 200; // 上限を高めに設定
                this.camera.position.y = Math.max(minCameraHeight, Math.min(maxCameraHeight, this.camera.position.y));
                
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
    
    // 施設メッシュをハイライト
    highlightFacilityMesh(mesh) {
        if (!mesh || !mesh.material) return;
        
        // 元のマテリアル設定を保存
        if (!mesh.userData.originalMaterial) {
            mesh.userData.originalMaterial = {
                emissive: mesh.material.emissive ? mesh.material.emissive.clone() : new THREE.Color(0x000000),
                emissiveIntensity: mesh.material.emissiveIntensity || 0,
                opacity: mesh.material.opacity || 1.0
            };
        }
        
        // ハイライト色を設定（黄色の発光）
        mesh.material.emissive = new THREE.Color(0xffff00);
        mesh.material.emissiveIntensity = 0.6;
        mesh.material.opacity = 0.8;
        
        console.log(`✨ 施設をハイライト: ${mesh.userData.label || 'Unknown'} (ID: ${mesh.userData.segmentId})`);
    }
    
    // 施設メッシュのハイライトを解除
    unhighlightFacilityMesh(mesh) {
        if (!mesh || !mesh.material || !mesh.userData.originalMaterial) return;
        
        // 元のマテリアル設定に戻す
        const original = mesh.userData.originalMaterial;
        mesh.material.emissive = original.emissive.clone();
        mesh.material.emissiveIntensity = original.emissiveIntensity;
        mesh.material.opacity = original.opacity;
        
        console.log(`🔅 施設のハイライトを解除: ${mesh.userData.label || 'Unknown'} (ID: ${mesh.userData.segmentId})`);
    }
    
    // カテゴリ全体をハイライト
    highlightCategory(category, meshGroups) {
        if (!meshGroups || !meshGroups[category]) {
            console.warn(`カテゴリが見つかりません: ${category}`);
            return;
        }
        
        const group = meshGroups[category];
        const meshes = [];
        
        // グループ内の全メッシュをハイライト
        group.traverse((object) => {
            if (object.isMesh && object.material) {
                // 元のマテリアル設定を保存
                if (!object.userData.originalMaterial) {
                    object.userData.originalMaterial = {
                        emissive: object.material.emissive ? object.material.emissive.clone() : new THREE.Color(0x000000),
                        emissiveIntensity: object.material.emissiveIntensity || 0,
                        opacity: object.material.opacity || 1.0
                    };
                }
                
                // ハイライト色を設定（シアン色の発光）
                object.material.emissive = new THREE.Color(0x00ffff);
                object.material.emissiveIntensity = 0.5;
                object.material.opacity = 0.9;
                
                meshes.push(object);
            }
        });
        
        // ハイライトされたメッシュを記録
        this.highlightedCategoryMeshes.set(category, meshes);
        
        console.log(`✨ カテゴリをハイライト: ${category} (${meshes.length}メッシュ)`);
    }
    
    // カテゴリのハイライトを解除
    unhighlightCategory(category) {
        if (!this.highlightedCategoryMeshes.has(category)) return;
        
        const meshes = this.highlightedCategoryMeshes.get(category);
        
        meshes.forEach(mesh => {
            if (mesh && mesh.material && mesh.userData.originalMaterial) {
                // 元のマテリアル設定に戻す
                const original = mesh.userData.originalMaterial;
                mesh.material.emissive = original.emissive.clone();
                mesh.material.emissiveIntensity = original.emissiveIntensity;
                mesh.material.opacity = original.opacity;
            }
        });
        
        this.highlightedCategoryMeshes.delete(category);
        
        console.log(`🔅 カテゴリのハイライトを解除: ${category} (${meshes.length}メッシュ)`);
    }
    
    // 全カテゴリのハイライトを解除
    unhighlightAllCategories() {
        const categories = Array.from(this.highlightedCategoryMeshes.keys());
        categories.forEach(category => {
            this.unhighlightCategory(category);
        });
        console.log(`🔅 全カテゴリのハイライトを解除しました`);
    }
    
    // カテゴリハイライトのトグル
    toggleCategoryHighlight(category, meshGroups) {
        if (this.highlightedCategoryMeshes.has(category)) {
            this.unhighlightCategory(category);
            return false; // ハイライト解除
        } else {
            this.highlightCategory(category, meshGroups);
            return true; // ハイライト設定
        }
    }
}

// グローバルに公開
window.CameraSystem = CameraSystem; 