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

// カメラ移動制御用変数
let cameraMoveSpeed = 15.0; // 移動速度
let cameraKeys = {
    w: false,
    a: false,
    s: false,
    d: false,
    q: false, // 上昇
    e: false  // 下降
};

// フィールド色設定
let fieldColor = 0xB8E6B8; // デフォルトは緑
let groundMesh = null;
let infiniteGroundMesh = null;

// 天候システム（weather.jsで定義されるため、ここでは宣言のみ）

// グローバル変数をwindowに公開
window.agents = agents;

// LLMへの問い合わせ回数を管理
let llmCallCount = 0;

// カメラ制御用インデックス
let currentAgentIndex = 0;
let currentFacilityIndex = 0;
let targetAgent = null;
let targetFacility = null;
let cameraFollowEnabled = false;
let cameraMode = 'free'; // 'free', 'agent', 'facility'

// コミュニケーション機能の変数（新しい管理システムで置き換え）

// 時間制御用の変数
let lastTimeUpdate = 0;
let timeUpdateInterval = timeConfig.timeUpdateInterval / 1000; // configから読み込み（秒単位に変換）

// localStorageからAPIキーを読み込み
function loadApiKeyFromStorage() {
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey) {
        document.getElementById('apiKey').value = savedApiKey;
        apiKey = savedApiKey;
    }
}

// APIキーをlocalStorageに保存
function saveApiKeyToStorage(key) {
    localStorage.setItem('openai_api_key', key);
}

// localStorageからプロンプトを読み込み
function loadPromptFromStorage() {
    const savedPrompt = localStorage.getItem('topic_prompt');
    if (savedPrompt) {
        document.getElementById('topicPrompt').value = savedPrompt;
    }
}

// プロンプトをlocalStorageに保存
function savePromptToStorage(prompt) {
    localStorage.setItem('topic_prompt', prompt);
}

// LLMへの問い合わせ回数を更新
function updateLlmCallCount() {
    llmCallCount++;
    const countDisplay = document.getElementById('llmCallCount');
    if (countDisplay) {
        countDisplay.textContent = llmCallCount;
    }
}

