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

// エージェント活性度設定
let activityLevel = 1; // 1=低活性, 10=中活性, 50=高活性
window.activityLevel = activityLevel; // グローバルに公開

// カメラシステム
let cameraSystem = null;

// フィールド色設定
let fieldColor = 0x2d2d2d; // デフォルトはブラック
let groundMesh = null;
let infiniteGroundMesh = null;

// 天候システム（weather.jsで定義されるため、ここでは宣言のみ）

// グローバル変数をwindowに公開
window.agents = agents;

// LLMへの問い合わせ回数を管理
let llmCallCount = 0;

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
    
    // Ollama設定も読み込み
    const savedOllamaUrl = localStorage.getItem('ollama_url');
    const savedOllamaModel = localStorage.getItem('ollama_model');
    if (savedOllamaUrl) {
        const ollamaUrlInput = document.getElementById('ollamaUrl');
        if (ollamaUrlInput) ollamaUrlInput.value = savedOllamaUrl;
    }
    if (savedOllamaModel) {
        const ollamaModelInput = document.getElementById('ollamaModel');
        if (ollamaModelInput) ollamaModelInput.value = savedOllamaModel;
    }
}

// APIキーをlocalStorageに保存
function saveApiKeyToStorage(key) {
    localStorage.setItem('openai_api_key', key);
}

