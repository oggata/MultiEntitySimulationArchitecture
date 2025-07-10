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
let timeUpdateInterval = 0.1; // 0.1秒ごとに時間を更新（1xの場合）

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
    
    // 施設の描画
    cityLayout.drawFacilities();
    
    // 入り口接続の描画
    cityLayout.drawEntranceConnections();

    // パネルのHTMLを更新
    updatePanelHTML();
    
    // パネルのドラッグ機能を設定
    setupPanelDrag();

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

    // 保存されたエージェントを自動読み込み
    if (typeof agentStorage !== 'undefined' && agentStorage.hasSavedAgents()) {
        console.log('保存されたエージェント情報を自動読み込み中...');
        const success = agentStorage.loadAgents();
        if (success) {
            addLog(`📂 保存されたエージェント情報を自動読み込みしました (${agents.length}人)`, 'info');
        } else {
            addLog(`❌ エージェント情報の自動読み込みに失敗しました`, 'error');
        }
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
                // 入り口接続を表示
                cityLayout.drawEntranceConnections();
                addLog('🚪 入り口接続を表示しました', 'system');
            }
        });
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
    // エージェントの存在チェック
    if (agents.length === 0) {
        alert('エージェントが一人もいません。先にエージェントを生成してください。');
        return;
    }
    
    apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
        alert('OpenAI APIキーを入力してください');
        return;
    }

    // APIキーの形式を検証
    if (!(apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'))) {
        alert('無効なAPIキー形式です。sk-またはsk-proj-で始まる有効なAPIキーを入力してください。');
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