// グローバル変数
let scene, camera, renderer;
let agents = [];
let locations = [];
let apiKey = '';
let simulationRunning = false;
let simulationPaused = false;
let timeSpeed = 1;
let currentTime = 8 * 60; // 8:00 AM in minutes
const clock = new THREE.Clock();

// カメラ制御用インデックス
let currentAgentIndex = 0;
let currentFacilityIndex = 0;

// カメラモード管理
let cameraMode = 'free'; // 'free', 'agent', 'facility'
let targetAgent = null;
let targetFacility = null;
let cameraFollowEnabled = false;

// 時間制御用の変数
let lastTimeUpdate = 0;
let timeUpdateInterval = 0.1; // 0.1秒ごとに時間を更新（1xの場合）

// Three.jsの初期化
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a0026);
    //scene.fog = new THREE.Fog(0x87CEEB, 30, 60);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 35, 35);
    camera.lookAt(0, 0, 0);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    
    // ライティング
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 30, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // 街のレイアウトを生成
    cityLayout = new CityLayout();
    cityLayout.generateRoads();
    //cityLayout.placeBuildings();

    // 地面
    const groundSize = cityLayout.gridSize;
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 100, 100);
    const groundMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x220044,
        wireframe: true
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    
    // 場所の作成
    createLocations();
    
    // マウスコントロール
    setupMouseControls();
    
    // アニメーションループ
    animate();

    // 道路の描画
    cityLayout.drawRoads();
    
    // 建物の描画
    cityLayout.drawBuildings();

    // パネルのHTMLを更新
    updatePanelHTML();
    
    // パネルのドラッグ機能を設定
    setupPanelDrag();

    // カメラ制御ボタンのイベント登録
    const personBtn = document.getElementById('personViewBtn');
    const facilityBtn = document.getElementById('facilityViewBtn');
    const resetBtn = document.getElementById('resetCamera');

    if (personBtn) {
        personBtn.addEventListener('click', () => {
            if (agents.length === 0) return;
            currentAgentIndex = (currentAgentIndex + 1) % agents.length;
            focusCameraOnAgentByIndex(currentAgentIndex);
        });
    }
    if (facilityBtn) {
        facilityBtn.addEventListener('click', () => {
            const facilities = locations.filter(loc => !loc.isHome);
            if (facilities.length === 0) return;
            currentFacilityIndex = (currentFacilityIndex + 1) % facilities.length;
            focusCameraOnFacilityByIndex(currentFacilityIndex);
        });
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', resetCamera);
    }

    // 道路表示ボタンのイベント登録
    const toggleRoadBtn = document.getElementById('toggleRoadNetwork');
    const clearRoadBtn = document.getElementById('clearRoadVisualization');

    if (toggleRoadBtn) {
        toggleRoadBtn.addEventListener('click', () => {
            cityLayout.visualizeRoadNetwork();
            addLog('🛣️ 道路ネットワークの視覚化を開始しました', 'system');
        });
    }
    if (clearRoadBtn) {
        clearRoadBtn.addEventListener('click', () => {
            cityLayout.clearRoadNetworkVisualization();
            cityLayout.clearPathVisualization();
            addLog('🗑️ 道路表示をクリアしました', 'system');
        });
    }
}

// マウスコントロール
function setupMouseControls() {
    let mouseX = 0, mouseY = 0;
    let isMouseDown = false;
    let isPanelDragging = false; // パネルドラッグ中かどうかのフラグ
    
    document.addEventListener('mousemove', (event) => {
        // 人物視点モード中はマウス操作を無効
        if (cameraMode === 'agent' && cameraFollowEnabled) {
            return;
        }
        
        if (isMouseDown && !isPanelDragging) { // パネルドラッグ中でない場合のみ地図を回転
            const deltaX = event.clientX - mouseX;
            const deltaY = event.clientY - mouseY;
            
            // マウスの移動方向と逆方向にカメラを移動
            camera.position.x -= deltaX * 0.1;
            camera.position.z -= deltaY * 0.1;
            camera.lookAt(0, 0, 0);
        }
        mouseX = event.clientX;
        mouseY = event.clientY;
    });
    
    document.addEventListener('mousedown', () => {
        isMouseDown = true;
    });
    
    document.addEventListener('mouseup', () => {
        isMouseDown = false;
    });
    
    document.addEventListener('wheel', (event) => {
        // 人物視点モード中はズーム操作を無効
        if (cameraMode === 'agent' && cameraFollowEnabled) {
            return;
        }
        
        if (!isPanelDragging) { // パネルドラッグ中でない場合のみズーム可能
            const scale = event.deltaY > 0 ? 1.1 : 0.9;
            camera.position.multiplyScalar(scale);
            camera.position.y = Math.max(10, Math.min(50, camera.position.y));
            camera.lookAt(0, 0, 0);
        }
    });

    // パネルドラッグ状態を監視する関数をグローバルに公開
    window.setPanelDragging = function(dragging) {
        isPanelDragging = dragging;
    };
}

