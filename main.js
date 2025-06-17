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

// Three.jsの初期化
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
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
    
    // 地面
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x90EE90,
        emissive: 0x90EE90,
        emissiveIntensity: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
                
    // 場所の作成
    createLocations();
    
    // マウスコントロール
    setupMouseControls();
    
    // アニメーションループ
    animate();

    // 街のレイアウトを生成
    cityLayout = new CityLayout();
    cityLayout.generateRoads();
    //cityLayout.placeBuildings();

    // 道路の描画
    cityLayout.drawRoads();

    // パネルのHTMLを更新
    updatePanelHTML();
    
    // パネルのドラッグ機能を設定
    setupPanelDrag();
}

// マウスコントロール
function setupMouseControls() {
    let mouseX = 0, mouseY = 0;
    let isMouseDown = false;
    let isPanelDragging = false; // パネルドラッグ中かどうかのフラグ
    
    document.addEventListener('mousemove', (event) => {
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
    agentPersonalities.forEach((data, index) => {
        const agent = new Agent(data, index);
        agents.push(agent);
    });
    updateAgentInfo();
}

// 時間システム
function updateTime() {
    if (!simulationRunning || simulationPaused) return;
    
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
        skyColor = new THREE.Color(0xffa500); // 朝夕
        ambientIntensity = 0.4;
        directionalIntensity = 0.5;
    } else {
        skyColor = new THREE.Color(0x87CEEB); // 昼
        ambientIntensity = 0.6;
        directionalIntensity = 0.8;
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



