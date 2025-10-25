// 残りの建物関数をGLBファイルに置き換えるスクリプト

const buildingsToUpdate = [
    'createCleaningShopBuilding',
    'createPharmacyBuilding', 
    'createBookstoreBuilding',
    'createConvenienceStoreBuilding',
    'createBakeryBuilding',
    'createFlowerShopBuilding',
    'createElectronicsShopBuilding',
    'createGreengrocerBuilding',
    'createFishShopBuilding',
    'createButcherShopBuilding',
    'createCakeShopBuilding',
    'createTeaHouseBuilding',
    'createRamenShopBuilding',
    'createSushiShopBuilding',
    'createIzakayaBuilding',
    'createPublicBathBuilding',
    'createGameCenterBuilding',
    'createCinemaBuilding',
    'createKaraokeBuilding',
    'createBowlingAlleyBuilding',
    'createHotSpringBuilding',
    'createShrineBuilding',
    'createTempleBuilding',
    'createFireStationBuilding',
    'createPoliceStationBuilding',
    'createCityHallBuilding',
    'createParkBuilding',
    'createTownSquareBuilding'
];

// 各建物の色設定
const buildingColors = {
    'createCleaningShopBuilding': '0x87CEEB', // スカイブルー
    'createPharmacyBuilding': '0x00FF00', // ライム
    'createBookstoreBuilding': '0x8B4513', // サドルブラウン
    'createConvenienceStoreBuilding': '0xFF6347', // トマト
    'createBakeryBuilding': '0xFFD700', // ゴールド
    'createFlowerShopBuilding': '0xFF69B4', // ホットピンク
    'createElectronicsShopBuilding': '0x1E90FF', // ドジャーブルー
    'createGreengrocerBuilding': '0x32CD32', // ライムグリーン
    'createFishShopBuilding': '0x00CED1', // ダークターコイズ
    'createButcherShopBuilding': '0xDC143C', // クリムゾン
    'createCakeShopBuilding': '0xFFB6C1', // ライトピンク
    'createTeaHouseBuilding': '0xD2691E', // チョコレート
    'createRamenShopBuilding': '0xFF8C00', // ダークオレンジ
    'createSushiShopBuilding': '0x20B2AA', // ライトシーグリーン
    'createIzakayaBuilding': '0x8B0000', // ダークレッド
    'createPublicBathBuilding': '0x4682B4', // スチールブルー
    'createGameCenterBuilding': '0xFF1493', // ディープピンク
    'createCinemaBuilding': '0x4B0082', // インディゴ
    'createKaraokeBuilding': '0xFF4500', // オレンジレッド
    'createBowlingAlleyBuilding': '0x2E8B57', // シーグリーン
    'createHotSpringBuilding': '0x00FFFF', // アクア
    'createShrineBuilding': '0xFFD700', // ゴールド
    'createTempleBuilding': '0x8B4513', // サドルブラウン
    'createFireStationBuilding': '0xFF0000', // レッド
    'createPoliceStationBuilding': '0x0000FF', // ブルー
    'createCityHallBuilding': '0x696969', // ディムグレー
    'createParkBuilding': '0x90EE90', // ライトグリーン
    'createTownSquareBuilding': '0xD3D3D3' // ライトグレー
};

console.log('建物関数の更新リスト:');
buildingsToUpdate.forEach((building, index) => {
    console.log(`${index + 1}. ${building} - 色: ${buildingColors[building]}`);
});