// エージェントの作成
function createAgents() {
    // すでに初期エージェントが存在する場合は何もしない
    if (agents.length > 0) return;
    agentPersonalities.forEach((data, index) => {
        const agent = new Agent(data, index);
        agents.push(agent);
    });
    updateAgentInfo();
}

// 時間システム
function updateTime() {
    if (!simulationRunning || simulationPaused) return;
    
    const currentElapsedTime = clock.getElapsedTime();
    
    // 時間更新の間隔を制御
    if (currentElapsedTime - lastTimeUpdate < timeUpdateInterval) {
        return;
    }
    
    lastTimeUpdate = currentElapsedTime;
    
    currentTime += timeSpeed;
    if (currentTime >= 24 * 60) {
        currentTime = 0;
    }
    
    const hours = Math.floor(currentTime / 60);
    const minutes = Math.floor(currentTime % 60);
    const timeString = `${hours < 12 ? '午前' : '午後'} ${hours === 0 ? 12 : hours > 12 ? hours - 12 : hours}:${minutes.toString().padStart(2, '0')}`;
    document.getElementById('time-display').textContent = timeString;
    
    // 時間帯による環境の変化
    updateEnvironment(hours);
}

function updateEnvironment(hour) {
    // 空の色を時間帯に応じて変更
    let skyColor;
    let ambientIntensity;
    let directionalIntensity;
    
    if (hour < 6 || hour > 20) {
        skyColor = new THREE.Color(0x1a1a2e); // 夜
        ambientIntensity = 0.2;
        directionalIntensity = 0.3;
    } else if (hour < 8 || hour > 18) {
        skyColor = new THREE.Color(0x3a2a1a); // 朝夕（やや暗めブラウン）
        ambientIntensity = 0.25;
        directionalIntensity = 0.35;
    } else {
        skyColor = new THREE.Color(0x3a4a5a); // 昼（暗めブルーグレー）
        ambientIntensity = 0.18;
        directionalIntensity = 0.25;
    }
    
    scene.background = skyColor;
    
    // ライトの強度を更新
    scene.children.forEach(child => {
        if (child instanceof THREE.AmbientLight) {
            child.intensity = ambientIntensity;
        } else if (child instanceof THREE.DirectionalLight) {
            child.intensity = directionalIntensity;
        }
    });
}

// UI更新
function updateAgentInfo() {
    const agentsList = document.getElementById('agents-list');
    agentsList.innerHTML = '';
    
    agents.forEach(agent => {
        const agentCard = document.createElement('div');
        agentCard.className = 'agent-card';
        
        // 基本情報
        const nameDiv = document.createElement('div');
        nameDiv.className = 'agent-name';
        nameDiv.innerHTML = `
            <span class="agent-status status-active"></span>
            ${agent.name} (${agent.age}歳)
            ${agent.isThinking ? '<span class="thinking-indicator"></span>' : ''}
        `;
        agentCard.appendChild(nameDiv);
        
        // 現在の情報
        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `
            <div class="agent-info-row">📍 場所: ${agent.currentLocation.name}</div>
            <div class="agent-info-row">⚡ 体力: ${Math.round(agent.energy * 100)}%</div>
            <div class="agent-info-row">😊 気分: ${agent.mood}</div>
        `;
        agentCard.appendChild(infoDiv);
        
        // 現在の思考
        if (agent.currentThought) {
            const thoughtDiv = document.createElement('div');
            thoughtDiv.className = 'agent-thought';
            thoughtDiv.textContent = agent.currentThought;
            agentCard.appendChild(thoughtDiv);
        }
        
        // 最近の記憶
        if (agent.shortTermMemory.length > 0) {
            const memoryDiv = document.createElement('div');
            memoryDiv.className = 'agent-memory';
            memoryDiv.innerHTML = '<strong>最近の記憶:</strong>';
            
            const recentMemories = agent.shortTermMemory.slice(-3);
            recentMemories.forEach(memory => {
                const memoryItem = document.createElement('div');
                memoryItem.className = 'memory-item';
                memoryItem.textContent = `• ${memory.event}`;
                memoryDiv.appendChild(memoryItem);
            });
            
            agentCard.appendChild(memoryDiv);
        }
        
        // 関係性情報
        const relationshipsDiv = document.createElement('div');
        relationshipsDiv.className = 'relationship-info';
        relationshipsDiv.innerHTML = '<strong>関係性:</strong>';
        
        let hasRelationships = false;
        agent.relationships.forEach((rel, name) => {
            if (rel.interactionCount > 0) {
                hasRelationships = true;
                const relItem = document.createElement('div');
                relItem.className = 'relationship-item';
                relItem.innerHTML = `
                    <span>${name}:</span>
                    <div class="relationship-bar">
                        <div class="relationship-fill" style="width: ${rel.affinity * 100}%"></div>
                    </div>
                `;
                relationshipsDiv.appendChild(relItem);
            }
        });
        
        if (hasRelationships) {
            agentCard.appendChild(relationshipsDiv);
        }
        
        agentsList.appendChild(agentCard);
    });
}