// LLMへの問い合わせ回数を表示する要素を更新
function updateLlmCallCountDisplay() {
    const countDisplay = document.getElementById('llmCallCount');
    if (countDisplay) {
        countDisplay.textContent = llmCallCount;
    }
}
// Three.jsの初期化
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // 空色の背景
    
    // 霧（フォグ）を追加して遠景を自然に（薄めに設定）
    scene.fog = new THREE.Fog(0x87CEEB, 100, 400);
    
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
    
    // 自宅を先に生成（建物生成時の重複チェックのため）
    if (typeof homeManager !== 'undefined') {
        homeManager.initializeHomes();
        console.log('自宅の初期化が完了しました');
    }
    
    // 建物と施設を生成（自宅との重複チェックを含む）
    cityLayout.generateBuildings();
    cityLayout.generateFacilities();
    console.log('建物と施設の生成が完了しました');

    // 無限大の地面（遠景用）
    const infiniteGroundGeometry = new THREE.PlaneGeometry(1000, 1000, 1, 1);
    const infiniteGroundMaterial = new THREE.MeshBasicMaterial({ 
        color: fieldColor, // 設定可能な色
        transparent: false // 透過を無効化
    });
    infiniteGroundMesh = new THREE.Mesh(infiniteGroundGeometry, infiniteGroundMaterial);
    infiniteGroundMesh.rotation.x = -Math.PI / 2;
    infiniteGroundMesh.position.y = -0.02; // 現在の地面より少し下に配置
    scene.add(infiniteGroundMesh);
    
    // 遠景の山々は削除（シンプルな遠景に）
    // createDistantMountains();
    
    // 地面（塗りつぶし）
    const groundSize = cityLayout.gridSize;
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 1, 1);
    const groundMaterial = new THREE.MeshBasicMaterial({ 
        color: fieldColor, // 設定可能な色
        transparent: true,
        opacity: 0.6
    });
    groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = 0.01; // 少し上に配置
    scene.add(groundMesh);
    
    // 地面のグリッド線（手動で作成）
    const gridGroup = new THREE.Group();
    const gridSize = groundSize;
    const gridSpacing = 2; // グリッドの間隔を小さく
    
    // 縦線
    for (let x = -gridSize/2; x <= gridSize/2; x += gridSpacing) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, 0, -gridSize/2),
            new THREE.Vector3(x, 0, gridSize/2)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xFFFFFF, 
            transparent: true, 
            opacity: 0.8 
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        gridGroup.add(line);
    }
    
    // 横線
    for (let z = -gridSize/2; z <= gridSize/2; z += gridSpacing) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-gridSize/2, 0, z),
            new THREE.Vector3(gridSize/2, 0, z)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xFFFFFF, 
            transparent: true, 
            opacity: 0.8 
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        gridGroup.add(line);
    }
    
    gridGroup.position.y = 0.03; // 床より少し上に配置
    scene.add(gridGroup);
    
    // 場所の作成
    createLocations();
    
    // 自宅の3Dオブジェクトを作成
    if (typeof homeManager !== 'undefined' && typeof createAgentHome === 'function') {
        const allHomes = homeManager.getAllHomes();
        allHomes.forEach(home => {
            createAgentHome(home);
        });
        console.log(`${allHomes.length}軒の自宅の3Dオブジェクトを作成しました`);
    }
    
    // マウスコントロール
    setupMouseControls();
    
    // アニメーションループ
    animate();

    // 道路の描画
    cityLayout.drawRoads();
    
    // 建物の描画
    cityLayout.drawBuildings();
    
    // 施設の描画
    cityLayout.drawFacilities();
    
    // 入り口接続は通常の道路描画に統合済み

    // パネルのHTMLを更新
    updatePanelHTML();
    
    // パネルのドラッグ機能を設定
    setupPanelDrag();
    
    // エージェント詳細モーダルの初期化
    setupAgentDetailModal();

    // localStorageからAPIキーを読み込み
    loadApiKeyFromStorage();

    // APIキーの変更を監視してlocalStorageに保存
    const apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput) {
        apiKeyInput.addEventListener('input', (e) => {
            const newKey = e.target.value.trim();
            if (newKey) {
                saveApiKeyToStorage(newKey);
            }
        });
    }

    // localStorageからプロンプトを読み込み
    loadPromptFromStorage();

    // プロンプトの変更を監視してlocalStorageに保存
    const topicPromptInput = document.getElementById('topicPrompt');
    if (topicPromptInput) {
        topicPromptInput.addEventListener('input', (e) => {
            const newPrompt = e.target.value.trim();
            savePromptToStorage(newPrompt);
        });
    }

    // タブ機能の初期化
    setupTabNavigation();
    
    // APIアクセス回数の表示を初期化
    updateLlmCallCountDisplay();

    // 保存されたエージェントの自動読み込みは無効化
    // 手動で「保存されたエージェントを読み込み」ボタンを押してから読み込む

    // 天候システムの初期化
    if (typeof initWeatherSystem === 'function') {
        initWeatherSystem();
        createWeatherDisplay();
    }

    // 車両システムの初期化（道路生成後に実行）
    setTimeout(() => {
        if (typeof initializeVehicleSystem === 'function') {
            initializeVehicleSystem();
        }
    }, 1000); // 1秒後に初期化

    // シミュレーション制御ボタンのイベント登録
    const startBtn = document.getElementById('startSimulationBtn');
    if (startBtn) {
        console.log('Setting up start button listener in init');
        startBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Start button clicked in init');
            startSimulation();
        });
    } else {
        console.log('Start button not found in init');
    }
    
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            pauseSimulation();
        });
    }
    
    const speedBtn = document.getElementById('timeSpeedBtn');
    if (speedBtn) {
        speedBtn.addEventListener('click', function(e) {
            e.preventDefault();
            setTimeSpeed();
        });
    }
    
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

    // 入り口接続表示ボタンのイベント登録
    const toggleEntranceBtn = document.getElementById('toggleEntranceConnections');
    if (toggleEntranceBtn) {
        toggleEntranceBtn.addEventListener('click', () => {
            if (cityLayout.entranceConnections && cityLayout.entranceConnections.length > 0) {
                // 入り口接続を非表示
                for (const connection of cityLayout.entranceConnections) {
                    scene.remove(connection);
                }
                cityLayout.entranceConnections = [];
                addLog('🚪 入り口接続を非表示にしました', 'system');
            } else {
                // 入り口接続は通常の道路として常に表示されています
                addLog('🚪 入り口接続は通常の道路として常に表示されています', 'system');
            }
        });
    }

    // 車両システムのイベント登録
    const vehicleCountSlider = document.getElementById('vehicleCount');
    const currentVehicleCount = document.getElementById('currentVehicleCount');
    const vehicleStatsCurrent = document.getElementById('vehicleStatsCurrent');
    const vehicleStatsInterval = document.getElementById('vehicleStatsInterval');
    const clearAllVehiclesBtn = document.getElementById('clearAllVehiclesBtn');
    const toggleVehicleSystemBtn = document.getElementById('toggleVehicleSystemBtn');

    if (vehicleCountSlider) {
        vehicleCountSlider.addEventListener('input', (e) => {
            const count = parseInt(e.target.value);
            currentVehicleCount.textContent = count;
            setVehicleCount(count);
        });
    }

    if (clearAllVehiclesBtn) {
        clearAllVehiclesBtn.addEventListener('click', () => {
            if (vehicleManager) {
                vehicleManager.clearAllVehicles();
                addLog('🚗 すべての車両を削除しました', 'system');
            }
        });
    }

    if (toggleVehicleSystemBtn) {
        toggleVehicleSystemBtn.addEventListener('click', () => {
            if (vehicleManager) {
                const isEnabled = vehicleManager.maxVehicles > 0;
                if (isEnabled) {
                    vehicleManager.setMaxVehicles(0);
                    toggleVehicleSystemBtn.textContent = '車両システムON';
                    addLog('🚗 車両システムを停止しました', 'system');
                } else {
                    vehicleManager.setMaxVehicles(15);
                    toggleVehicleSystemBtn.textContent = '車両システムOFF';
                    addLog('🚗 車両システムを開始しました', 'system');
                }
            }
        });
    }

    // 車両統計の定期更新
    setInterval(() => {
        if (vehicleManager) {
            const stats = vehicleManager.getStats();
            if (vehicleStatsCurrent) vehicleStatsCurrent.textContent = stats.current;
            if (vehicleStatsInterval) vehicleStatsInterval.textContent = stats.spawnInterval;
        }
    }, 1000);

    // フィールド色選択ボタンのイベント登録
    const colorButtons = document.querySelectorAll('.color-btn');
    colorButtons.forEach(button => {
        button.addEventListener('click', () => {
            const colorKey = button.getAttribute('data-color');
            if (fieldColorPresets[colorKey]) {
                const colorHex = fieldColorPresets[colorKey].color;
                changeFieldColor(colorHex);
                
                // 選択されたボタンをハイライト
                colorButtons.forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
                
                addLog(`🎨 フィールド色を${fieldColorPresets[colorKey].name}に変更しました`, 'system');
            }
        });
    });
    
    // デフォルトでグリーンを選択状態にする
    const greenButton = document.querySelector('[data-color="green"]');
    if (greenButton) {
        greenButton.classList.add('selected');
    }

    // コミュニケーション機能のイベント登録
    const callAgentBtn = document.getElementById('callAgentBtn');
    const messageAgentBtn = document.getElementById('messageAgentBtn');
    const messageModal = document.getElementById('messageModal');
    const closeMessageModal = document.getElementById('closeMessageModal');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const messageInput = document.getElementById('messageInput');

    if (callAgentBtn) {
        callAgentBtn.addEventListener('click', startCall);
    }
    if (messageAgentBtn) {
        messageAgentBtn.addEventListener('click', openMessageModal);
    }
    if (closeMessageModal) {
        closeMessageModal.addEventListener('click', closeMessageModalHandler);
    }
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessage);
    }
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // モーダルの外側クリックで閉じる
    if (messageModal) {
        messageModal.addEventListener('click', (e) => {
            if (e.target === messageModal) {
                closeMessageModalHandler();
            }
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
    console.log('createAgents called');
    console.log('agentPersonalities:', agentPersonalities);
    
    // すでに初期エージェントが存在する場合は何もしない
    if (agents.length > 0) {
        console.log('Agents already exist, skipping creation');
        return;
    }
    
    agentPersonalities.forEach((data, index) => {
        console.log('Creating agent:', data.name);
        
        // エージェントにランダムで自宅を割り当て
        const home = homeManager.getRandomAvailableHome();
        if (home) {
            data.home = home;
            home.occupant = data.name;
        } else {
            console.error(`エージェント「${data.name}」に自宅を割り当てできませんでした。`);
            return;
        }
        
        const agent = new Agent(data, index);
        agents.push(agent);
    });
    
    console.log('Created agents:', agents.length);
    updateAgentInfo();
}

// 時間システム
function updateTime() {
    if (!simulationRunning || simulationPaused) return;
    
    const currentElapsedTime = clock.getElapsedTime();
    
    // 時間更新の間隔を制御（configから読み込み）
    if (currentElapsedTime - lastTimeUpdate < timeUpdateInterval) {
        return;
    }
    
    lastTimeUpdate = currentElapsedTime;
    
    // 1日の長さをconfigから計算（分単位）
    const dayLengthMinutes = timeConfig.dayLengthMinutes;
    const timeIncrement = (24 * 60) / (dayLengthMinutes * 60); // 1秒あたりの時間増分
    
    currentTime += timeSpeed * timeIncrement;
    if (currentTime >= 24 * 60) {
        currentTime = 0;
    }
    
    const hours = Math.floor(currentTime / 60);
    const minutes = Math.floor(currentTime % 60);
    
    // 時間表示形式をconfigから読み込み
    let timeString;
    if (timeConfig.timeFormat === '24hour') {
        timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } else {
        timeString = `${hours < 12 ? '午前' : '午後'} ${hours === 0 ? 12 : hours > 12 ? hours - 12 : hours}:${minutes.toString().padStart(2, '0')}`;
    }
    
    if (timeConfig.showTime) {
        document.getElementById('time-display').textContent = timeString;
    }
    
    // 時間帯による環境の変化
    updateEnvironment(hours);
}

function updateEnvironment(hour) {
    // 天候システムが有効な場合は、天候による環境効果を優先
    if (weatherSystem) {
        weatherSystem.applyWeatherEffects();
        return;
    }
    
    // 従来の時間帯による環境変化（天候システムが無効な場合のフォールバック）
    let skyColor;
    let fogColor;
    let ambientIntensity;
    let directionalIntensity;
    
    if (hour < 6 || hour > 20) {
        skyColor = new THREE.Color(0x1a1a2e); // 夜
        fogColor = new THREE.Color(0x1a1a2e);
        ambientIntensity = 0.2;
        directionalIntensity = 0.3;
    } else if (hour < 8 || hour > 18) {
        skyColor = new THREE.Color(0x87CEEB); // 朝夕（空色）
        fogColor = new THREE.Color(0x87CEEB);
        ambientIntensity = 0.25;
        directionalIntensity = 0.35;
    } else {
        skyColor = new THREE.Color(0x87CEEB); // 昼（明るい空色）
        fogColor = new THREE.Color(0x87CEEB);
        ambientIntensity = 0.18;
        directionalIntensity = 0.25;
    }
    
    scene.background = skyColor;
    scene.fog.color = fogColor;
    
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
            <button class="agent-detail-btn" onclick="showAgentDetailModal(${agents.indexOf(agent)})">詳細</button>
        `;
        agentCard.appendChild(nameDiv);
        
        // 背景情報
        if (agent.background) {
            const backgroundDiv = document.createElement('div');
            backgroundDiv.className = 'agent-background';
            backgroundDiv.innerHTML = `
                <div class="agent-info-row">🏠 出身地: ${agent.background.birthplace}</div>
                <div class="agent-info-row">🎓 学歴: ${agent.background.education}</div>
                <div class="agent-info-row">💼 職業: ${agent.background.career}</div>
                <div class="agent-info-row">🎨 趣味: ${agent.background.hobbies.join(', ')}</div>
                <div class="agent-info-row">⛪ 宗教: ${agent.background.religion}</div>
                <div class="agent-info-row">👨‍👩‍👧‍👦 家族: ${agent.background.family}</div>
            `;
            agentCard.appendChild(backgroundDiv);
        }
        
        // 現在の情報
        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `
            <div class="agent-info-row">📍 場所: ${agent.currentLocation.name}</div>
            <div class="agent-info-row">🎯 目的地: ${agent.getDestinationInfo()}</div>
            <div class="agent-info-row">⚡ 体力: ${Math.round(agent.energy * 100)}%</div>
            <div class="agent-info-row">😊 気分: ${agent.mood}</div>
        `;
        agentCard.appendChild(infoDiv);
        
        // 性格・価値観情報
        if (agent.personality) {
            const personalityDiv = document.createElement('div');
            personalityDiv.className = 'agent-personality';
            personalityDiv.innerHTML = `
                <div class="agent-info-row">💭 性格: ${agent.personality.description}</div>
                <div class="agent-info-row">🎯 価値観: ${agent.personality.values}</div>
                <div class="agent-info-row">🌟 目標: ${agent.personality.goals}</div>
            `;
            agentCard.appendChild(personalityDiv);
        }
        
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
    
    // シミュレーション開始ボタンの状態を更新
    updateSimulationButton();
}

// シミュレーション制御
function startSimulation() {
    console.log('startSimulation called');
    console.log('Current agents:', agents.length);
    
    // エージェントの存在チェック
    if (agents.length === 0) {
        console.log('No agents found, creating agents...');
        createAgents();
        
        // エージェント作成後も空の場合はエラー
        if (agents.length === 0) {
            addLog('❌ エージェントの生成に失敗しました。', 'error');
            return;
        }
    }
    
    apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
        alert('OpenAI APIキーを入力してください');
        return;
    }

    // APIキーの形式を検証（プロバイダーによって分岐）
    const provider = getSelectedApiProvider();
    if (provider === 'openai') {
        if (!(apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'))) {
            alert('無効なOpenAI APIキー形式です。sk-またはsk-proj-で始まる有効なAPIキーを入力してください。');
            return;
        }
    } else if (provider === 'gemini') {
        // GeminiのAPIキーは任意の形式を許可
        if (!apiKey || apiKey.trim() === '') {
            alert('Gemini APIキーを入力してください。');
            return;
        }
    }
    
    console.log('Starting simulation...');
    simulationRunning = true;
    simulationPaused = false;
    
    // 一時停止ボタンを有効化
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        pauseBtn.disabled = false;
    }
    
    addLog('<span style="color: #4CAF50;">🎬 シミュレーション開始</span>');
    console.log('Simulation started successfully');
}

// タブ機能の設定
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // すべてのタブボタンからactiveクラスを削除
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // すべてのタブペインからactiveクラスを削除
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // クリックされたボタンと対応するペインにactiveクラスを追加
            button.classList.add('active');
            const targetPane = document.getElementById(targetTab);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });
}

// グローバルスコープに関数を公開
window.startSimulation = startSimulation;
window.pauseSimulation = pauseSimulation;
window.setTimeSpeed = setTimeSpeed;
window.showAgentDetailModal = function(agentIndex) {
    if (agents[agentIndex] && typeof window._showAgentDetailModal === 'function') {
        window._showAgentDetailModal(agents[agentIndex]);
    }
};

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
    
    // 時間更新間隔を速度に応じて調整（configベース）
    const baseInterval = timeConfig.timeUpdateInterval / 1000; // 基本間隔（秒）
    switch (timeSpeed) {
        case 1:
            timeUpdateInterval = baseInterval; // 基本間隔
            break;
        case 2:
            timeUpdateInterval = baseInterval / 2; // 2倍速
            break;
        case 5:
            timeUpdateInterval = baseInterval / 5; // 5倍速
            break;
        case 10:
            timeUpdateInterval = baseInterval / 10; // 10倍速
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
    
    // 天候の更新
    updateWeather();
    
    // 車両システムの更新
    updateVehicleSystem(deltaTime);
    
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
    
    // フリーカメラモードでのWASD移動
    updateCameraMovement(deltaTime);
    
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
    
    // ボタンのイベントリスナーを設定
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, setting up button listeners');
        
        const startButton = document.getElementById('startSimulationBtn');
        if (startButton) {
            console.log('Found start button, adding event listener');
            startButton.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Start button clicked via event listener');
                startSimulation();
            });
        } else {
            console.log('Start button not found');
        }
        
        const pauseButton = document.getElementById('pauseBtn');
        if (pauseButton) {
            pauseButton.addEventListener('click', function(e) {
                e.preventDefault();
                pauseSimulation();
            });
        }
        
        const speedButton = document.getElementById('timeSpeedBtn');
        if (speedButton) {
            speedButton.addEventListener('click', function(e) {
                e.preventDefault();
                setTimeSpeed();
            });
        }
    });

// APIプロバイダー選択値を取得
function getSelectedApiProvider() {
    const radio = document.querySelector('input[name="apiProvider"]:checked');
    return radio ? radio.value : 'openai';
}
window.getSelectedApiProvider = getSelectedApiProvider;

// LLMへの問い合わせ回数更新関数をグローバルに公開
window.updateLlmCallCount = updateLlmCallCount;

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
    
    // 人物の後ろ16単位、上12単位の位置にカメラを配置（より遠くに）
    const cameraOffsetX = -Math.sin(agentRotation) * 16;
    const cameraOffsetZ = -Math.cos(agentRotation) * 16;
    
    camera.position.set(
        pos.x + cameraOffsetX,
        pos.y + 12,
        pos.z + cameraOffsetZ
    );
    // カメラを人物の少し下の位置に向ける（より下向きに）
    camera.lookAt(pos.x, pos.y - 1.0, pos.z);
    
    // カメラモード表示を更新
    updateCameraModeDisplay();
    
    // エージェント情報パネルで該当エージェントまでスクロール
    scrollToAgentInfo(agent);
    
    // コミュニケーションボタンの状態を更新
    updateCommunicationButtons();
    
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
    
    // コミュニケーションボタンの状態を更新
    updateCommunicationButtons();
    
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
    
    // 人物の後ろ16単位、上12単位の位置にカメラを配置（より遠くに）
    const cameraOffsetX = -Math.sin(agentRotation) * 16;
    const cameraOffsetZ = -Math.cos(agentRotation) * 16;
    
    // スムーズな追従のための補間
    const targetX = pos.x + cameraOffsetX;
    const targetY = pos.y + 12;
    const targetZ = pos.z + cameraOffsetZ;
    
    // 現在のカメラ位置から目標位置への補間
    const lerpFactor = 0.1; // 補間係数（小さいほどスムーズ）
    camera.position.x += (targetX - camera.position.x) * lerpFactor;
    camera.position.y += (targetY - camera.position.y) * lerpFactor;
    camera.position.z += (targetZ - camera.position.z) * lerpFactor;
    
    // カメラの向きを人物の少し下の位置に向ける（より下向きに）
    camera.lookAt(pos.x, pos.y - 1.0, pos.z);
}

// エージェント情報パネルで指定されたエージェントまでスクロール
function scrollToAgentInfo(targetAgent) {
    const agentsList = document.getElementById('agents-list');
    if (!agentsList) return;
    
    // エージェント情報パネル内のすべてのエージェントカードを取得
    const agentCards = agentsList.querySelectorAll('.agent-card');
    
    // 該当エージェントのカードを探す
    let targetCard = null;
    agentCards.forEach(card => {
        const nameElement = card.querySelector('.agent-name');
        if (nameElement && nameElement.textContent.includes(targetAgent.name)) {
            targetCard = card;
        }
    });
    
    if (targetCard) {
        // 該当エージェントのカードまでスムーズにスクロール
        targetCard.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        // 一時的にハイライト表示
        targetCard.style.backgroundColor = '#4CAF50';
        targetCard.style.color = 'white';
        
        // 3秒後にハイライトを解除
        setTimeout(() => {
            targetCard.style.backgroundColor = '';
            targetCard.style.color = '';
        }, 3000);
    }
}

// エージェントごとのメッセージ履歴管理
const messageHistories = new Map(); // エージェント名 -> メッセージ履歴
let currentMessageAgent = null;
let isCallActive = false;

// エージェントのメッセージ履歴を取得または初期化
function getMessageHistory(agentName) {
    if (!messageHistories.has(agentName)) {
        messageHistories.set(agentName, []);
    }
    return messageHistories.get(agentName);
}

    // エージェントのメッセージ履歴をクリア
    function clearMessageHistory(agentName) {
        messageHistories.set(agentName, []);
        console.log(`${agentName}のメッセージ履歴をクリアしました`);
    }
    
    // 現在のエージェントのメッセージ履歴をクリア
    function clearCurrentMessageHistory() {
        if (currentMessageAgent) {
            clearMessageHistory(currentMessageAgent.name);
            updateMessageHistory();
        }
    }

// シミュレーション開始ボタンの状態を更新
function updateSimulationButton() {
    const startSimulationBtn = document.querySelector('button[onclick="startSimulation()"]');
    if (startSimulationBtn) {
        if (agents.length === 0) {
            startSimulationBtn.disabled = true;
            startSimulationBtn.textContent = 'シミュレーション開始 (エージェントが必要)';
        } else {
            startSimulationBtn.disabled = false;
            startSimulationBtn.textContent = 'シミュレーション開始';
        }
    }
}

// グローバルスコープに公開
window.updateSimulationButton = updateSimulationButton;

// コミュニケーション機能の関数
function updateCommunicationButtons() {
    const callAgentBtn = document.getElementById('callAgentBtn');
    const messageAgentBtn = document.getElementById('messageAgentBtn');
    
    if (!callAgentBtn || !messageAgentBtn) return;
    
    // 人物視点モードでエージェントが選択されている場合のみ有効
    const isAgentSelected = cameraMode === 'agent' && targetAgent;
    
    callAgentBtn.disabled = !isAgentSelected || isCallActive;
    messageAgentBtn.disabled = !isAgentSelected;
    
    if (isAgentSelected) {
        callAgentBtn.textContent = isCallActive ? '📞 通話中...' : '📞 電話をかける';
        messageAgentBtn.textContent = '💬 メッセージを送る';
    } else {
        callAgentBtn.textContent = '📞 電話をかける';
        messageAgentBtn.textContent = '💬 メッセージを送る';
    }
}

function startCall() {
    if (!targetAgent || isCallActive) return;
    
    isCallActive = true;
    currentMessageAgent = targetAgent;
    
    // エージェントの履歴を取得
    const messageHistory = getMessageHistory(targetAgent.name);
    
    // 通話開始メッセージを追加
    addMessageToHistory('user', `📞 ${targetAgent.name}に電話をかけました`);
    addMessageToHistory('agent', `${targetAgent.name}: はい、もしもし。${targetAgent.name}です。`);
    
    updateCommunicationButtons();
    addLog(`📞 ${targetAgent.name}に電話をかけました`, 'communication');
    
    // 自動でメッセージモーダルを開く
    openMessageModal();
}

function openMessageModal() {
    if (!targetAgent) return;
    
    const messageModal = document.getElementById('messageModal');
    const messageModalTitle = document.getElementById('messageModalTitle');
    
    if (!messageModal || !messageModalTitle) return;
    
    currentMessageAgent = targetAgent;
    messageModalTitle.textContent = `${targetAgent.name}とのメッセージ`;
    
    // エージェントの履歴を初期化（初回の場合）
    if (!messageHistories.has(targetAgent.name)) {
        messageHistories.set(targetAgent.name, []);
    }
    
    // メッセージ履歴を表示
    updateMessageHistory();
    
    messageModal.style.display = 'block';
}

function closeMessageModalHandler() {
    const messageModal = document.getElementById('messageModal');
    if (messageModal) {
        messageModal.style.display = 'none';
    }
    
    // 通話を終了
    if (isCallActive) {
        endCall();
    }
}

function endCall() {
    if (!isCallActive) return;
    
    isCallActive = false;
    currentMessageAgent = null;
    
    updateCommunicationButtons();
    addLog(`📞 通話を終了しました`, 'communication');
}

function addMessageToHistory(sender, message) {
    if (!currentMessageAgent) return;
    
    const messageHistory = getMessageHistory(currentMessageAgent.name);
    messageHistory.push({
        sender: sender,
        message: message,
        timestamp: new Date()
    });
}

function updateMessageHistory() {
    const messageHistoryDiv = document.getElementById('messageHistory');
    if (!messageHistoryDiv || !currentMessageAgent) return;
    
    messageHistoryDiv.innerHTML = '';
    
    const messageHistory = getMessageHistory(currentMessageAgent.name);
    messageHistory.forEach(item => {
        const messageItem = document.createElement('div');
        messageItem.className = `message-item message-${item.sender}`;
        
        // タイムスタンプをフォーマット
        const timestamp = new Date(item.timestamp);
        const timeString = timestamp.toLocaleTimeString('ja-JP', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // メッセージとタイムスタンプを表示
        messageItem.innerHTML = `
            <div class="message-content">${item.message}</div>
            <div class="message-time">${timeString}</div>
        `;
        
        messageHistoryDiv.appendChild(messageItem);
    });
    
    // 最新のメッセージまでスクロール
    messageHistoryDiv.scrollTop = messageHistoryDiv.scrollHeight;
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput || !currentMessageAgent) return;
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    // ユーザーのメッセージを履歴に追加
    addMessageToHistory('user', message);
    messageInput.value = '';
    
    // メッセージ履歴を更新
    updateMessageHistory();
    
    addLog(`💬 ${currentMessageAgent.name}にメッセージを送信: ${message}`, 'communication');
    
    // エージェントの返答を生成
    await generateAgentResponse(message);
}

async function generateAgentResponse(userMessage) {
    // 一時停止中はLLM APIコールをスキップ
    if (!simulationRunning || simulationPaused) {
        const fallbackResponse = `${currentMessageAgent.name}: シミュレーションが一時停止中のため、返答できません。`;
        addMessageToHistory('agent', fallbackResponse);
        updateMessageHistory();
        return;
    }
    
    if (!currentMessageAgent) return;
    
    try {
        // エージェントの性格と状況を考慮したプロンプトを作成
        const prompt = `
あなたは${currentMessageAgent.name}（${currentMessageAgent.age}歳、${currentMessageAgent.personality}）です。
現在の状況：
- 場所: ${currentMessageAgent.currentLocation.name}
- 気分: ${currentMessageAgent.mood}
- 体力: ${Math.round(currentMessageAgent.energy * 100)}%
- 現在の思考: ${currentMessageAgent.currentThought || '特にない'}

ユーザーからのメッセージ: "${userMessage}"

このメッセージに対して、${currentMessageAgent.name}らしい自然な返答を1-2文で返してください。
性格や現在の状況を反映した返答にしてください。
`;

        const response = await callLLM({
            prompt: prompt,
            systemPrompt: `あなたは${currentMessageAgent.name}です。自然で親しみやすい返答を心がけてください。`,
            maxTokens: 100,
            temperature: 0.8
        });
        
        // エージェントの返答を履歴に追加
        addMessageToHistory('agent', `${currentMessageAgent.name}: ${response}`);
        updateMessageHistory();
        
        addLog(`💬 ${currentMessageAgent.name}からの返答: ${response}`, 'communication');
        
    } catch (error) {
        console.error('エージェント返答生成エラー:', error);
        const fallbackResponse = `${currentMessageAgent.name}: すみません、今忙しくて返答できません。`;
        addMessageToHistory('agent', fallbackResponse);
        updateMessageHistory();
    }
}

// カメラ移動更新関数
function updateCameraMovement(deltaTime) {
    if (cameraMode === 'free' || cameraMode === 'agent' || cameraMode === 'facility') {
        // カメラの前方・右方向ベクトルを計算
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, camera.up).normalize();
        
        const up = new THREE.Vector3(0, 1, 0);
        
        // 移動量を計算
        const moveAmount = cameraMoveSpeed * deltaTime;
        
        // 人物視点や施設視点でカメラ移動が開始された時に追従モードを一時的に無効
        if ((cameraMode === 'agent' || cameraMode === 'facility') && 
            (cameraKeys.w || cameraKeys.s || cameraKeys.a || cameraKeys.d || cameraKeys.q || cameraKeys.e)) {
            cameraFollowEnabled = false;
        }
        
        // 各キーの押下状態に応じて移動
        if (cameraKeys.w) {
            camera.position.add(forward.clone().multiplyScalar(moveAmount));
        }
        if (cameraKeys.s) {
            camera.position.add(forward.clone().multiplyScalar(-moveAmount));
        }
        if (cameraKeys.a) {
            camera.position.add(right.clone().multiplyScalar(-moveAmount));
        }
        if (cameraKeys.d) {
            camera.position.add(right.clone().multiplyScalar(moveAmount));
        }
        if (cameraKeys.q) {
            camera.position.add(up.clone().multiplyScalar(moveAmount));
        }
        if (cameraKeys.e) {
            camera.position.add(up.clone().multiplyScalar(-moveAmount));
        }
        
        // カメラの向きを維持
        camera.lookAt(
            camera.position.x + forward.x,
            camera.position.y + forward.y,
            camera.position.z + forward.z
        );
    }
}

// 遠景の山々を作成する関数
function createDistantMountains() {
    const mountainGroup = new THREE.Group();
    
    // 複数の山を配置
    const mountainPositions = [
        { x: -200, z: -150, height: 30, width: 80 },
        { x: 200, z: -180, height: 25, width: 60 },
        { x: -150, z: 200, height: 35, width: 90 },
        { x: 180, z: 220, height: 20, width: 50 },
        { x: 0, z: -300, height: 40, width: 100 },
        { x: -300, z: 0, height: 30, width: 70 },
        { x: 300, z: 50, height: 25, width: 65 }
    ];
    
    mountainPositions.forEach((mountain, index) => {
        // 山のジオメトリ（三角形の山）
        const mountainGeometry = new THREE.ConeGeometry(mountain.width, mountain.height, 8);
        const mountainMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4a5d23, // 山の色
            transparent: true,
            opacity: 0.7
        });
        const mountainMesh = new THREE.Mesh(mountainGeometry, mountainMaterial);
        
        mountainMesh.position.set(mountain.x, mountain.height / 2, mountain.z);
        mountainMesh.castShadow = false; // 影は無効
        mountainMesh.receiveShadow = false;
        
        mountainGroup.add(mountainMesh);
    });
    
    scene.add(mountainGroup);
}

// キーイベントリスナー
window.addEventListener('keydown', function(e) {
    if (cameraMode !== 'free' && cameraMode !== 'agent' && cameraMode !== 'facility') return;
    
    const key = e.key.toLowerCase();
    if (cameraKeys.hasOwnProperty(key)) {
        cameraKeys[key] = true;
        e.preventDefault(); // デフォルトの動作を防ぐ
    }
});

window.addEventListener('keyup', function(e) {
    if (cameraMode !== 'free' && cameraMode !== 'agent' && cameraMode !== 'facility') return;
    
    const key = e.key.toLowerCase();
    if (cameraKeys.hasOwnProperty(key)) {
        cameraKeys[key] = false;
        e.preventDefault(); // デフォルトの動作を防ぐ
    }
});

// フィールド色を変更する関数
function changeFieldColor(colorHex) {
    fieldColor = colorHex;
    
    // 地面の色を更新
    if (groundMesh) {
        groundMesh.material.color.setHex(colorHex);
    }
    
    // 無限平面の色を更新
    if (infiniteGroundMesh) {
        infiniteGroundMesh.material.color.setHex(colorHex);
    }
    
    console.log(`フィールド色を変更しました: ${colorHex.toString(16)}`);
}

// フィールド色のプリセット
const fieldColorPresets = {
    green: { name: 'グリーン', color: 0xB8E6B8 },
    purple: { name: 'パープル', color: 0x8B5A8B }, // より濃い紫に変更
    black: { name: 'ブラック', color: 0x2d2d2d },
    blue: { name: 'ブルー', color: 0xB8E6F0 },
    orange: { name: 'オレンジ', color: 0xF0E6B8 },
    pink: { name: 'ピンク', color: 0xF0B8E6 },
    gray: { name: 'グレー', color: 0xC0C0C0 },
    brown: { name: 'ブラウン', color: 0xD2B48C }
};

// グローバルスコープに公開
window.changeFieldColor = changeFieldColor;