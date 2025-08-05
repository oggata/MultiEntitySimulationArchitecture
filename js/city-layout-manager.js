// 都市レイアウト全体を統合管理するマネージャークラス
class CityLayoutManager {
    constructor(config) {
        this.config = config;
        
        // 各システムを初期化
        this.roadSystem = new RoadSystem(config);
        this.buildingSystem = new BuildingSystem(config, this.roadSystem);
        this.facilitySystem = new FacilitySystem(config, this.roadSystem, this.buildingSystem);
        this.pathfindingSystem = new PathfindingSystem(this.roadSystem);
        this.visualizationSystem = new VisualizationSystem(this.roadSystem, this.buildingSystem, this.facilitySystem);
        
        // データの保持
        this.roads = [];
        this.buildings = [];
        this.facilities = [];
        this.intersections = [];
    }

    // 都市全体の生成
    generateCity() {
        // 道路の生成
        this.roads = this.roadSystem.generateRoads();
        this.intersections = this.roadSystem.intersections;
        
        // 建物の生成
        this.buildings = this.buildingSystem.generateBuildings();
        
        // 施設の生成
        this.facilities = this.facilitySystem.generateFacilities();
        
        return {
            roads: this.roads,
            buildings: this.buildings,
            facilities: this.facilities,
            intersections: this.intersections
        };
    }

    // 都市全体の描画
    drawCity() {
        // 道路の描画
        this.roadSystem.drawRoads();
        
        // 建物の描画
        this.buildingSystem.drawBuildings();
        
        // 施設の描画
        this.facilitySystem.drawFacilities();
        
        // 入り口接続を道路として描画
        this.visualizationSystem.drawEntranceConnectionsAsRoads();
    }

    // 経路探索
    findPath(start, end) {
        return this.pathfindingSystem.findPath(start, end);
    }

    // 建物への経路探索
    findPathToBuilding(start, building) {
        return this.pathfindingSystem.findPathToBuilding(start, building);
    }

    // 経路の視覚化
    visualizePath(path, color = 0x00ff00) {
        this.visualizationSystem.visualizePath(path, color);
    }

    // 道路ネットワークの視覚化
    visualizeRoadNetwork() {
        this.visualizationSystem.visualizeRoadNetwork();
    }

    // 視覚化のクリア
    clearVisualizations() {
        this.visualizationSystem.clearPathVisualization();
        this.visualizationSystem.clearRoadNetworkVisualization();
    }

    // 建物の位置が安全かチェック（道路距離考慮）
    isValidBuildingPositionWithRoadDistance(x, z, buildingSize) {
        return this.buildingSystem.isValidBuildingPositionWithRoadDistance(x, z, buildingSize);
    }

    // 建物の重複チェック
    isBuildingOverlapping(x, z, buildingSize) {
        return this.buildingSystem.isBuildingOverlapping(x, z, buildingSize);
    }

    // 自宅との重複チェック
    isHomeOverlapping(x, z, buildingSize) {
        return this.buildingSystem.isHomeOverlapping(x, z, buildingSize);
    }

    // 施設の重複チェック
    isFacilityOverlapping(x, z, facilities) {
        return this.facilitySystem.isFacilityOverlapping(x, z, facilities);
    }

    // 最も近い道路を検索
    findNearestRoad(x, z) {
        return this.roadSystem.findNearestRoad(x, z);
    }

    // 最も近い道路上の点を見つける
    findNearestRoadPoint(x, z) {
        return this.roadSystem.findNearestRoadPoint(x, z);
    }

    // すべての道路に対する最小距離を計算
    calculateMinDistanceToRoads(x, z) {
        return this.roadSystem.calculateMinDistanceToRoads(x, z);
    }

    // 建物の入り口位置を計算
    getBuildingEntrance(building) {
        return this.buildingSystem.getBuildingEntrance(building);
    }

    // 建物内の中心位置を計算
    getBuildingCenter(building) {
        return this.buildingSystem.getBuildingCenter(building);
    }

    // 建物の入り口から道路までの接続通路を作成
    createEntranceConnection(building) {
        return this.buildingSystem.createEntranceConnection(building);
    }

    // 建物タイプに応じたサイズを取得
    getBuildingSizeByType(buildingType) {
        return this.buildingSystem.getBuildingSizeByType(buildingType);
    }

    // 建物タイプに応じた色を取得
    getBuildingColorByType(buildingType) {
        return this.buildingSystem.getBuildingColorByType(buildingType);
    }

    // ランダムな建物タイプを取得
    getRandomBuildingType() {
        return this.buildingSystem.getRandomBuildingType();
    }

    // 建物サイズに応じて安全マージンを計算
    getSafetyMarginByBuildingSize(buildingSize) {
        return this.buildingSystem.getSafetyMarginByBuildingSize(buildingSize);
    }

    // 建物サイズに応じて重複チェックのマージンを計算
    getOverlapMarginByBuildingSize(buildingSize1, buildingSize2) {
        return this.buildingSystem.getOverlapMarginByBuildingSize(buildingSize1, buildingSize2);
    }

    // 建物の向きを最も近い道路の方向に計算
    calculateBuildingRotation(buildingX, buildingZ, nearestRoad) {
        return this.buildingSystem.calculateBuildingRotation(buildingX, buildingZ, nearestRoad);
    }

    // 中間点を見つける
    findIntermediatePoint(start, end) {
        return this.pathfindingSystem.findIntermediatePoint(start, end);
    }

    // 2点が同じ道路上にあるかチェック
    arePointsOnSameRoad(point1, point2) {
        return this.pathfindingSystem.arePointsOnSameRoad(point1, point2);
    }

    // 道路上の点を取得
    getRoadPoints(road) {
        return this.roadSystem.getRoadPoints(road);
    }

    // 点と線分の距離を計算
    pointToLineDistance(x, z, road) {
        return this.roadSystem.pointToLineDistance(x, z, road);
    }

    // 道路を直線関数として扱い、点と道路の距離を計算
    calculateDistanceToRoadLine(x, z, road) {
        return this.roadSystem.calculateDistanceToRoadLine(x, z, road);
    }

    // 2つの道路の交差点を計算
    findRoadIntersection(road1, road2) {
        return this.roadSystem.findRoadIntersection(road1, road2);
    }

    // 2つの道路が平行かどうかを判定
    isParallel(road1, road2) {
        return this.roadSystem.isParallel(road1, road2);
    }

    // データの取得
    getRoads() {
        return this.roads;
    }

    getBuildings() {
        return this.buildings;
    }

    getFacilities() {
        return this.facilities;
    }

    getIntersections() {
        return this.intersections;
    }

    // システムへのアクセス
    getRoadSystem() {
        return this.roadSystem;
    }

    getBuildingSystem() {
        return this.buildingSystem;
    }

    getFacilitySystem() {
        return this.facilitySystem;
    }

    getPathfindingSystem() {
        return this.pathfindingSystem;
    }

    getVisualizationSystem() {
        return this.visualizationSystem;
    }
}

// グローバル変数に追加（後方互換性のため）
let cityLayout; 