// Ollama設定をlocalStorageに保存
function saveOllamaSettingsToStorage() {
    const ollamaUrl = document.getElementById('ollamaUrl') ? document.getElementById('ollamaUrl').value.trim() : '';
    const ollamaModel = document.getElementById('ollamaModel') ? document.getElementById('ollamaModel').value.trim() : '';
    
    if (ollamaUrl) localStorage.setItem('ollama_url', ollamaUrl);
    if (ollamaModel) localStorage.setItem('ollama_model', ollamaModel);
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

// フィールド色に合わせて道路色を更新する関数
function updateRoadColorsByField(fieldColorHex) {
    // フィールド色からプリセット名を特定
    let fieldPreset = 'gray'; // デフォルト
    for (const [presetName, preset] of Object.entries(fieldColorPresets)) {
        if (preset.color === fieldColorHex) {
            fieldPreset = presetName;
            break;
        }
    }
    
    // 対応する道路色を取得
    const roadColor = roadColorByField[fieldPreset] || 0x444444;
    
    console.log(`フィールド色変更: ${fieldPreset} → 道路色: ${roadColor.toString(16)}`);
    
    // 既存の道路の色を更新
    updateExistingRoadColors(roadColor);
    
    // 建物色も更新
    updateBuildingColorsByField(fieldPreset);
}

// フィールド色に合わせて建物色を更新する関数
function updateBuildingColorsByField(fieldPreset) {
    const buildingColors = buildingColorByField[fieldPreset];
    if (!buildingColors) {
        console.log(`フィールドプリセット "${fieldPreset}" の建物色設定が見つかりません`);
        return;
    }
    
    console.log(`建物色を更新: ${fieldPreset} フィールド`);
    
    // locationDataの色を更新
    locationData.forEach(location => {
        const buildingType = getBuildingTypeFromName(location.name);
        if (buildingType && buildingColors[buildingType]) {
            location.color = buildingColors[buildingType];
            console.log(`${location.name}の色を更新: ${buildingColors[buildingType].toString(16)}`);
        }
    });
    
    // 既存の建物の色を更新
    updateExistingBuildingColors(buildingColors);
}

// 建物名から建物タイプを取得する関数
function getBuildingTypeFromName(buildingName) {
    const nameToType = {
        'カフェ': 'cafe',
        '公園': 'park',
        '図書館': 'library',
        'スポーツジム': 'gym',
        '町の広場': 'plaza',
        '学校': 'school',
        '病院': 'hospital',
        'スーパーマーケット': 'supermarket',
        'ファミレス': 'familyRestaurant',
        '郵便局': 'postOffice',
        '銀行': 'bank',
        '美容院': 'beautySalon',
        'クリーニング店': 'cleaning',
        '薬局': 'pharmacy',
        '本屋': 'bookstore',
        'コンビニ': 'convenience'
    };
    
    return nameToType[buildingName] || null;
}

// 既存の建物の色を更新する関数
function updateExistingBuildingColors(buildingColors) {
    // シーン内の全ての建物メッシュを更新
    scene.children.forEach(child => {
        if (child.material && child.material.color) {
            const currentColor = child.material.color.getHex();
            
            // 建物メッシュかどうかを判定（建物の色の範囲をチェック）
            if (isBuildingMesh(child)) {
                // 建物タイプを特定して色を更新
                const buildingType = identifyBuildingType(child);
                if (buildingType && buildingColors[buildingType]) {
                    child.material.color.setHex(buildingColors[buildingType]);
                    //console.log(`建物の色を更新: ${currentColor.toString(16)} → ${buildingColors[buildingType].toString(16)}`);
                }
            }
        }
    });
}

// メッシュが建物かどうかを判定する関数
function isBuildingMesh(mesh) {
    // 建物の特徴的な色やプロパティで判定
    if (mesh.material && mesh.material.color) {
        const color = mesh.material.color.getHex();
        // 建物で使用される色の範囲をチェック
        const buildingColors = [
            0x8B4513, 0x228B22, 0x4682B4, 0xFF6347, 0x90EE90, 0x87CEEB, 0xFFFFFF, 0xFFD700,
            0xFF69B4, 0x4169E1, 0x32CD32, 0xFF1493, 0x20B2AA, 0x00CED1, 0xFF4500,
            0x9370DB, 0x8A2BE2, 0x9932CC, 0xDA70D6, 0xDDA0DD, 0xBA55D3, 0xE6E6FA, 0xFF00FF,
            0xEE82EE, 0x8B008B, 0x9400D3, 0x696969, 0x808080, 0x2F4F4F, 0x708090, 0x778899,
            0xB0C4DE, 0xF5F5F5, 0xD3D3D3, 0xC0C0C0, 0x556B2F, 0xDC143C, 0x00CED1, 0xFF4500,
            0x4169E1, 0x1E90FF, 0x00BFFF, 0x0000CD, 0x191970, 0x000080, 0x0066CC, 0x483D8B,
            0x6495ED, 0xD2691E, 0xFFA500, 0xFF8C00, 0xFF6347, 0xCD853F, 0xDAA520, 0xFF7F50,
            0xFFB6C1, 0x98FB98, 0xE6E6FA, 0xFFC0CB, 0xDDA0DD, 0xFFF0F5, 0xDB7093, 0xC71585,
            0xBC8F8F
        ];
        
        return buildingColors.includes(color);
    }
    return false;
}

// 建物タイプを特定する関数
function identifyBuildingType(mesh) {
    // 位置や色から建物タイプを推測
    // 実際の実装では、より詳細な判定ロジックが必要
    const color = mesh.material.color.getHex();
    
    // 色から建物タイプを推測
    const colorToType = {
        0x8B4513: 'cafe',      // 茶色 → カフェ
        0x228B22: 'park',      // 緑 → 公園
        0x4682B4: 'library',   // 青 → 図書館
        0xFF6347: 'gym',       // 赤 → スポーツジム
        0x90EE90: 'plaza',     // 薄緑 → 町の広場
        0x87CEEB: 'school',    // 空色 → 学校
        0xFFFFFF: 'hospital',  // 白 → 病院
        0xFFD700: 'supermarket', // 金色 → スーパーマーケット
        0xFF69B4: 'familyRestaurant', // ピンク → ファミレス
        0x4169E1: 'postOffice', // ロイヤルブルー → 郵便局
        0x32CD32: 'bank',      // ライムグリーン → 銀行
        0xFF1493: 'beautySalon', // ディープピンク → 美容院
        0x20B2AA: 'cleaning',  // ライトシーグリーン → クリーニング店
        0x00CED1: 'pharmacy',  // ダークターコイズ → 薬局
        0xFF4500: 'convenience' // オレンジレッド → コンビニ
    };
    
    return colorToType[color] || null;
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

// Three.jsの初期化
async function init() {
    // ローディング開始
    updateLoadingProgress(0);
    
    // Three.jsライブラリの読み込み確認
    updateLoadingProgress(1);
    await new Promise(resolve => setTimeout(resolve, 100)); // 少し待機
    
    // シーンの初期化
    updateLoadingProgress(2);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // 空色の背景
    
    // 霧（フォグ）を追加して遠景を自然に（薄めに設定）
    scene.fog = new THREE.Fog(0x87CEEB, 100, 400);
    
    // カメラシステムの初期化
    cameraSystem = new CameraSystem(scene);
    camera = cameraSystem.initializeCamera(window.innerWidth, window.innerHeight);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    
    // レンダラーをカメラシステムに設定
    cameraSystem.setRenderer(renderer);
    
    // ライティングの設定
    updateLoadingProgress(3);
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
    updateLoadingProgress(4);
    
    // セグメンテーションベースの都市生成を試みる
    let cityData;
    let useSegmentation = false;
    // 優先順位: city_segmentation.json > city_segmentation_sample.json
    const segmentationPaths = [
        'src/json/city_segmentation.json',
        'src/json/city_segmentation_sample.json'
    ];
    
    try {
        console.log('🔍 セグメンテーションベースの都市データをチェック中...');
        
        let segmentationPath = null;
        let segResponse = null;
        
        // 利用可能なセグメンテーションファイルを探す
        for (const path of segmentationPaths) {
            console.log(`  チェック中: ${path}`);
            segResponse = await fetch(path);
            if (segResponse.ok) {
                segmentationPath = path;
                console.log(`✅ セグメンテーションデータが見つかりました: ${path}`);
                break;
            }
        }
        
        if (segmentationPath && segResponse.ok) {
            useSegmentation = true;
            
            // セグメンテーションベースの都市マネージャーを初期化
            const segCityManager = new SegmentationCityManager(scene);
            const segResult = await segCityManager.loadFromSegmentationJSON(segmentationPath);
            
            // グローバル変数に設定
            window.segmentationCityManager = segCityManager;
            window.segCityManager = segCityManager; // 短縮名も追加
            window.isSegmentationMap = true;
            
            // locationsをグローバルに設定（エージェントシステムが使用）
            locations = segCityManager.getLocations();
            window.locations = locations;
            
            console.log('🏙️ セグメンテーションベース都市の生成完了');
            console.log(segResult.statistics);
            
            // シーンの状態を確認
            console.log(`シーン内のオブジェクト数: ${scene.children.length}`);
            const meshCount = scene.children.filter(obj => obj instanceof THREE.Mesh || obj instanceof THREE.Group).length;
            console.log(`メッシュ/グループ数: ${meshCount}`);
            
            // 施設の座標範囲を確認
            if (locations.length > 0) {
                let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
                locations.forEach(loc => {
                    minX = Math.min(minX, loc.x);
                    maxX = Math.max(maxX, loc.x);
                    minZ = Math.min(minZ, loc.z);
                    maxZ = Math.max(maxZ, loc.z);
                });
                const centerX = (minX + maxX) / 2;
                const centerZ = (minZ + maxZ) / 2;
                const rangeX = maxX - minX;
                const rangeZ = maxZ - minZ;
                
                console.log('📍 施設の座標範囲:');
                console.log(`  X: ${minX.toFixed(2)} 〜 ${maxX.toFixed(2)} (範囲: ${rangeX.toFixed(2)})`);
                console.log(`  Z: ${minZ.toFixed(2)} 〜 ${maxZ.toFixed(2)} (範囲: ${rangeZ.toFixed(2)})`);
                console.log(`  中心: (${centerX.toFixed(2)}, ${centerZ.toFixed(2)})`);
                
                // カメラを最適な位置に配置（ユーザー指定の初期位置）
                camera.position.set(-1.9, 23.7, -17.1);
                
                // 回転を直接設定（度数法→弧度法）
                camera.rotation.order = 'XYZ';  // 回転順序を変更
                camera.rotation.x = -112.6 * Math.PI / 180;
                camera.rotation.y = 0.1 * Math.PI / 180;
                camera.rotation.z = 179.8 * Math.PI / 180;
                
                // 変更を強制的に適用
                camera.updateMatrixWorld(true);
                
                // カメラシステムの設定
                if (cameraSystem) {
                    // カメラモードをfreeに設定
                    cameraSystem.cameraMode = 'free';
                    cameraSystem.cameraFollowEnabled = false;
                    
                    // 初期回転を保持（updateCameraRotation()をスキップ）
                    cameraSystem.preserveInitialRotation = true;
                    
                    // 中心座標を保存
                    cameraSystem.cityCenter = { x: 4.8, y: 0.0, z: -0.6 };
                    cameraSystem.cityRange = Math.max(rangeX, rangeZ);
                }
                
                // 距離を計算（注視点までの距離）
                const dx = camera.position.x - 4.8;
                const dy = camera.position.y - 0.0;
                const dz = camera.position.z - (-0.6);
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                console.log(`📷 カメラを調整: 位置(${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`);
                console.log(`📷 回転: (${(-112.6).toFixed(1)}°, ${(0.1).toFixed(1)}°, ${(179.8).toFixed(1)}°)`);
                console.log(`📷 参考距離: ${distance.toFixed(1)}`);
                console.log(`📷 カメラモード: ${cameraSystem.cameraMode}`);
            }
            
            // セグメンテーションモード用の地面を追加（データの範囲に合わせて）
            console.log('セグメンテーションマップ用の地面を追加...');
            
            // セグメンテーションデータのバウンディングボックスから地面のサイズを計算
            const bbox = segCityManager.getBoundingBox();
            const bboxRangeX = bbox.maxX - bbox.minX;
            const bboxRangeZ = bbox.maxZ - bbox.minZ;
            const padding = Math.max(bboxRangeX, bboxRangeZ) * 0.15; // 15%の余白
            
            const groundSizeX = bboxRangeX + padding;
            const groundSizeZ = bboxRangeZ + padding;
            const groundCenterX = (bbox.minX + bbox.maxX) / 2;
            const groundCenterZ = (bbox.minZ + bbox.maxZ) / 2;
            
            console.log(`  セグメントデータ範囲: X[${bbox.minX.toFixed(1)}, ${bbox.maxX.toFixed(1)}], Z[${bbox.minZ.toFixed(1)}, ${bbox.maxZ.toFixed(1)}]`);
            console.log(`  地面サイズ: ${groundSizeX.toFixed(1)} x ${groundSizeZ.toFixed(1)}`);
            console.log(`  地面中心: (${groundCenterX.toFixed(1)}, ${groundCenterZ.toFixed(1)})`);
            
            // 基本の地面（セグメントの隙間を埋める）
            const segGroundGeometry = new THREE.PlaneGeometry(groundSizeX, groundSizeZ);
            const segGroundMaterial = new THREE.MeshBasicMaterial({
                color: 0x1a1a1a, // 濃いグレー
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide,
                depthWrite: true
            });
            const segGroundMesh = new THREE.Mesh(segGroundGeometry, segGroundMaterial);
            segGroundMesh.rotation.x = -Math.PI / 2;
            segGroundMesh.position.set(groundCenterX, -0.1, groundCenterZ); // メッシュより少し下
            scene.add(segGroundMesh);
            
            // グリッド線を追加（データの範囲に合わせて）
            const gridSize = Math.max(groundSizeX, groundSizeZ);
            const gridHelper = new THREE.GridHelper(gridSize, Math.min(100, Math.ceil(gridSize / 5)), 0x444444, 0x222222);
            gridHelper.position.set(groundCenterX, -0.05, groundCenterZ); // 地面より少し上
            scene.add(gridHelper);
            
            console.log('✅ 地面メッシュとグリッドを追加しました');
            
            // セグメンテーションモード用のRoadSystemを作成
            const segRoadSystem = new RoadSystem(cityLayoutConfig);
            segRoadSystem.roads = segResult.roads || [];
            segRoadSystem.intersections = []; // セグメンテーションでは交差点は自動計算されない
            
            console.log(`📍 セグメンテーション道路システム初期化: ${segRoadSystem.roads.length}道路`);
            if (segRoadSystem.roads.length > 0) {
                console.log(`  道路サンプル (最初の3本):`);
                segRoadSystem.roads.slice(0, 3).forEach((road, i) => {
                    console.log(`    ${i}: start=(${road.start.x.toFixed(1)}, ${road.start.z.toFixed(1)}), end=(${road.end.x.toFixed(1)}, ${road.end.z.toFixed(1)})`);
                });
            } else {
                console.warn(`  ⚠️ 道路が0本です！`);
            }
            
            // セグメンテーションモード用の可視化システムを作成
            // 注意: VisualizationSystemは遅延初期化（visualizeRoadNetwork呼び出し時）
            let segVisualizationSystem = null;
            console.log('ℹ️ VisualizationSystemは遅延初期化されます（道路表示ボタンクリック時）');
            
            // セグメンテーションモード用のPathfindingSystemを作成
            const segPathfindingSystem = new PathfindingSystem(segRoadSystem);
            console.log('✅ PathfindingSystemを初期化しました');
            
            // セグメンテーションモード用のダミーcityLayoutオブジェクトを作成（互換性のため）
            cityLayout = {
                gridSize: 200,
                roads: segResult.roads || [],
                buildings: segResult.buildings || [],
                facilities: [],
                intersections: [],
                roadSystem: segRoadSystem,
                visualizationSystem: segVisualizationSystem,
                roadCenterLines: [],
                intersectionPoints: [],
                entranceConnections: [],
                getRoadSystem: () => segRoadSystem,
                getFacilitySystem: () => null,
                getBuildingSystem: () => null,
                drawCity: () => {
                    console.log('✅ セグメンテーションベース都市は既に描画済みです');
                },
                generateCity: () => ({
                    roads: segResult.roads || [],
                    buildings: segResult.buildings || [],
                    facilities: []
                }),
                visualizeRoadNetwork: () => {
                    console.log('🛣️ セグメンテーションモード: 道路ネットワークを可視化します');
                    
                    // 遅延初期化: VisualizationSystemをここで初期化
                    if (!segVisualizationSystem) {
                        try {
                            if (typeof window.VisualizationSystem !== 'undefined') {
                                segVisualizationSystem = new window.VisualizationSystem(segRoadSystem, null, null);
                                console.log('✅ VisualizationSystemを初期化しました（遅延初期化）');
                            } else {
                                console.error('❌ VisualizationSystemが定義されていません');
                                console.log('   利用可能なグローバル変数:', Object.keys(window).filter(k => k.includes('System')));
                                return;
                            }
                        } catch (error) {
                            console.error('❌ VisualizationSystemの初期化に失敗:', error);
                            return;
                        }
                    }
                    
                    if (segVisualizationSystem) {
                        segVisualizationSystem.visualizeRoadNetwork();
                    }
                },
                clearVisualizations: () => {
                    console.log('🗑️ セグメンテーションモード: 可視化をクリアします');
                    
                    if (segVisualizationSystem && segVisualizationSystem.clearRoadNetworkVisualization) {
                        segVisualizationSystem.clearRoadNetworkVisualization();
                    } else if (!segVisualizationSystem) {
                        console.log('ℹ️ まだ可視化されていません');
                    }
                },
                // パスファインディングメソッド（エージェントが使用）
                findPath: (start, end) => {
                    console.log(`🗺️ 経路探索: (${start.x.toFixed(1)}, ${start.z.toFixed(1)}) → (${end.x.toFixed(1)}, ${end.z.toFixed(1)})`);
                    const path = segPathfindingSystem.findPath(start, end);
                    
                    if (path && path.length > 0) {
                        console.log(`  ✅ 経路発見: ${path.length}ポイント`);
                        if (path.length <= 10) {
                            path.forEach((p, i) => console.log(`    ${i}: (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`));
                        } else {
                            console.log(`    開始: (${path[0].x.toFixed(1)}, ${path[0].z.toFixed(1)})`);
                            console.log(`    ... (${path.length - 2}個の中間ポイント)`);
                            console.log(`    終了: (${path[path.length - 1].x.toFixed(1)}, ${path[path.length - 1].z.toFixed(1)})`);
                        }
                    } else {
                        console.warn(`  ⚠️ 経路が見つかりません。直線経路を使用します。`);
                    }
                    
                    return path;
                },
                findPathToBuilding: (start, building) => {
                    console.log(`🏢 建物への経路探索: (${start.x.toFixed(1)}, ${start.z.toFixed(1)}) → 建物(${building.x.toFixed(1)}, ${building.z.toFixed(1)})`);
                    const path = segPathfindingSystem.findPathToBuilding(start, building);
                    
                    if (path && path.length > 0) {
                        console.log(`  ✅ 建物への経路発見: ${path.length}ポイント`);
                    } else {
                        console.warn(`  ⚠️ 建物への経路が見つかりません`);
                    }
                    
                    return path;
                },
                // 経路の視覚化（デバッグ用）
                pathLine: null,
                pathPoints: [],
                visualizePath: (path, color = 0x00ff00) => {
                    console.log(`🗺️ 経路を視覚化: ${path ? path.length : 0}ポイント`);
                    
                    // 既存の経路表示を削除
                    cityLayout.clearPathVisualization();
                    
                    if (!path || path.length < 2) return;
                    
                    // 経路の線を作成
                    const points = [];
                    for (const point of path) {
                        points.push(new THREE.Vector3(point.x, 0.5, point.z)); // 地面より高く
                    }
                    
                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    const material = new THREE.LineBasicMaterial({
                        color: color,
                        linewidth: 5,
                        transparent: true,
                        opacity: 0.8
                    });
                    
                    cityLayout.pathLine = new THREE.Line(geometry, material);
                    scene.add(cityLayout.pathLine);
                    
                    // 経路ポイントにマーカーを追加
                    path.forEach((point, index) => {
                        const markerGeometry = new THREE.SphereGeometry(0.3, 8, 8);
                        const markerMaterial = new THREE.MeshBasicMaterial({
                            color: index === 0 ? 0x00ff00 : (index === path.length - 1 ? 0xff0000 : color),
                            transparent: true,
                            opacity: 0.8
                        });
                        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
                        marker.position.set(point.x, 0.5, point.z);
                        scene.add(marker);
                        cityLayout.pathPoints.push(marker);
                    });
                    
                    console.log(`  ✅ 経路を視覚化しました: ${path.length}ポイント`);
                },
                clearPathVisualization: () => {
                    if (cityLayout.pathLine) {
                        scene.remove(cityLayout.pathLine);
                        cityLayout.pathLine.geometry.dispose();
                        cityLayout.pathLine.material.dispose();
                        cityLayout.pathLine = null;
                    }
                    
                    if (cityLayout.pathPoints) {
                        for (const point of cityLayout.pathPoints) {
                            scene.remove(point);
                            point.geometry.dispose();
                            point.material.dispose();
                        }
                        cityLayout.pathPoints = [];
                    }
                }
            };
            
        } else {
            console.log('ℹ️ セグメンテーションデータが見つかりません。従来の方式で生成します。');
            useSegmentation = false;
        }
    } catch (error) {
        console.warn('⚠️ セグメンテーションデータの読み込みに失敗:', error);
        console.log('従来の方式で都市を生成します。');
        useSegmentation = false;
    }
    
    // セグメンテーションベースでない場合はエラー
    if (!useSegmentation) {
        console.error('❌ セグメンテーションマップが見つかりません');
        console.log('⚠️ 以下のいずれかのセグメンテーションマップを用意してください:');
        console.log('  1. src/json/city_segmentation.json (推奨)');
        console.log('  2. src/json/city_segmentation_sample.json (サンプル)');
        console.log('');
        console.log('📚 セグメンテーションマップの作成方法:');
        console.log('  • Google Colabで example/colab_3d_city_map.py を実行');
        console.log('  • 航空写真をアップロード');
        console.log('  • 生成されたJSONファイルを src/json/city_segmentation.json に配置');
        console.log('');
        console.log('詳細: SEGMENTATION_QUICKSTART.md をご確認ください');
        
        // エラーメッセージをUIに表示
        // updateLoadingMessage('❌ セグメンテーションマップが見つかりません');
        // updateLoadingDetailMessage('src/json/city_segmentation.json を用意してください。詳細はコンソールをご確認ください。');
        
        // 空のcityLayoutを作成（クラッシュを防ぐため）
        cityLayout = {
            gridSize: 200,
            roads: [],
            buildings: [],
            facilities: [],
            intersections: [],
            getRoadSystem: () => null,
            getFacilitySystem: () => null,
            getBuildingSystem: () => null,
            drawCity: () => {},
            generateCity: () => ({ roads: [], buildings: [], facilities: [] }),
            visualizeRoadNetwork: () => {},
            clearVisualizations: () => {}
        };
        
        return; // 初期化を中断
    }
    
    // 以下、マップが正常に読み込まれた後の処理（セグメンテーション or エラーケース後）
    
    // cityLayoutが存在しない場合はここで初期化を中断
    if (!cityLayout) {
        console.error('❌ cityLayoutが初期化されていません。処理を中断します。');
        // updateLoadingMessage('❌ 初期化エラー');
        return;
    }
    
    // 自宅を先に生成（セグメンテーションベースではスキップ）
    updateLoadingProgress(5);
    if (useSegmentation) {
        console.log('✅ セグメンテーションモード: 自宅生成はスキップ');
    }
    
    // 建物と施設の生成（セグメンテーションベースではスキップ）
    updateLoadingProgress(6);
    if (useSegmentation) {
        console.log('✅ セグメンテーションモード: 建物生成はスキップ');
    }
    
    // 地面とグリッドの生成（セグメンテーションモードでは専用のものを使用）
    updateLoadingProgress(7);
    const SHOW_GROUND = false; // セグメンテーションベースでは地面は専用のものを使用
    if (SHOW_GROUND) {
        // 無限大の地面（遠景用）
        const infiniteGroundGeometry = new THREE.PlaneGeometry(1000, 1000, 1, 1);
        const infiniteGroundMaterial = new THREE.MeshBasicMaterial({ 
            color: fieldColor,
            transparent: false,
            depthWrite: false
        });
        infiniteGroundMesh = new THREE.Mesh(infiniteGroundGeometry, infiniteGroundMaterial);
        infiniteGroundMesh.rotation.x = -Math.PI / 2;
        infiniteGroundMesh.position.y = -0.02;
        scene.add(infiniteGroundMesh);
        
        // 地面（塗りつぶし）
        const groundSize = cityLayout ? cityLayout.gridSize : 200;
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 1, 1);
        const groundMaterial = new THREE.MeshBasicMaterial({ 
            color: fieldColor,
            transparent: true,
            opacity: 0.5,
            depthWrite: false
        });
        groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.position.y = 0.01;
        scene.add(groundMesh);
        
        // 地面のグリッド線
        const gridGroup = new THREE.Group();
        const gridSize = groundSize;
        const gridSpacing = 2;
        
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
        
        gridGroup.position.y = 0.03;
        gridGroup.renderOrder = 1;
        scene.add(gridGroup);
    }
    
    // 場所の作成（セグメンテーションモード以外）
    updateLoadingProgress(8);
    if (!useSegmentation) {
        createLocations();
        console.log('従来方式で場所を作成しました');
    } else {
        console.log('✅ セグメンテーションモード: 場所はセグメントデータから既に作成済み');
    }
    
    // 自宅の3Dオブジェクトを作成（セグメンテーションモード以外）
    updateLoadingProgress(9);
    if (!useSegmentation && typeof homeManager !== 'undefined' && typeof createAgentHome === 'function') {
        const allHomes = homeManager.getAllHomes();
        allHomes.forEach(home => {
            createAgentHome(home);
        });
        console.log(`${allHomes.length}軒の自宅の3Dオブジェクトを作成しました`);
    } else if (useSegmentation) {
        console.log('✅ セグメンテーションモード: 建物はセグメントメッシュとして既に描画済み');
    }
    
    // カメラコントロールの設定
    updateLoadingProgress(10);
    cameraSystem.setupMouseControls();
    cameraSystem.setupKeyboardControls();
    
    // アニメーションループ
    animate();

    // 都市全体の描画
    updateLoadingProgress(11);
    if (cityLayout && typeof cityLayout.drawCity === 'function') {
        cityLayout.drawCity();
        console.log('✅ 都市の描画が完了しました');
    } else {
        console.log('ℹ️ cityLayout.drawCityが利用できません（セグメンテーションモードまたはエラー）');
    }
    
    // 入り口接続は通常の道路描画に統合済み

    // UIパネルの初期化
    updateLoadingProgress(12);
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

    // APIプロバイダーの変更を監視してollama設定の表示/非表示を切り替え
    const apiProviderRadios = document.querySelectorAll('input[name="apiProvider"]');
    apiProviderRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const ollamaSettings = document.getElementById('ollamaSettings');
            const apiKeyInput = document.getElementById('apiKey');
            
            if (e.target.value === 'ollama') {
                ollamaSettings.style.display = 'block';
                apiKeyInput.placeholder = 'APIキーは不要です（ローカル接続）';
                apiKeyInput.disabled = true;
            } else {
                ollamaSettings.style.display = 'none';
                apiKeyInput.placeholder = 'APIキーを入力';
                apiKeyInput.disabled = false;
            }
        });
    });

    // Ollama設定の変更を監視してlocalStorageに保存
    const ollamaUrlInput = document.getElementById('ollamaUrl');
    const ollamaModelInput = document.getElementById('ollamaModel');
    
    if (ollamaUrlInput) {
        ollamaUrlInput.addEventListener('input', () => {
            saveOllamaSettingsToStorage();
        });
    }
    
    if (ollamaModelInput) {
        ollamaModelInput.addEventListener('input', () => {
            saveOllamaSettingsToStorage();
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

    // 初期化時にollama設定の表示状態を設定
    const currentProvider = getSelectedApiProvider();
    const ollamaSettings = document.getElementById('ollamaSettings');
    const apiKeyInputElement = document.getElementById('apiKey');
    
    if (currentProvider === 'ollama') {
        if (ollamaSettings) ollamaSettings.style.display = 'block';
        if (apiKeyInputElement) {
            apiKeyInputElement.placeholder = 'APIキーは不要です（ローカル接続）';
            apiKeyInputElement.disabled = true;
        }
    }

    // 保存されたエージェントの自動読み込みは無効化
    // 手動で「保存されたエージェントを読み込み」ボタンを押してから読み込む

    // 天候システムの初期化
    updateLoadingProgress(13);
    if (typeof initWeatherSystem === 'function') {
        initWeatherSystem();
        createWeatherDisplay();
    }

    // 車両システムの初期化
    updateLoadingProgress(14);
    setTimeout(() => {
        if (typeof initializeVehicleSystem === 'function') {
            initializeVehicleSystem();
        }
    }, 1000); // 1秒後に初期化

    // 動画生成システムの初期化
    updateLoadingProgress(15, '動画生成システムを初期化中...');
    if (typeof initializeVideoGenerationSystem === 'function') {
        initializeVideoGenerationSystem();
    }

    // 道路沿いに木を配置
    updateLoadingProgress(16, '道路沿いに木を配置中...');
    if (typeof placeTreesAlongRoads === 'function') {
        placeTreesAlongRoads();
    }

    // 最終調整
    updateLoadingProgress(17);
    await new Promise(resolve => setTimeout(resolve, 200)); // 少し待機
    
    // ローディング画面を非表示
    hideLoadingScreen();

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
    const autoViewBtn = document.getElementById('autoViewBtn');
    const resetBtn = document.getElementById('resetCamera');

    if (personBtn) {
        personBtn.addEventListener('click', () => {
            if (agents.length === 0) return;
            cameraSystem.currentAgentIndex = (cameraSystem.currentAgentIndex + 1) % agents.length;
            cameraSystem.focusCameraOnAgentByIndex(cameraSystem.currentAgentIndex, agents);
        });
    }
    if (facilityBtn) {
        facilityBtn.addEventListener('click', () => {
            const facilities = locations.filter(loc => !loc.isHome);
            if (facilities.length === 0) return;
            cameraSystem.currentFacilityIndex = (cameraSystem.currentFacilityIndex + 1) % facilities.length;
            cameraSystem.focusCameraOnFacilityByIndex(cameraSystem.currentFacilityIndex, locations);
        });
    }
    if (autoViewBtn) {
        autoViewBtn.addEventListener('click', () => {
            console.log('自動視点ボタンがクリックされました');
            console.log('現在の状態:', cameraSystem.autoViewEnabled);
            console.log('エージェント数:', window.agents ? window.agents.length : 0);
            
            if (cameraSystem.autoViewEnabled) {
                // 自動視点を停止
                console.log('自動視点を停止します');
                cameraSystem.stopAutoView();
                autoViewBtn.style.backgroundColor = '#4CAF50';
                autoViewBtn.textContent = '🎬 自動視点 (5秒)';
            } else {
                // 自動視点を開始
                if (!window.agents || window.agents.length === 0) {
                    alert('エージェントが存在しません。先にエージェントを作成してください。');
                    return;
                }
                console.log('自動視点を開始します');
                cameraSystem.startAutoView();
                autoViewBtn.style.backgroundColor = '#f44336';
                autoViewBtn.textContent = '⏹️ 自動視点停止';
            }
        });
    } else {
        console.error('autoViewBtn が見つかりません');
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            cameraSystem.resetCamera();
            // 自動視点ボタンのスタイルもリセット
            if (autoViewBtn) {
                autoViewBtn.style.backgroundColor = '#4CAF50';
                autoViewBtn.textContent = '🎬 自動視点 (5秒)';
            }
        });
    }
    
    // カテゴリハイライトボタンのイベント登録
    const categoryButtons = document.querySelectorAll('.category-highlight-btn');
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.getAttribute('data-category');
            
            // セグメンテーションマップが読み込まれているか確認
            if (!window.segCityManager || !window.segCityManager.meshGroups) {
                addLog('⚠️ セグメンテーションデータが読み込まれていません', 'system');
                return;
            }
            
            // ハイライトをトグル
            const isHighlighted = cameraSystem.toggleCategoryHighlight(category, window.segCityManager.meshGroups);
            
            // ボタンの見た目を切り替え
            if (isHighlighted) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    });
    
    // 全ハイライト解除ボタンのイベント登録
    const clearAllHighlightsBtn = document.getElementById('clearAllHighlightsBtn');
    if (clearAllHighlightsBtn) {
        clearAllHighlightsBtn.addEventListener('click', () => {
            cameraSystem.unhighlightAllCategories();
            
            // 全ボタンのactiveクラスを削除
            categoryButtons.forEach(button => {
                button.classList.remove('active');
            });
            
            addLog('🔅 全カテゴリのハイライトを解除しました', 'system');
        });
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
            cityLayout.clearVisualizations();
            addLog('🗑️ 道路表示をクリアしました', 'system');
        });
    }

    // 入り口接続表示ボタンのイベント登録
    const toggleEntranceBtn = document.getElementById('toggleEntranceConnections');
    if (toggleEntranceBtn) {
        toggleEntranceBtn.addEventListener('click', () => {
            // 入り口接続は通常の道路として常に表示されています
            addLog('🚪 入り口接続は通常の道路として常に表示されています', 'system');
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
    
    // デフォルトでブラックを選択状態にする
    const blackButton = document.querySelector('[data-color="black"]');
    if (blackButton) {
        blackButton.classList.add('selected');
    }
    
    // 初期フィールド色に合わせて道路色を設定
    updateRoadColorsByField(fieldColor);
}

// パネルドラッグ状態を監視する関数をグローバルに公開
window.setPanelDragging = function(dragging) {
    if (cameraSystem) {
        cameraSystem.setPanelDragging(dragging);
    }
};

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
        // エージェントカードに一意のIDを設定（自動スクロール用）
        agentCard.id = `agent-card-${agent.name.replace(/\s/g, '_')}`;
        
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
    } else if (provider === 'ollama') {
        // Ollamaの場合はURLとモデル名をチェック
        const ollamaUrl = document.getElementById('ollamaUrl') ? document.getElementById('ollamaUrl').value.trim() : '';
        const ollamaModel = document.getElementById('ollamaModel') ? document.getElementById('ollamaModel').value.trim() : '';
        
        if (!ollamaUrl || !ollamaModel) {
            alert('Ollama URLとモデル名を入力してください。');
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

// カメラデバッグ情報を更新
function updateCameraDebugDisplay() {
    if (!camera) return;
    
    const positionEl = document.getElementById('debugCameraPosition');
    const rotationEl = document.getElementById('debugCameraRotation');
    const lookAtEl = document.getElementById('debugCameraLookAt');
    const distanceEl = document.getElementById('debugCameraDistance');
    
    if (positionEl) {
        positionEl.textContent = `(${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`;
    }
    
    if (rotationEl) {
        const rotX = (camera.rotation.x * 180 / Math.PI).toFixed(1);
        const rotY = (camera.rotation.y * 180 / Math.PI).toFixed(1);
        const rotZ = (camera.rotation.z * 180 / Math.PI).toFixed(1);
        rotationEl.textContent = `(${rotX}°, ${rotY}°, ${rotZ}°)`;
    }
    
    if (lookAtEl && cameraSystem && cameraSystem.cityCenter) {
        const center = cameraSystem.cityCenter;
        lookAtEl.textContent = `(${center.x.toFixed(1)}, ${center.y.toFixed(1)}, ${center.z.toFixed(1)})`;
    } else if (lookAtEl) {
        lookAtEl.textContent = '(0, 0, 0)';
    }
    
    if (distanceEl && cameraSystem && cameraSystem.cityCenter) {
        const center = cameraSystem.cityCenter;
        const dx = camera.position.x - center.x;
        const dy = camera.position.y - center.y;
        const dz = camera.position.z - center.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        distanceEl.textContent = distance.toFixed(1);
    } else if (distanceEl) {
        const distance = Math.sqrt(
            camera.position.x * camera.position.x +
            camera.position.y * camera.position.y +
            camera.position.z * camera.position.z
        );
        distanceEl.textContent = distance.toFixed(1);
    }
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
    
    // 動画生成システムの更新
    if (videoGenerationSystem) {
        videoGenerationSystem.update(deltaTime);
    }
    
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
    
    // カメラシステムの更新
    cameraSystem.updateCameraFollow();
    cameraSystem.updateCameraMovement(deltaTime);
    
    // 追従対象の表示を更新（0.5秒ごと）
    if (Math.floor(clock.getElapsedTime() * 2) % 1 === 0) {
        cameraSystem.updateCameraTargetDisplay();
    }
    
    // カメラデバッグ情報を更新
    updateCameraDebugDisplay();
    
    // ターゲットマーカーのアニメーション
    if (window.targetMarkerAnimation) {
        window.targetMarkerAnimation();
    }
    
    renderer.render(scene, camera);
}

// ウィンドウリサイズ対応
window.addEventListener('resize', () => {
    cameraSystem.onWindowResize(window.innerWidth, window.innerHeight);
});

    // 初期化（非同期）
    document.addEventListener('DOMContentLoaded', async function() {
        console.log('DOM loaded, starting initialization');
        await init();
        console.log('Initialization completed');
    });
    
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
    
    // フィールド色に合わせて道路色を更新（更新対象の件数もログ）
    updateRoadColorsByField(colorHex);
    console.log(`after changeFieldColor: roadMeshes=${window.roadMeshes ? window.roadMeshes.length : 0}`);
    
    console.log(`フィールド色を変更しました: ${colorHex.toString(16)}`);
}

// グローバルスコープに公開
window.changeFieldColor = changeFieldColor;

// 既存の道路の色を更新する関数
function updateExistingRoadColors(roadColor) {
    // シーン全体を走査して道路フラグ付きオブジェクトを更新（ネスト対応）
    let updatedCount = 0;
    if (scene && typeof scene.traverse === 'function') {
        scene.traverse(obj => {
            if (obj && obj.userData && obj.userData.isRoad && obj.material && obj.material.color) {
                obj.material.color.setHex(roadColor);
                updatedCount++;
            }
        });
    }
    // フォールバック: 収集配列があれば直接更新
    if (updatedCount === 0 && window.roadMeshes && window.roadMeshes.length > 0) {
        window.roadMeshes.forEach(mesh => {
            if (mesh && mesh.material && mesh.material.color) {
                mesh.material.color.setHex(roadColor);
                updatedCount++;
            }
        });
    }
    if (window.roadEdgeLines && window.roadEdgeLines.length > 0) {
        window.roadEdgeLines.forEach(line => {
            if (line && line.material && line.material.color) {
                line.material.color.setHex(0xFFFFFF);
            }
        });
    }
    console.log(`updateExistingRoadColors: ${updatedCount}個の道路メッシュを更新`);
    
    // 設定ファイルの道路色も更新
    cityLayoutConfig.roadColors.mainRoad = roadColor;
    cityLayoutConfig.roadColors.normalRoad = roadColor;
    cityLayoutConfig.roadColors.entranceRoad = roadColor;
    cityLayoutConfig.roadColors.homeRoad = roadColor;
}

// ローディング画面管理
let loadingProgress = 0;
let loadingSteps = [
    { message: 'Three.jsライブラリを読み込み中...', detail: '3Dレンダリングエンジンの初期化' },
    { message: 'シーンを初期化中...', detail: '3Dシーンの作成とカメラ設定' },
    { message: 'ライティングを設定中...', detail: '環境光と指向性ライトの配置' },
    { message: '都市レイアウトを生成中...', detail: '建物と施設の配置計画' },
    { message: '自宅を生成中...', detail: 'エージェント用の自宅オブジェクト作成' },
    { message: '建物と施設を生成中...', detail: '3D建物オブジェクトの配置' },
    { message: '地面とグリッドを生成中...', detail: '地面メッシュとグリッド線の作成' },
    { message: '場所データを作成中...', detail: '施設情報の初期化' },
    { message: '自宅の3Dオブジェクトを作成中...', detail: '自宅メッシュの配置' },
    { message: 'マウスコントロールを設定中...', detail: 'カメラ操作の初期化' },
    { message: '都市全体を描画中...', detail: '建物と道路の最終描画' },
    { message: 'UIパネルを初期化中...', detail: 'コントロールパネルの設定' },
    { message: '天候システムを初期化中...', detail: '天候エフェクトの準備' },
    { message: '車両システムを初期化中...', detail: '車両管理システムの準備' },
    { message: '動画生成システムを初期化中...', detail: '動画生成機能の準備' },
    { message: '道路沿いに木を配置中...', detail: '街路樹の配置' },
    { message: '最終調整中...', detail: 'システム全体の最終チェック' }
];

// ローディング進捗を更新する関数
function updateLoadingProgress(step, detail = '') {
    const progress = Math.round((step / loadingSteps.length) * 100);
    loadingProgress = progress;
    
    const loadingMessage = document.getElementById('loading-message');
    const loadingProgressElement = document.getElementById('loading-progress');
    const loadingDetailMessage = document.getElementById('loading-detail-message');
    
    if (loadingMessage && step < loadingSteps.length) {
        loadingMessage.textContent = loadingSteps[step].message;
    }
    
    if (loadingProgressElement) {
        loadingProgressElement.textContent = `${progress}%`;
    }
    
    if (loadingDetailMessage) {
        const detailText = detail || (step < loadingSteps.length ? loadingSteps[step].detail : '');
        loadingDetailMessage.textContent = detailText;
    }
    
    // 進捗に応じてローディング画面の色を変化させる
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        if (progress < 30) {
            loadingScreen.style.background = 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)';
        } else if (progress < 60) {
            loadingScreen.style.background = 'linear-gradient(135deg, #2a5298 0%, #4a90e2 100%)';
        } else if (progress < 90) {
            loadingScreen.style.background = 'linear-gradient(135deg, #4a90e2 0%, #7bb3f0 100%)';
        } else {
            loadingScreen.style.background = 'linear-gradient(135deg, #7bb3f0 0%, #a8d8ff 100%)';
        }
    }
}

// ローディング画面を非表示にする関数
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 500);
    }
}

// 既存の道路メッシュを全削除（エディタ再描画時の残存物を除去）
function clearRoadMeshes() {
    if (!scene || typeof scene.traverse !== 'function') return;
    const toRemove = [];
    scene.traverse(obj => {
        if (obj && obj.userData && obj.userData.isRoad) {
            toRemove.push(obj);
        }
    });
    toRemove.forEach(obj => {
        if (obj.parent) obj.parent.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    });
    if (window.roadMeshes) window.roadMeshes = [];
    if (window.roadEdgeLines) window.roadEdgeLines = [];
    console.log(`clearRoadMeshes: ${toRemove.length}件を削除`);
}