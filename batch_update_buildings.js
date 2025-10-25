// 残りの建物関数を一括でGLBファイルに置き換えるスクリプト

const fs = require('fs');

// 建物関数のテンプレート
const buildingTemplate = (buildingName, color, colorName) => `
function ${buildingName}(locationGroup, facilitySize, facilityHeight, color, scale) {
    // GLBファイルを読み込んで${buildingName.replace('create', '').replace('Building', '')}を作成
    const loader = new THREE.GLTFLoader();
    const glbPath = 'src/glb/ComfyUI_00001_.glb';
    console.log('${buildingName.replace('create', '').replace('Building', '')}GLBファイルを読み込み中:', glbPath);
    
    loader.load(
        glbPath,
        function(gltf) {
            console.log('${buildingName.replace('create', '').replace('Building', '')}GLBファイルの読み込み成功:', gltf);
            const model = gltf.scene;
            
            // モデルのスケールを調整
            const modelScale = facilitySize / 2; // 適切なサイズに調整
            model.scale.set(modelScale, modelScale, modelScale);
            
            // モデルを中央に配置
            model.position.set(0, 0.5, 0);
            
            // モデルのマテリアルを明るい色に変更
            let meshCount = 0;
            model.traverse(function(child) {
                if (child.isMesh) {
                    meshCount++;
                    console.log(\`${buildingName.replace('create', '').replace('Building', '')}メッシュ \${meshCount} を処理中:\`, child.name || '無名');
                    
                    // BasicMaterialで明るい色に設定
                    const newMaterial = new THREE.MeshBasicMaterial({
                        color: ${color}, // ${colorName}
                        transparent: true,
                        opacity: 0.3,
                        side: THREE.DoubleSide
                    });
                    child.material = newMaterial;
                }
            });
            console.log(\`${buildingName.replace('create', '').replace('Building', '')}合計 \${meshCount} 個のメッシュを処理しました\`);
            
            // 軽い環境光を追加
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
            locationGroup.add(ambientLight);
            
            locationGroup.add(model);
            console.log('${buildingName.replace('create', '').replace('Building', '')}をGLBファイルから作成しました。');
        },
        function(progress) {
            console.log('${buildingName.replace('create', '').replace('Building', '')}GLBファイル読み込み中...', (progress.loaded / progress.total * 100) + '%');
        },
        function(error) {
            console.error('${buildingName.replace('create', '').replace('Building', '')}GLBファイルの読み込みに失敗しました:', error);
            
            // フォールバック: 基本的な${buildingName.replace('create', '').replace('Building', '')}の形状を作成
            console.log('フォールバック: 基本的な${buildingName.replace('create', '').replace('Building', '')}の形状を作成します');
            createFallback${buildingName.replace('create', '')}(locationGroup, facilitySize, facilityHeight, color, scale);
        }
    );
}

// フォールバック用の基本的な${buildingName.replace('create', '').replace('Building', '')}の形状を作成する関数
function createFallback${buildingName.replace('create', '')}(locationGroup, facilitySize, facilityHeight, color, scale) {
    // メインの建物
    const mainBuildingGeometry = new THREE.BoxGeometry(facilitySize, facilityHeight, facilitySize);
    const mainBuildingMaterial = new THREE.MeshBasicMaterial({ 
        color: ${color}, // ${colorName}
        transparent: true, 
        opacity: 0.85 
    });
    const mainBuilding = new THREE.Mesh(mainBuildingGeometry, mainBuildingMaterial);
    mainBuilding.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuilding);
    
    // 建物の輪郭線
    const mainBuildingEdges = new THREE.EdgesGeometry(mainBuildingGeometry);
    const mainBuildingOutline = new THREE.LineSegments(mainBuildingEdges, new THREE.LineBasicMaterial({ 
        color: ${color}, 
        transparent: true, 
        opacity: 0.8 
    }));
    mainBuildingOutline.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuildingOutline);
    
    // 軽い環境光を追加
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    locationGroup.add(ambientLight);
}`;

// 建物の設定
const buildings = [
    { name: 'createPharmacyBuilding', color: '0x00FF00', colorName: 'ライム' },
    { name: 'createBookstoreBuilding', color: '0x8B4513', colorName: 'サドルブラウン' },
    { name: 'createConvenienceStoreBuilding', color: '0xFF6347', colorName: 'トマト' },
    { name: 'createBakeryBuilding', color: '0xFFD700', colorName: 'ゴールド' },
    { name: 'createFlowerShopBuilding', color: '0xFF69B4', colorName: 'ホットピンク' },
    { name: 'createElectronicsShopBuilding', color: '0x1E90FF', colorName: 'ドジャーブルー' },
    { name: 'createGreengrocerBuilding', color: '0x32CD32', colorName: 'ライムグリーン' },
    { name: 'createFishShopBuilding', color: '0x00CED1', colorName: 'ダークターコイズ' },
    { name: 'createButcherShopBuilding', color: '0xDC143C', colorName: 'クリムゾン' },
    { name: 'createCakeShopBuilding', color: '0xFFB6C1', colorName: 'ライトピンク' },
    { name: 'createTeaHouseBuilding', color: '0xD2691E', colorName: 'チョコレート' },
    { name: 'createRamenShopBuilding', color: '0xFF8C00', colorName: 'ダークオレンジ' },
    { name: 'createSushiShopBuilding', color: '0x20B2AA', colorName: 'ライトシーグリーン' },
    { name: 'createIzakayaBuilding', color: '0x8B0000', colorName: 'ダークレッド' },
    { name: 'createPublicBathBuilding', color: '0x4682B4', colorName: 'スチールブルー' },
    { name: 'createGameCenterBuilding', color: '0xFF1493', colorName: 'ディープピンク' },
    { name: 'createCinemaBuilding', color: '0x4B0082', colorName: 'インディゴ' },
    { name: 'createKaraokeBuilding', color: '0xFF4500', colorName: 'オレンジレッド' },
    { name: 'createBowlingAlleyBuilding', color: '0x2E8B57', colorName: 'シーグリーン' },
    { name: 'createHotSpringBuilding', color: '0x00FFFF', colorName: 'アクア' },
    { name: 'createShrineBuilding', color: '0xFFD700', colorName: 'ゴールド' },
    { name: 'createTempleBuilding', color: '0x8B4513', colorName: 'サドルブラウン' },
    { name: 'createFireStationBuilding', color: '0xFF0000', colorName: 'レッド' },
    { name: 'createPoliceStationBuilding', color: '0x0000FF', colorName: 'ブルー' },
    { name: 'createCityHallBuilding', color: '0x696969', colorName: 'ディムグレー' },
    { name: 'createParkBuilding', color: '0x90EE90', colorName: 'ライトグリーン' },
    { name: 'createTownSquareBuilding', color: '0xD3D3D3', colorName: 'ライトグレー' }
];

console.log('建物関数の更新テンプレート:');
buildings.forEach((building, index) => {
    console.log(`${index + 1}. ${building.name} - 色: ${building.color} (${building.colorName})`);
    console.log(buildingTemplate(building.name, building.color, building.colorName));
    console.log('---');
});