// シミュレーション制御
function startSimulation() {
    apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
        alert('OpenAI APIキーを入力してください');
        return;
    }

    // APIキーの形式を検証
    if (!apiKey.startsWith('sk-')) {
        alert('無効なAPIキー形式です。sk-で始まる有効なAPIキーを入力してください。');
        return;
    }
    
    simulationRunning = true;
    document.getElementById('pauseBtn').disabled = false;
    
    // エージェントの作成
    createAgents();
    
    addLog('<span style="color: #4CAF50;">🎬 シミュレーション開始</span>');
}

function pauseSimulation() {
    simulationPaused = !simulationPaused;
    document.getElementById('pauseBtn').textContent = simulationPaused ? '再開' : '一時停止';
    
    if (simulationPaused) {
        addLog('<span style="color: #FFC107;">⏸️ シミュレーション一時停止</span>');
    } else {
        addLog('<span style="color: #4CAF50;">▶️ シミュレーション再開</span>');
    }
}

function setTimeSpeed() {
    const speeds = [1, 2, 5, 10];
    const currentIndex = speeds.indexOf(timeSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    timeSpeed = speeds[nextIndex];
    
    // 時間更新間隔を速度に応じて調整
    switch (timeSpeed) {
        case 1:
            timeUpdateInterval = 0.1; // 0.1秒ごと（最も遅い）
            break;
        case 2:
            timeUpdateInterval = 0.05; // 0.05秒ごと
            break;
        case 5:
            timeUpdateInterval = 0.02; // 0.02秒ごと
            break;
        case 10:
            timeUpdateInterval = 0.01; // 0.01秒ごと（最も速い）
            break;
    }
    
    document.getElementById('speed').textContent = `${timeSpeed}x`;
}

// アニメーションループ
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    
    // 時間の更新
    updateTime();
    
    // エージェントの更新
    if (agents.length > 0) {
        agents.forEach(agent => {
            agent.update(deltaTime);
        });
        
        // UI更新（1秒ごと）
        if (Math.floor(clock.getElapsedTime()) % 1 === 0) {
            updateAgentInfo();
        }
    }
    
    // カメラ追従の更新
    updateCameraFollow();
    
    // 追従対象の表示を更新（0.5秒ごと）
    if (Math.floor(clock.getElapsedTime() * 2) % 1 === 0) {
        updateCameraTargetDisplay();
    }
    
    renderer.render(scene, camera);
}

// ウィンドウリサイズ対応
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 初期化
init();

// APIプロバイダー選択値を取得
function getSelectedApiProvider() {
    const radio = document.querySelector('input[name="apiProvider"]:checked');
    return radio ? radio.value : 'openai';
}
window.getSelectedApiProvider = getSelectedApiProvider;

// カメラ追従対象の表示を更新
function updateCameraTargetDisplay() {
    const targetDisplay = document.getElementById('cameraTargetDisplay');
    const targetName = document.getElementById('cameraTargetName');
    
    if (!targetDisplay || !targetName) return;
    
    if (cameraMode === 'agent' && targetAgent) {
        targetDisplay.style.display = 'block';
        
        // 人物の移動状態を確認
        const isMoving = targetAgent.movementTarget !== null;
        const movementStatus = isMoving ? ' (移動中)' : ' (停止中)';
        
        targetName.textContent = `👤 ${targetAgent.name} を追従中${movementStatus}`;
        targetName.style.color = isMoving ? '#4CAF50' : '#888';
    } else if (cameraMode === 'facility' && targetFacility) {
        targetDisplay.style.display = 'block';
        targetName.textContent = `🏢 ${targetFacility.name} を表示中`;
        targetName.style.color = '#FFC107';
    } else {
        targetDisplay.style.display = 'none';
    }
}

// カメラモード表示を更新
function updateCameraModeDisplay() {
    const display = document.getElementById('cameraModeDisplay');
    if (!display) return;
    
    switch (cameraMode) {
        case 'agent':
            if (targetAgent) {
                display.textContent = `${targetAgent.name}の視点`;
                display.style.color = '#4CAF50';
            }
            break;
        case 'facility':
            if (targetFacility) {
                display.textContent = `${targetFacility.name}の視点`;
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
    updateCameraTargetDisplay();
}

function focusCameraOnAgentByIndex(index) {
    if (agents.length === 0) return;
    
    const agent = agents[index % agents.length];
    if (!agent || !agent.mesh) return;
    
    // カメラモードを設定
    cameraMode = 'agent';
    targetAgent = agent;
    cameraFollowEnabled = true;
    
    // カメラを人物の後ろに配置
    const pos = agent.mesh.position;
    const agentRotation = agent.mesh.rotation.y;
    
    // 人物の後ろ8単位、上8単位の位置にカメラを配置
    const cameraOffsetX = -Math.sin(agentRotation) * 8;
    const cameraOffsetZ = -Math.cos(agentRotation) * 8;
    
    camera.position.set(
        pos.x + cameraOffsetX,
        pos.y + 8,
        pos.z + cameraOffsetZ
    );
    camera.lookAt(pos.x, pos.y + 1, pos.z);
    
    // カメラモード表示を更新
    updateCameraModeDisplay();
    
    addLog(`👁️ ${agent.name}の視点に切り替えました（追従モード有効）`, 'system');
}

function focusCameraOnFacilityByIndex(index) {
    // 施設のみ（isHomeがtrueでないもの）
    const facilities = locations.filter(loc => !loc.isHome);
    if (facilities.length === 0) return;
    
    const facility = facilities[index % facilities.length];
    
    // カメラモードを設定
    cameraMode = 'facility';
    targetFacility = facility;
    cameraFollowEnabled = false; // 施設は固定なので追従不要
    
    const pos = facility.position;
    camera.position.set(pos.x + 10, 10, pos.z + 10);
    camera.lookAt(pos.x, pos.y, pos.z);
    
    // カメラモード表示を更新
    updateCameraModeDisplay();
    
    addLog(`🏢 ${facility.name}の視点に切り替えました`, 'system');
}

function resetCamera() {
    cameraMode = 'free';
    targetAgent = null;
    targetFacility = null;
    cameraFollowEnabled = false;
    
    camera.position.set(0, 30, 30);
    camera.lookAt(0, 0, 0);
    
    // カメラモード表示を更新
    updateCameraModeDisplay();
    
    addLog(`🗺️ 全体表示に切り替えました`, 'system');
}

// カメラ追従更新関数
function updateCameraFollow() {
    if (!cameraFollowEnabled || cameraMode !== 'agent' || !targetAgent || !targetAgent.mesh) {
        return;
    }
    
    const agent = targetAgent;
    const pos = agent.mesh.position;
    const agentRotation = agent.mesh.rotation.y;
    
    // 人物の後ろ8単位、上8単位の位置にカメラを配置
    const cameraOffsetX = -Math.sin(agentRotation) * 8;
    const cameraOffsetZ = -Math.cos(agentRotation) * 8;
    
    // スムーズな追従のための補間
    const targetX = pos.x + cameraOffsetX;
    const targetY = pos.y + 8;
    const targetZ = pos.z + cameraOffsetZ;
    
    // 現在のカメラ位置から目標位置への補間
    const lerpFactor = 0.1; // 補間係数（小さいほどスムーズ）
    camera.position.x += (targetX - camera.position.x) * lerpFactor;
    camera.position.y += (targetY - camera.position.y) * lerpFactor;
    camera.position.z += (targetZ - camera.position.z) * lerpFactor;
    
    // カメラの向きを人物に向ける
    camera.lookAt(pos.x, pos.y + 1, pos.z);
}



