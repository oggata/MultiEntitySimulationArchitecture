// 場所の作成
function createLocations() {
    // cityLayout.facilitiesから動的に生成された施設データを使用
    const dynamicLocationData = cityLayout.facilities.map(facility => {
        // 施設タイプに応じてアクティビティと雰囲気を設定
        const facilityInfo = getFacilityInfo(facility.name);
        return {
            name: facility.name,
            x: facility.x,
            z: facility.z,
            color: facilityInfo.color,
            activities: facilityInfo.activities,
            atmosphere: facilityInfo.atmosphere
        };
    });
    
    dynamicLocationData.forEach(loc => {
        const locationGroup = new THREE.Group();
        
        // 施設タイプに応じたサイズを取得
        const facilitySize = getFacilitySize(loc.name);
        const facilityHeight = facilitySize * 0.8; // 高さは幅の80%
        
        // 待機スポットの座標を定義
        const waitingSpots = getWaitingSpots(loc.name, facilitySize);
        
        if(loc.name == "公園"){
            // 公園は特殊な形状（円形の緑地）
            const parkGeometry = new THREE.CircleGeometry(facilitySize * 0.8, 32);
            const parkEdges = new THREE.EdgesGeometry(parkGeometry);
            const park = new THREE.LineSegments(parkEdges, new THREE.LineBasicMaterial({ color: 0x228B22 }));
            park.rotation.x = -Math.PI / 2;
            park.position.set(0, 0.01, 0);
            locationGroup.add(park);
        } else if(loc.name == "町の広場"){
            // 広場は特殊な形状（正方形の広場）
            const plazaGeometry = new THREE.PlaneGeometry(facilitySize, facilitySize);
            const plazaEdges = new THREE.EdgesGeometry(plazaGeometry);
            const plaza = new THREE.LineSegments(plazaEdges, new THREE.LineBasicMaterial({ color: 0x90EE90 }));
            plaza.rotation.x = -Math.PI / 2;
            plaza.position.set(0, 0.01, 0);
            locationGroup.add(plaza);
        } else {
            // 建物の基本構造をより詳細に
            createDetailedBuilding(locationGroup, loc, facilitySize, facilityHeight);
        }

        // 建物の入り口通路を追加
        if (loc.name !== "公園" && loc.name !== "町の広場") {
            addEntrancePath(locationGroup, facilitySize, loc.color);
        } else if (loc.name === "公園" || loc.name === "町の広場") {
            addPublicSpaceEntrance(locationGroup, facilitySize, loc.name);
        }

        // 場所特有の装飾（サイズに応じてスケール調整）
        const scale = facilitySize / 4; // 基準サイズ4に対するスケール
        switch(loc.name) {
            case "カフェ":
                // テーブルと椅子
                for(let i = 0; i < 4; i++) {
                    const tableGeometry = new THREE.CylinderGeometry(0.3 * scale, 0.3 * scale, 0.1 * scale, 8);
                    const tableEdges = new THREE.EdgesGeometry(tableGeometry);
                    const table = new THREE.LineSegments(tableEdges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
                    table.position.set(
                        Math.cos(i * Math.PI/2) * 1.2 * scale,
                        0.05 * scale,
                        Math.sin(i * Math.PI/2) * 1.2 * scale
                    );
                    locationGroup.add(table);

                    // 椅子
                    const chairGeometry = new THREE.BoxGeometry(0.4 * scale, 0.4 * scale, 0.4 * scale);
                    const chairEdges = new THREE.EdgesGeometry(chairGeometry);
                    const chair = new THREE.LineSegments(chairEdges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
                    chair.position.set(
                        Math.cos(i * Math.PI/2) * 1 * scale,
                        0.2 * scale,
                        Math.sin(i * Math.PI/2) * 1 * scale
                    );
                    locationGroup.add(chair);
                }
                break;

            case "公園":
                // 木
                for(let i = 0; i < 3; i++) {
                    const trunkGeometry = new THREE.CylinderGeometry(0.2 * scale, 0.3 * scale, 1.5 * scale, 8);
                    const trunkEdges = new THREE.EdgesGeometry(trunkGeometry);
                    const trunk = new THREE.LineSegments(trunkEdges, new THREE.LineBasicMaterial({ color: 0xffff00 }));
                    trunk.position.set(
                        Math.cos(i * Math.PI/1.5) * 2 * scale,
                        0.75 * scale,
                        Math.sin(i * Math.PI/1.5) * 2 * scale
                    );
                    locationGroup.add(trunk);

                    const leavesGeometry = new THREE.SphereGeometry(1 * scale, 8, 8);
                    const leavesEdges = new THREE.EdgesGeometry(leavesGeometry);
                    const leaves = new THREE.LineSegments(leavesEdges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
                    leaves.position.set(
                        Math.cos(i * Math.PI/1.5) * 2 * scale,
                        2 * scale,
                        Math.sin(i * Math.PI/1.5) * 2 * scale
                    );
                    locationGroup.add(leaves);
                }

                // ベンチ
                const benchGeometry = new THREE.BoxGeometry(2 * scale, 0.2 * scale, 0.5 * scale);
                const benchEdges = new THREE.EdgesGeometry(benchGeometry);
                const bench = new THREE.LineSegments(benchEdges, new THREE.LineBasicMaterial({ color: 0xff00ff }));
                bench.position.set(0, 0.1 * scale, 2 * scale);
                locationGroup.add(bench);
                break;

            case "図書館":
                // 本棚
                for(let i = 0; i < 2; i++) {
                    const bookshelfGeometry = new THREE.BoxGeometry(0.3 * scale, 3 * scale, 2 * scale);
                    const bookshelfEdges = new THREE.EdgesGeometry(bookshelfGeometry);
                    const bookshelf = new THREE.LineSegments(bookshelfEdges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
                    bookshelf.position.set(
                        i === 0 ? -2 * scale : 2 * scale,
                        1.5 * scale,
                        0
                    );
                    locationGroup.add(bookshelf);
                }
                
                // 図書館の机と椅子
                for(let i = 0; i < 3; i++) {
                    const deskGeometry = new THREE.BoxGeometry(1.5 * scale, 0.1 * scale, 0.8 * scale);
                    const deskEdges = new THREE.EdgesGeometry(deskGeometry);
                    const desk = new THREE.LineSegments(deskEdges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
                    desk.position.set(
                        (i - 1) * 2 * scale,
                        0.05 * scale,
                        0
                    );
                    locationGroup.add(desk);

                    const chairGeometry = new THREE.BoxGeometry(0.4 * scale, 0.4 * scale, 0.4 * scale);
                    const chairEdges = new THREE.EdgesGeometry(chairGeometry);
                    const chair = new THREE.LineSegments(chairEdges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
                    chair.position.set(
                        (i - 1) * 2 * scale,
                        0.2 * scale,
                        -0.8 * scale
                    );
                    locationGroup.add(chair);
                }
                break;

            case "スポーツジム":
                // トレーニングマシン
                const machineGeometry = new THREE.BoxGeometry(1 * scale, 1 * scale, 2 * scale);
                const machineEdges = new THREE.EdgesGeometry(machineGeometry);
                const machine = new THREE.LineSegments(machineEdges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
                machine.position.set(0, 0.5 * scale, 0);
                locationGroup.add(machine);

                // ウェイト
                const weightGeometry = new THREE.CylinderGeometry(0.2 * scale, 0.2 * scale, 0.4 * scale, 8);
                const weightEdges = new THREE.EdgesGeometry(weightGeometry);
                for(let i = 0; i < 4; i++) {
                    const weight = new THREE.LineSegments(weightEdges, new THREE.LineBasicMaterial({ color: 0xffff00 }));
                    weight.position.set(
                        Math.cos(i * Math.PI/2) * 1.5 * scale,
                        0.2 * scale,
                        Math.sin(i * Math.PI/2) * 1.5 * scale
                    );
                    locationGroup.add(weight);
                }
                
                // ジムのベンチ
                for(let i = 0; i < 2; i++) {
                    const gymBenchGeometry = new THREE.BoxGeometry(1.5 * scale, 0.2 * scale, 0.6 * scale);
                    const gymBenchEdges = new THREE.EdgesGeometry(gymBenchGeometry);
                    const gymBench = new THREE.LineSegments(gymBenchEdges, new THREE.LineBasicMaterial({ color: 0xff00ff }));
                    gymBench.position.set(
                        i === 0 ? -2 * scale : 2 * scale,
                        0.1 * scale,
                        0
                    );
                    locationGroup.add(gymBench);
                }
                break;

            case "町の広場":
                // 噴水
                const fountainBaseGeometry = new THREE.CylinderGeometry(1 * scale, 1.2 * scale, 0.3 * scale, 16);
                const fountainBaseEdges = new THREE.EdgesGeometry(fountainBaseGeometry);
                const fountainBase = new THREE.LineSegments(fountainBaseEdges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
                fountainBase.position.set(0, 0.15 * scale, 0);
                locationGroup.add(fountainBase);

                const fountainCenterGeometry = new THREE.CylinderGeometry(0.3 * scale, 0.3 * scale, 1 * scale, 8);
                const fountainCenterEdges = new THREE.EdgesGeometry(fountainCenterGeometry);
                const fountainCenter = new THREE.LineSegments(fountainCenterEdges, new THREE.LineBasicMaterial({ color: 0xff00ff }));
                fountainCenter.position.set(0, 0.8 * scale, 0);
                locationGroup.add(fountainCenter);

                // ベンチ
                for(let i = 0; i < 4; i++) {
                    const benchGeometry = new THREE.BoxGeometry(2 * scale, 0.2 * scale, 0.5 * scale);
                    const benchEdges = new THREE.EdgesGeometry(benchGeometry);
                    const bench = new THREE.LineSegments(benchEdges, new THREE.LineBasicMaterial({ color: 0xff00ff }));
                    bench.position.set(
                        Math.cos(i * Math.PI/2) * 3 * scale,
                        0.1 * scale,
                        Math.sin(i * Math.PI/2) * 3 * scale
                    );
                    bench.rotation.y = i * Math.PI/2;
                    locationGroup.add(bench);
                }
                break;

            case "学校":
                // 校舎の装飾
                const schoolFlagGeometry = new THREE.BoxGeometry(0.1 * scale, 2 * scale, 0.1 * scale);
                const schoolFlagEdges = new THREE.EdgesGeometry(schoolFlagGeometry);
                const schoolFlag = new THREE.LineSegments(schoolFlagEdges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
                schoolFlag.position.set(2 * scale, 3 * scale, 2 * scale);
                locationGroup.add(schoolFlag);

                // 校庭の装飾
                const playgroundGeometry = new THREE.CircleGeometry(2 * scale, 32);
                const playground = new THREE.Mesh(playgroundGeometry, new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true }));
                playground.rotation.x = -Math.PI / 2;
                playground.position.set(0, 0.01, 0);
                locationGroup.add(playground);
                
                // 学校のベンチ
                for(let i = 0; i < 2; i++) {
                    const schoolBenchGeometry = new THREE.BoxGeometry(1.5 * scale, 0.2 * scale, 0.5 * scale);
                    const schoolBenchEdges = new THREE.EdgesGeometry(schoolBenchGeometry);
                    const schoolBench = new THREE.LineSegments(schoolBenchEdges, new THREE.LineBasicMaterial({ color: 0xff00ff }));
                    schoolBench.position.set(
                        i === 0 ? -1.5 * scale : 1.5 * scale,
                        0.1 * scale,
                        2 * scale
                    );
                    locationGroup.add(schoolBench);
                }
                break;

            case "病院":
                // 救急車の駐車スペース
                const ambulanceSpaceGeometry = new THREE.BoxGeometry(2 * scale, 0.1 * scale, 1 * scale);
                const ambulanceSpaceEdges = new THREE.EdgesGeometry(ambulanceSpaceGeometry);
                const ambulanceSpace = new THREE.LineSegments(ambulanceSpaceEdges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
                ambulanceSpace.position.set(2 * scale, 0.05 * scale, 0);
                locationGroup.add(ambulanceSpace);

                // ヘリポート
                const helipadGeometry = new THREE.CircleGeometry(1 * scale, 32);
                const helipad = new THREE.Mesh(helipadGeometry, new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true }));
                helipad.rotation.x = -Math.PI / 2;
                helipad.position.set(0, facilityHeight + 0.1, 0);
                locationGroup.add(helipad);
                
                // 病院の待合室の椅子
                for(let i = 0; i < 4; i++) {
                    const waitingChairGeometry = new THREE.BoxGeometry(0.4 * scale, 0.4 * scale, 0.4 * scale);
                    const waitingChairEdges = new THREE.EdgesGeometry(waitingChairGeometry);
                    const waitingChair = new THREE.LineSegments(waitingChairEdges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
                    waitingChair.position.set(
                        (i - 1.5) * 1.2 * scale,
                        0.2 * scale,
                        -2 * scale
                    );
                    locationGroup.add(waitingChair);
                }
                break;

            case "スーパーマーケット":
                // ショッピングカート
                for(let i = 0; i < 3; i++) {
                    const cartGeometry = new THREE.BoxGeometry(0.5 * scale, 0.5 * scale, 0.8 * scale);
                    const cartEdges = new THREE.EdgesGeometry(cartGeometry);
                    const cart = new THREE.LineSegments(cartEdges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
                    cart.position.set(
                        Math.cos(i * Math.PI/1.5) * 2 * scale,
                        0.25 * scale,
                        Math.sin(i * Math.PI/1.5) * 2 * scale
                    );
                    locationGroup.add(cart);
                }

                // 駐車場
                const parkingGeometry = new THREE.BoxGeometry(4 * scale, 0.1 * scale, 2 * scale);
                const parkingEdges = new THREE.EdgesGeometry(parkingGeometry);
                const parking = new THREE.LineSegments(parkingEdges, new THREE.LineBasicMaterial({ color: 0xff00ff }));
                parking.position.set(0, 0.05 * scale, 3 * scale);
                locationGroup.add(parking);
                
                // スーパーのレジ待機列
                for(let i = 0; i < 3; i++) {
                    const queueSpotGeometry = new THREE.BoxGeometry(0.3 * scale, 0.1 * scale, 0.3 * scale);
                    const queueSpotEdges = new THREE.EdgesGeometry(queueSpotGeometry);
                    const queueSpot = new THREE.LineSegments(queueSpotEdges, new THREE.LineBasicMaterial({ color: 0xffff00 }));
                    queueSpot.position.set(
                        -2 * scale,
                        0.05 * scale,
                        (i - 1) * 1.2 * scale
                    );
                    locationGroup.add(queueSpot);
                }
                break;

            case "ファミレス":
                // テーブルと椅子
                for(let i = 0; i < 6; i++) {
                    const tableGeometry = new THREE.CylinderGeometry(0.4 * scale, 0.4 * scale, 0.1 * scale, 8);
                    const tableEdges = new THREE.EdgesGeometry(tableGeometry);
                    const table = new THREE.LineSegments(tableEdges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
                    table.position.set(
                        Math.cos(i * Math.PI/3) * 1.2 * scale,
                        0.05 * scale,
                        Math.sin(i * Math.PI/3) * 1.2 * scale
                    );
                    locationGroup.add(table);

                    // 椅子
                    const chairGeometry = new THREE.BoxGeometry(0.5 * scale, 0.5 * scale, 0.5 * scale);
                    const chairEdges = new THREE.EdgesGeometry(chairGeometry);
                    const chair = new THREE.LineSegments(chairEdges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
                    chair.position.set(
                        Math.cos(i * Math.PI/3) * 1.5 * scale,
                        0.25 * scale,
                        Math.sin(i * Math.PI/3) * 1.5 * scale
                    );
                    locationGroup.add(chair);
                }

                // カウンター
                const counterGeometry = new THREE.BoxGeometry(3 * scale, 0.8 * scale, 0.5 * scale);
                const counterEdges = new THREE.EdgesGeometry(counterGeometry);
                const counter = new THREE.LineSegments(counterEdges, new THREE.LineBasicMaterial({ color: 0xff00ff }));
                counter.position.set(0, 0.4 * scale, -2 * scale);
                locationGroup.add(counter);
                
                // ファミレスの待機席
                for(let i = 0; i < 2; i++) {
                    const waitingSeatGeometry = new THREE.BoxGeometry(0.4 * scale, 0.4 * scale, 0.4 * scale);
                    const waitingSeatEdges = new THREE.EdgesGeometry(waitingSeatGeometry);
                    const waitingSeat = new THREE.LineSegments(waitingSeatEdges, new THREE.LineBasicMaterial({ color: 0xffff00 }));
                    waitingSeat.position.set(
                        (i - 0.5) * 1.5 * scale,
                        0.2 * scale,
                        -3 * scale
                    );
                    locationGroup.add(waitingSeat);
                }
                break;
        }

        // 看板
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, 256, 64);
        // グロー効果
        context.shadowColor = '#00ffff';
        context.shadowBlur = 16;
        context.font = 'bold 32px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = '#00ffff';
        context.fillText(loc.name, 128, 32);
        // 背景は透明
        // テクスチャ生成
        const texture = new THREE.CanvasTexture(canvas);
        // 半透明板
        const signGeometry = new THREE.PlaneGeometry(3 * scale, 0.75 * scale);
        const signMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.7 });
        const signMesh = new THREE.Mesh(signGeometry, signMaterial);
        signMesh.position.set(0, facilityHeight + 0.5, facilitySize * 0.8);
        locationGroup.add(signMesh);
        // 縁取り
        const signEdges = new THREE.EdgesGeometry(signGeometry);
        const signLine = new THREE.LineSegments(signEdges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
        signLine.position.copy(signMesh.position);
        locationGroup.add(signLine);

        // 場所の位置を設定
        locationGroup.position.set(loc.x, 0, loc.z);
        scene.add(locationGroup);
        
        locations.push({
            name: loc.name,
            position: new THREE.Vector3(loc.x, 0, loc.z),
            mesh: locationGroup,
            activities: loc.activities,
            atmosphere: loc.atmosphere,
            waitingSpots: waitingSpots,
            occupiedSpots: new Set() // 使用中のスポットを管理
        });
    });


}

// 詳細な建物を作成する関数
function createDetailedBuilding(locationGroup, loc, facilitySize, facilityHeight) {
    const scale = facilitySize / 4;
    
    switch(loc.name) {
        case "カフェ":
            // カフェは小さな建物で、窓が特徴的
            createCafeBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "図書館":
            // 図書館は大きな建物で、柱が特徴的
            createLibraryBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "スポーツジム":
            // ジムは大きな建物で、窓が多く、屋上に設備がある
            createGymBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "学校":
            // 学校は大きな建物で、時計塔がある
            createSchoolBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "病院":
            // 病院は大きな建物で、十字マークがある
            createHospitalBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "スーパーマーケット":
            // スーパーは大きな建物で、駐車場が特徴的
            createSupermarketBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "ファミレス":
            // ファミレスは中サイズの建物で、看板が特徴的
            createFamilyRestaurantBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "郵便局":
            createPostOfficeBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "銀行":
            createBankBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "美容院":
            createBeautySalonBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "クリーニング店":
            createCleaningShopBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "薬局":
            createPharmacyBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "本屋":
            createBookstoreBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "コンビニ":
            createConvenienceStoreBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "パン屋":
            createBakeryBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "花屋":
            createFlowerShopBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "電気屋":
            createElectronicsShopBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "八百屋":
            createGreengrocerBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "魚屋":
            createFishShopBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "肉屋":
            createButcherShopBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "ケーキ屋":
            createCakeShopBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "喫茶店":
            createTeaHouseBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "ラーメン屋":
            createRamenShopBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "寿司屋":
            createSushiShopBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "居酒屋":
            createIzakayaBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "銭湯":
            createPublicBathBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "ゲームセンター":
            createGameCenterBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "映画館":
            createCinemaBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "カラオケ":
            createKaraokeBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "ボーリング場":
            createBowlingAlleyBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "温泉":
            createHotSpringBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "神社":
            createShrineBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "寺":
            createTempleBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "消防署":
            createFireStationBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "警察署":
            createPoliceStationBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        case "市役所":
            createCityHallBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
            
        default:
            // デフォルトの建物（より詳細な立方体）
            createDefaultBuilding(locationGroup, facilitySize, facilityHeight, loc.color, scale);
            break;
    }
}

// 共通の透過化建物作成関数
function createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, options = {}) {
    const {
        windows = [],
        roof = { type: 'flat', color: 0x696969 },
        decorations = [],
        entrance = null,
        sign = null
    } = options;
    
    // メインの建物
    const mainBuildingGeometry = new THREE.BoxGeometry(facilitySize, facilityHeight, facilitySize);
    const mainBuildingMaterial = new THREE.MeshBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.3 
    });
    const mainBuilding = new THREE.Mesh(mainBuildingGeometry, mainBuildingMaterial);
    mainBuilding.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuilding);
    
    // 建物の輪郭線
    const mainBuildingEdges = new THREE.EdgesGeometry(mainBuildingGeometry);
    const mainBuildingOutline = new THREE.LineSegments(mainBuildingEdges, new THREE.LineBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.8 
    }));
    mainBuildingOutline.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuildingOutline);
    
    // 窓の追加
    windows.forEach(windowConfig => {
        const windowGeometry = new THREE.PlaneGeometry(windowConfig.width, windowConfig.height);
        const windowMaterial = new THREE.MeshBasicMaterial({ 
            color: windowConfig.color || 0x87CEEB, 
            transparent: true, 
            opacity: 0.6 
        });
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(windowConfig.x, windowConfig.y, windowConfig.z);
        if (windowConfig.rotation) {
            window.rotation.set(windowConfig.rotation.x || 0, windowConfig.rotation.y || 0, windowConfig.rotation.z || 0);
        }
        locationGroup.add(window);
    });
    
    // 屋根の追加
    if (roof.type === 'flat') {
        const roofGeometry = new THREE.BoxGeometry(facilitySize * 1.1, 0.2, facilitySize * 1.1);
        const roofMaterial = new THREE.MeshBasicMaterial({ 
            color: roof.color, 
            transparent: true, 
            opacity: 0.4 
        });
        const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
        roofMesh.position.set(0, facilityHeight + 0.1, 0);
        locationGroup.add(roofMesh);
        
        // 屋根の輪郭線
        const roofEdges = new THREE.EdgesGeometry(roofGeometry);
        const roofOutline = new THREE.LineSegments(roofEdges, new THREE.LineBasicMaterial({ 
            color: roof.color, 
            transparent: true, 
            opacity: 0.8 
        }));
        roofOutline.position.set(0, facilityHeight + 0.1, 0);
        locationGroup.add(roofOutline);
    } else if (roof.type === 'cone') {
        const roofGeometry = new THREE.ConeGeometry(facilitySize * 0.8, facilityHeight * 0.3, 4);
        const roofMaterial = new THREE.MeshBasicMaterial({ 
            color: roof.color, 
            transparent: true, 
            opacity: 0.4 
        });
        const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
        roofMesh.position.set(0, facilityHeight + facilityHeight * 0.15, 0);
        roofMesh.rotation.y = Math.PI / 4;
        locationGroup.add(roofMesh);
    }
    
    // 装飾の追加
    decorations.forEach(decoration => {
        const decorationGeometry = new THREE.BoxGeometry(decoration.width, decoration.height, decoration.depth);
        const decorationMaterial = new THREE.MeshBasicMaterial({ 
            color: decoration.color, 
            transparent: true, 
            opacity: decoration.opacity || 0.8 
        });
        const decorationMesh = new THREE.Mesh(decorationGeometry, decorationMaterial);
        decorationMesh.position.set(decoration.x, decoration.y, decoration.z);
        locationGroup.add(decorationMesh);
    });
    
    // 入口の追加
    if (entrance) {
        const entranceGeometry = new THREE.PlaneGeometry(entrance.width, entrance.height);
        const entranceMaterial = new THREE.MeshBasicMaterial({ 
            color: entrance.color, 
            transparent: true, 
            opacity: entrance.opacity || 0.7 
        });
        const entranceMesh = new THREE.Mesh(entranceGeometry, entranceMaterial);
        entranceMesh.position.set(entrance.x, entrance.y, entrance.z);
        locationGroup.add(entranceMesh);
    }
    
    // 看板の追加
    if (sign) {
        const signGeometry = new THREE.BoxGeometry(sign.width, sign.height, sign.depth);
        const signMaterial = new THREE.MeshBasicMaterial({ 
            color: sign.color, 
            transparent: true, 
            opacity: sign.opacity || 0.8 
        });
        const signMesh = new THREE.Mesh(signGeometry, signMaterial);
        signMesh.position.set(sign.x, sign.y, sign.z);
        locationGroup.add(signMesh);
    }
}

// カフェの建物を作成
function createCafeBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    // メインの建物（小さめ）
    const mainBuildingGeometry = new THREE.BoxGeometry(facilitySize * 0.8, facilityHeight * 0.7, facilitySize * 0.8);
    const mainBuildingMaterial = new THREE.MeshBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.3 
    });
    const mainBuilding = new THREE.Mesh(mainBuildingGeometry, mainBuildingMaterial);
    mainBuilding.position.set(0, facilityHeight * 0.35, 0);
    locationGroup.add(mainBuilding);
    
    // 建物の輪郭線
    const mainBuildingEdges = new THREE.EdgesGeometry(mainBuildingGeometry);
    const mainBuildingOutline = new THREE.LineSegments(mainBuildingEdges, new THREE.LineBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.8 
    }));
    mainBuildingOutline.position.set(0, facilityHeight * 0.35, 0);
    locationGroup.add(mainBuildingOutline);
    
    // 屋根（三角屋根）
    const roofGeometry = new THREE.ConeGeometry(facilitySize * 0.6, facilityHeight * 0.3, 4);
    const roofMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x8B4513, 
        transparent: true, 
        opacity: 0.4 
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, facilityHeight * 0.7 + facilityHeight * 0.15, 0);
    roof.rotation.y = Math.PI / 4;
    locationGroup.add(roof);
    
    // 屋根の輪郭線
    const roofEdges = new THREE.EdgesGeometry(roofGeometry);
    const roofOutline = new THREE.LineSegments(roofEdges, new THREE.LineBasicMaterial({ 
        color: 0x8B4513, 
        transparent: true, 
        opacity: 0.8 
    }));
    roofOutline.position.set(0, facilityHeight * 0.7 + facilityHeight * 0.15, 0);
    roofOutline.rotation.y = Math.PI / 4;
    locationGroup.add(roofOutline);
    
    // 窓
    for(let i = 0; i < 2; i++) {
        const windowGeometry = new THREE.PlaneGeometry(facilitySize * 0.3, facilityHeight * 0.4);
        const windowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x87CEEB, 
            transparent: true, 
            opacity: 0.6 
        });
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(
            (i === 0 ? -1 : 1) * facilitySize * 0.25,
            facilityHeight * 0.35,
            facilitySize * 0.4
        );
        locationGroup.add(window);
    }
    
    // テラス
    const terraceGeometry = new THREE.BoxGeometry(facilitySize * 0.6, 0.1, facilitySize * 0.3);
    const terraceMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x8B4513, 
        transparent: true, 
        opacity: 0.5 
    });
    const terrace = new THREE.Mesh(terraceGeometry, terraceMaterial);
    terrace.position.set(0, 0.05, facilitySize * 0.4);
    locationGroup.add(terrace);
}

// 図書館の建物を作成
function createLibraryBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    // メインの建物
    const mainBuildingGeometry = new THREE.BoxGeometry(facilitySize, facilityHeight, facilitySize);
    const mainBuildingMaterial = new THREE.MeshBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.3 
    });
    const mainBuilding = new THREE.Mesh(mainBuildingGeometry, mainBuildingMaterial);
    mainBuilding.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuilding);
    
    // 建物の輪郭線
    const mainBuildingEdges = new THREE.EdgesGeometry(mainBuildingGeometry);
    const mainBuildingOutline = new THREE.LineSegments(mainBuildingEdges, new THREE.LineBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.8 
    }));
    mainBuildingOutline.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuildingOutline);
    
    // 柱（正面）
    for(let i = 0; i < 3; i++) {
        const columnGeometry = new THREE.BoxGeometry(0.3, facilityHeight, 0.3);
        const columnMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x8B4513, 
            transparent: true, 
            opacity: 0.6 
        });
        const column = new THREE.Mesh(columnGeometry, columnMaterial);
        column.position.set(
            (i - 1) * facilitySize * 0.3,
            facilityHeight/2,
            facilitySize * 0.5
        );
        locationGroup.add(column);
    }
    
    // 屋根（平ら）
    const roofGeometry = new THREE.BoxGeometry(facilitySize * 1.1, 0.2, facilitySize * 1.1);
    const roofMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x696969, 
        transparent: true, 
        opacity: 0.4 
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, facilityHeight + 0.1, 0);
    locationGroup.add(roof);
    
    // 屋根の輪郭線
    const roofEdges = new THREE.EdgesGeometry(roofGeometry);
    const roofOutline = new THREE.LineSegments(roofEdges, new THREE.LineBasicMaterial({ 
        color: 0x696969, 
        transparent: true, 
        opacity: 0.8 
    }));
    roofOutline.position.set(0, facilityHeight + 0.1, 0);
    locationGroup.add(roofOutline);
    
    // 大きな窓
    const windowGeometry = new THREE.PlaneGeometry(facilitySize * 0.8, facilityHeight * 0.6);
    const windowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x87CEEB, 
        transparent: true, 
        opacity: 0.6 
    });
    const window = new THREE.Mesh(windowGeometry, windowMaterial);
    window.position.set(0, facilityHeight * 0.3, facilitySize * 0.5);
    locationGroup.add(window);
}

// スポーツジムの建物を作成
function createGymBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    // メインの建物
    const mainBuildingGeometry = new THREE.BoxGeometry(facilitySize, facilityHeight, facilitySize);
    const mainBuildingMaterial = new THREE.MeshBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.3 
    });
    const mainBuilding = new THREE.Mesh(mainBuildingGeometry, mainBuildingMaterial);
    mainBuilding.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuilding);
    
    // 建物の輪郭線
    const mainBuildingEdges = new THREE.EdgesGeometry(mainBuildingGeometry);
    const mainBuildingOutline = new THREE.LineSegments(mainBuildingEdges, new THREE.LineBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.8 
    }));
    mainBuildingOutline.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuildingOutline);
    
    // 大きな窓（複数）
    for(let i = 0; i < 3; i++) {
        const windowGeometry = new THREE.PlaneGeometry(facilitySize * 0.25, facilityHeight * 0.7);
        const windowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x87CEEB, 
            transparent: true, 
            opacity: 0.6 
        });
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(
            (i - 1) * facilitySize * 0.3,
            facilityHeight * 0.35,
            facilitySize * 0.5
        );
        locationGroup.add(window);
    }
    
    // 屋上設備
    const roofEquipmentGeometry = new THREE.BoxGeometry(facilitySize * 0.3, facilityHeight * 0.2, facilitySize * 0.3);
    const roofEquipmentMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x696969, 
        transparent: true, 
        opacity: 0.4 
    });
    const roofEquipment = new THREE.Mesh(roofEquipmentGeometry, roofEquipmentMaterial);
    roofEquipment.position.set(0, facilityHeight + facilityHeight * 0.1, 0);
    locationGroup.add(roofEquipment);
    
    // 屋根（平ら）
    const roofGeometry = new THREE.BoxGeometry(facilitySize * 1.1, 0.2, facilitySize * 1.1);
    const roofMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x696969, 
        transparent: true, 
        opacity: 0.4 
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, facilityHeight + 0.1, 0);
    locationGroup.add(roof);
    
    // 屋根の輪郭線
    const roofEdges = new THREE.EdgesGeometry(roofGeometry);
    const roofOutline = new THREE.LineSegments(roofEdges, new THREE.LineBasicMaterial({ 
        color: 0x696969, 
        transparent: true, 
        opacity: 0.8 
    }));
    roofOutline.position.set(0, facilityHeight + 0.1, 0);
    locationGroup.add(roofOutline);
}

// 学校の建物を作成
function createSchoolBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    // メインの建物
    const mainBuildingGeometry = new THREE.BoxGeometry(facilitySize, facilityHeight, facilitySize);
    const mainBuildingMaterial = new THREE.MeshBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.3 
    });
    const mainBuilding = new THREE.Mesh(mainBuildingGeometry, mainBuildingMaterial);
    mainBuilding.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuilding);
    
    // 建物の輪郭線
    const mainBuildingEdges = new THREE.EdgesGeometry(mainBuildingGeometry);
    const mainBuildingOutline = new THREE.LineSegments(mainBuildingEdges, new THREE.LineBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.8 
    }));
    mainBuildingOutline.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuildingOutline);
    
    // 時計塔
    const clockTowerGeometry = new THREE.BoxGeometry(facilitySize * 0.2, facilityHeight * 0.5, facilitySize * 0.2);
    const clockTowerMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x8B4513, 
        transparent: true, 
        opacity: 0.6 
    });
    const clockTower = new THREE.Mesh(clockTowerGeometry, clockTowerMaterial);
    clockTower.position.set(0, facilityHeight + facilityHeight * 0.25, 0);
    locationGroup.add(clockTower);
    
    // 時計
    const clockGeometry = new THREE.CircleGeometry(facilitySize * 0.08, 16);
    const clockMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000, 
        transparent: true, 
        opacity: 0.8 
    });
    const clock = new THREE.Mesh(clockGeometry, clockMaterial);
    clock.position.set(0, facilityHeight + facilityHeight * 0.25, facilitySize * 0.1);
    clock.rotation.x = -Math.PI / 2;
    locationGroup.add(clock);
    
    // 屋根（三角屋根）
    const roofGeometry = new THREE.ConeGeometry(facilitySize * 0.8, facilityHeight * 0.3, 4);
    const roofMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x8B4513, 
        transparent: true, 
        opacity: 0.4 
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, facilityHeight + facilityHeight * 0.15, 0);
    roof.rotation.y = Math.PI / 4;
    locationGroup.add(roof);
    
    // 窓
    for(let i = 0; i < 4; i++) {
        const windowGeometry = new THREE.PlaneGeometry(facilitySize * 0.2, facilityHeight * 0.5);
        const windowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x87CEEB, 
            transparent: true, 
            opacity: 0.6 
        });
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(
            Math.cos(i * Math.PI/2) * facilitySize * 0.4,
            facilityHeight * 0.25,
            Math.sin(i * Math.PI/2) * facilitySize * 0.4
        );
        window.rotation.y = i * Math.PI/2;
        locationGroup.add(window);
    }
}

// 病院の建物を作成
function createHospitalBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    // メインの建物
    const mainBuildingGeometry = new THREE.BoxGeometry(facilitySize, facilityHeight, facilitySize);
    const mainBuildingMaterial = new THREE.MeshBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.3 
    });
    const mainBuilding = new THREE.Mesh(mainBuildingGeometry, mainBuildingMaterial);
    mainBuilding.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuilding);
    
    // 建物の輪郭線
    const mainBuildingEdges = new THREE.EdgesGeometry(mainBuildingGeometry);
    const mainBuildingOutline = new THREE.LineSegments(mainBuildingEdges, new THREE.LineBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.8 
    }));
    mainBuildingOutline.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuildingOutline);
    
    // 十字マーク
    const crossGeometry = new THREE.BoxGeometry(facilitySize * 0.1, facilityHeight * 0.3, facilitySize * 0.3);
    const crossMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFF0000, 
        transparent: true, 
        opacity: 0.8 
    });
    const cross = new THREE.Mesh(crossGeometry, crossMaterial);
    cross.position.set(0, facilityHeight + facilityHeight * 0.15, 0);
    locationGroup.add(cross);
    
    const cross2Geometry = new THREE.BoxGeometry(facilitySize * 0.3, facilityHeight * 0.3, facilitySize * 0.1);
    const cross2Material = new THREE.MeshBasicMaterial({ 
        color: 0xFF0000, 
        transparent: true, 
        opacity: 0.8 
    });
    const cross2 = new THREE.Mesh(cross2Geometry, cross2Material);
    cross2.position.set(0, facilityHeight + facilityHeight * 0.15, 0);
    locationGroup.add(cross2);
    
    // 屋根（平ら）
    const roofGeometry = new THREE.BoxGeometry(facilitySize * 1.1, 0.2, facilitySize * 1.1);
    const roofMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x696969, 
        transparent: true, 
        opacity: 0.4 
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, facilityHeight + 0.1, 0);
    locationGroup.add(roof);
    
    // 屋根の輪郭線
    const roofEdges = new THREE.EdgesGeometry(roofGeometry);
    const roofOutline = new THREE.LineSegments(roofEdges, new THREE.LineBasicMaterial({ 
        color: 0x696969, 
        transparent: true, 
        opacity: 0.8 
    }));
    roofOutline.position.set(0, facilityHeight + 0.1, 0);
    locationGroup.add(roofOutline);
    
    // 窓
    for(let i = 0; i < 3; i++) {
        const windowGeometry = new THREE.PlaneGeometry(facilitySize * 0.2, facilityHeight * 0.4);
        const windowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x87CEEB, 
            transparent: true, 
            opacity: 0.6 
        });
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(
            (i - 1) * facilitySize * 0.3,
            facilityHeight * 0.3,
            facilitySize * 0.5
        );
        locationGroup.add(window);
    }
}

// スーパーマーケットの建物を作成
function createSupermarketBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    // メインの建物
    const mainBuildingGeometry = new THREE.BoxGeometry(facilitySize, facilityHeight, facilitySize);
    const mainBuildingMaterial = new THREE.MeshBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.3 
    });
    const mainBuilding = new THREE.Mesh(mainBuildingGeometry, mainBuildingMaterial);
    mainBuilding.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuilding);
    
    // 建物の輪郭線
    const mainBuildingEdges = new THREE.EdgesGeometry(mainBuildingGeometry);
    const mainBuildingOutline = new THREE.LineSegments(mainBuildingEdges, new THREE.LineBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.8 
    }));
    mainBuildingOutline.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuildingOutline);
    
    // 大きな入口
    const entranceGeometry = new THREE.PlaneGeometry(facilitySize * 0.6, facilityHeight * 0.8);
    const entranceMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x87CEEB, 
        transparent: true, 
        opacity: 0.7 
    });
    const entrance = new THREE.Mesh(entranceGeometry, entranceMaterial);
    entrance.position.set(0, facilityHeight * 0.4, facilitySize * 0.5);
    locationGroup.add(entrance);
    
    // 屋根（平ら）
    const roofGeometry = new THREE.BoxGeometry(facilitySize * 1.1, 0.2, facilitySize * 1.1);
    const roofMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x696969, 
        transparent: true, 
        opacity: 0.4 
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, facilityHeight + 0.1, 0);
    locationGroup.add(roof);
    
    // 屋根の輪郭線
    const roofEdges = new THREE.EdgesGeometry(roofGeometry);
    const roofOutline = new THREE.LineSegments(roofEdges, new THREE.LineBasicMaterial({ 
        color: 0x696969, 
        transparent: true, 
        opacity: 0.8 
    }));
    roofOutline.position.set(0, facilityHeight + 0.1, 0);
    locationGroup.add(roofOutline);
    
    // 看板
    const signGeometry = new THREE.BoxGeometry(facilitySize * 0.8, facilityHeight * 0.2, 0.1);
    const signMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFD700, 
        transparent: true, 
        opacity: 0.8 
    });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, facilityHeight + facilityHeight * 0.1, facilitySize * 0.4);
    locationGroup.add(sign);
}

// ファミレスの建物を作成
function createFamilyRestaurantBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    // メインの建物
    const mainBuildingGeometry = new THREE.BoxGeometry(facilitySize, facilityHeight, facilitySize);
    const mainBuildingMaterial = new THREE.MeshBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.3 
    });
    const mainBuilding = new THREE.Mesh(mainBuildingGeometry, mainBuildingMaterial);
    mainBuilding.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuilding);
    
    // 建物の輪郭線
    const mainBuildingEdges = new THREE.EdgesGeometry(mainBuildingGeometry);
    const mainBuildingOutline = new THREE.LineSegments(mainBuildingEdges, new THREE.LineBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.8 
    }));
    mainBuildingOutline.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuildingOutline);
    
    // 屋根（三角屋根）
    const roofGeometry = new THREE.ConeGeometry(facilitySize * 0.8, facilityHeight * 0.3, 4);
    const roofMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x8B4513, 
        transparent: true, 
        opacity: 0.4 
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, facilityHeight + facilityHeight * 0.15, 0);
    roof.rotation.y = Math.PI / 4;
    locationGroup.add(roof);
    
    // 窓
    for(let i = 0; i < 2; i++) {
        const windowGeometry = new THREE.PlaneGeometry(facilitySize * 0.3, facilityHeight * 0.5);
        const windowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x87CEEB, 
            transparent: true, 
            opacity: 0.6 
        });
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(
            (i === 0 ? -1 : 1) * facilitySize * 0.25,
            facilityHeight * 0.25,
            facilitySize * 0.5
        );
        locationGroup.add(window);
    }
    
    // 入口の庇
    const canopyGeometry = new THREE.BoxGeometry(facilitySize * 0.4, 0.1, facilitySize * 0.2);
    const canopyMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x8B4513, 
        transparent: true, 
        opacity: 0.5 
    });
    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopy.position.set(0, facilityHeight * 0.8, facilitySize * 0.4);
    locationGroup.add(canopy);
}

// デフォルトの建物を作成（より詳細な立方体）
function createDefaultBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    // メインの建物（透過可能な面で作成）
    const mainBuildingGeometry = new THREE.BoxGeometry(facilitySize, facilityHeight, facilitySize);
    const mainBuildingMaterial = new THREE.MeshBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.3 
    });
    const mainBuilding = new THREE.Mesh(mainBuildingGeometry, mainBuildingMaterial);
    mainBuilding.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuilding);
    
    // 建物の輪郭線（透過を保ちながら輪郭を明確にする）
    const mainBuildingEdges = new THREE.EdgesGeometry(mainBuildingGeometry);
    const mainBuildingOutline = new THREE.LineSegments(mainBuildingEdges, new THREE.LineBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.8 
    }));
    mainBuildingOutline.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuildingOutline);
    
    // 屋根（平らな屋根）
    const roofGeometry = new THREE.BoxGeometry(facilitySize * 1.1, 0.2, facilitySize * 1.1);
    const roofMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x696969, 
        transparent: true, 
        opacity: 0.4 
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, facilityHeight + 0.1, 0);
    locationGroup.add(roof);
    
    // 屋根の輪郭線
    const roofEdges = new THREE.EdgesGeometry(roofGeometry);
    const roofOutline = new THREE.LineSegments(roofEdges, new THREE.LineBasicMaterial({ 
        color: 0x696969, 
        transparent: true, 
        opacity: 0.8 
    }));
    roofOutline.position.set(0, facilityHeight + 0.1, 0);
    locationGroup.add(roofOutline);
    
    // 窓（正面）
    for(let i = 0; i < 3; i++) {
        const windowGeometry = new THREE.PlaneGeometry(facilitySize * 0.15, facilityHeight * 0.4);
        const windowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x87CEEB, 
            transparent: true, 
            opacity: 0.6 
        });
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(
            (i - 1) * facilitySize * 0.25,
            facilityHeight * 0.3,
            facilitySize * 0.5
        );
        locationGroup.add(window);
    }
    
    // 窓（側面）
    for(let i = 0; i < 2; i++) {
        for(let j = 0; j < 2; j++) {
            const sideWindowGeometry = new THREE.PlaneGeometry(facilitySize * 0.12, facilityHeight * 0.3);
            const sideWindowMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x87CEEB, 
                transparent: true, 
                opacity: 0.6 
            });
            const sideWindow = new THREE.Mesh(sideWindowGeometry, sideWindowMaterial);
            sideWindow.position.set(
                (i === 0 ? -1 : 1) * facilitySize * 0.5,
                facilityHeight * 0.25 + (j - 0.5) * facilityHeight * 0.4,
                0
            );
            sideWindow.rotation.y = i === 0 ? Math.PI / 2 : -Math.PI / 2;
            locationGroup.add(sideWindow);
        }
    }
    
    // 入口
    const entranceGeometry = new THREE.PlaneGeometry(facilitySize * 0.3, facilityHeight * 0.6);
    const entranceMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x8B4513, 
        transparent: true, 
        opacity: 0.7 
    });
    const entrance = new THREE.Mesh(entranceGeometry, entranceMaterial);
    entrance.position.set(0, facilityHeight * 0.3, facilitySize * 0.5);
    locationGroup.add(entrance);
    
    // 屋上設備（大きな建物の場合）
    if (facilitySize > 4) {
        const roofEquipmentGeometry = new THREE.BoxGeometry(facilitySize * 0.2, facilityHeight * 0.15, facilitySize * 0.2);
        const roofEquipmentMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x696969, 
            transparent: true, 
            opacity: 0.4 
        });
        const roofEquipment = new THREE.Mesh(roofEquipmentGeometry, roofEquipmentMaterial);
        roofEquipment.position.set(0, facilityHeight + facilityHeight * 0.075, 0);
        locationGroup.add(roofEquipment);
    }
}

// 建物の入り口通路を作成する関数
function addEntrancePath(locationGroup, facilitySize, buildingColor) {
    const pathWidth = facilitySize * 0.3; // 通路の幅
    const pathLength = facilitySize * 0.8; // 通路の長さ
    
    // 通路の地面
    const pathGeometry = new THREE.PlaneGeometry(pathWidth, pathLength);
    const pathEdges = new THREE.EdgesGeometry(pathGeometry);
    const pathMaterial = new THREE.LineBasicMaterial({ color: 0x888888 });
    const path = new THREE.LineSegments(pathEdges, pathMaterial);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.02, facilitySize * 0.6); // 建物の手前に配置
    locationGroup.add(path);
    
    // 入り口の階段（小さな段差）
    const stepGeometry = new THREE.BoxGeometry(pathWidth * 0.8, 0.1, 0.2);
    const stepEdges = new THREE.EdgesGeometry(stepGeometry);
    const stepMaterial = new THREE.LineBasicMaterial({ color: buildingColor });
    const step = new THREE.LineSegments(stepEdges, stepMaterial);
    step.position.set(0, 0.05, facilitySize * 0.4);
    locationGroup.add(step);
    
    // 入り口のドア枠
    const doorFrameGeometry = new THREE.BoxGeometry(0.8, facilitySize * 0.4, 0.1);
    const doorFrameEdges = new THREE.EdgesGeometry(doorFrameGeometry);
    const doorFrameMaterial = new THREE.LineBasicMaterial({ color: 0x444444 });
    const doorFrame = new THREE.LineSegments(doorFrameEdges, doorFrameMaterial);
    doorFrame.position.set(0, facilitySize * 0.2, facilitySize * 0.45);
    locationGroup.add(doorFrame);
    
    // 入り口の看板
    const entranceSignGeometry = new THREE.PlaneGeometry(1.5, 0.5);
    const entranceSignEdges = new THREE.EdgesGeometry(entranceSignGeometry);
    const entranceSignMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const entranceSign = new THREE.LineSegments(entranceSignEdges, entranceSignMaterial);
    entranceSign.position.set(0, 0.5, facilitySize * 0.3);
    locationGroup.add(entranceSign);
}

// エージェントの自宅を作成する関数
function createAgentHome(homeData) {
    // 事前に作成された自宅の場合は座標を変更しない
    if (homeData.isOccupied !== undefined) {
        // 既存の自宅との重複チェック（警告のみ）
        const existingHomes = locations.filter(loc => loc.isHome);
        const isDuplicate = existingHomes.some(home => {
            const distance = Math.sqrt(
                (home.position.x - homeData.x) ** 2 + 
                (home.position.z - homeData.z) ** 2
            );
            return distance < 3; // 3マス以内にある場合は重複とみなす
        });
        
        if (isDuplicate) {
            console.warn(`自宅「${homeData.name}」が既存の自宅と重複していますが、事前作成された自宅のため座標は変更しません。`);
        }
    } else {
        // 従来の重複チェック（古いデータ用）
        const existingHomes = locations.filter(loc => loc.isHome);
        const isDuplicate = existingHomes.some(home => {
            const distance = Math.sqrt(
                (home.position.x - homeData.x) ** 2 + 
                (home.position.z - homeData.z) ** 2
            );
            return distance < 3; // 3マス以内にある場合は重複とみなす
        });
        
        if (isDuplicate) {
            console.warn(`自宅「${homeData.name}」が既存の自宅と重複しています。座標を調整します。`);
            // 重複している場合、新しい座標を生成
            let attempts = 0;
            const maxAttempts = 50;
            
            while (attempts < maxAttempts) {
                const newX = Math.floor(Math.random() * 41) - 20;
                const newZ = Math.floor(Math.random() * 41) - 20;
                
                const isTooClose = existingHomes.some(home => {
                    const distance = Math.sqrt(
                        (home.position.x - newX) ** 2 + 
                        (home.position.z - newZ) ** 2
                    );
                    return distance < 3;
                });
                
                if (!isTooClose) {
                    homeData.x = newX;
                    homeData.z = newZ;
                    console.log(`自宅「${homeData.name}」の座標を (${newX}, ${newZ}) に調整しました。`);
                    break;
                }
                
                attempts++;
            }
            
            if (attempts >= maxAttempts) {
                console.error(`自宅「${homeData.name}」の重複回避に失敗しました。`);
            }
        }
    }
    
    const homeGroup = new THREE.Group();
    
    // 自宅のサイズ（小サイズ）
    const homeSize = cityLayoutConfig.buildingSizes.small;
    const homeHeight = homeSize * 0.8;
    
    // 家の基本構造（透過した壁）
    const houseGeometry = new THREE.BoxGeometry(homeSize, homeHeight, homeSize);
    const houseMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff00ff, 
        transparent: true, 
        opacity: 0.3 
    });
    const house = new THREE.Mesh(houseGeometry, houseMaterial);
    house.position.set(0, homeHeight/2, 0);
    homeGroup.add(house);
    
    // 家の境界線
    const houseEdges = new THREE.EdgesGeometry(houseGeometry);
    const houseEdgeMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff });
    const houseEdge = new THREE.LineSegments(houseEdges, houseEdgeMaterial);
    houseEdge.position.copy(house.position);
    homeGroup.add(houseEdge);

    // 屋根（三角屋根、透過した色）
    const roofGeometry = new THREE.ConeGeometry(homeSize * 0.75, homeSize * 0.5, 4);
    const roofMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x8B4513, 
        transparent: true, 
        opacity: 0.4 
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, homeHeight + homeSize * 0.25, 0);
    roof.rotation.y = Math.PI / 4;
    homeGroup.add(roof);
    
    // 屋根の境界線
    const roofEdges = new THREE.EdgesGeometry(roofGeometry);
    const roofEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x8B4513 });
    const roofEdge = new THREE.LineSegments(roofEdges, roofEdgeMaterial);
    roofEdge.position.copy(roof.position);
    roofEdge.rotation.copy(roof.rotation);
    homeGroup.add(roofEdge);

    // 窓（正面、透過した色）
    for(let i = 0; i < 2; i++) {
        const windowGeometry = new THREE.PlaneGeometry(homeSize * 0.2, homeHeight * 0.3);
        const windowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x87CEEB, 
            transparent: true, 
            opacity: 0.6 
        });
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(
            (i === 0 ? -1 : 1) * homeSize * 0.25,
            homeHeight * 0.4,
            homeSize * 0.5
        );
        homeGroup.add(window);
        
        // 窓の境界線
        const windowEdges = new THREE.EdgesGeometry(windowGeometry);
        const windowEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x87CEEB });
        const windowEdge = new THREE.LineSegments(windowEdges, windowEdgeMaterial);
        windowEdge.position.copy(window.position);
        homeGroup.add(windowEdge);
    }

    // 窓（側面、透過した色）
    for(let i = 0; i < 2; i++) {
        const sideWindowGeometry = new THREE.PlaneGeometry(homeSize * 0.15, homeHeight * 0.25);
        const sideWindowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x87CEEB, 
            transparent: true, 
            opacity: 0.6 
        });
        const sideWindow = new THREE.Mesh(sideWindowGeometry, sideWindowMaterial);
        sideWindow.position.set(
            (i === 0 ? -1 : 1) * homeSize * 0.5,
            homeHeight * 0.35,
            0
        );
        sideWindow.rotation.y = i === 0 ? Math.PI / 2 : -Math.PI / 2;
        homeGroup.add(sideWindow);
        
        // 側面窓の境界線
        const sideWindowEdges = new THREE.EdgesGeometry(sideWindowGeometry);
        const sideWindowEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x87CEEB });
        const sideWindowEdge = new THREE.LineSegments(sideWindowEdges, sideWindowEdgeMaterial);
        sideWindowEdge.position.copy(sideWindow.position);
        sideWindowEdge.rotation.copy(sideWindow.rotation);
        homeGroup.add(sideWindowEdge);
    }

    // 入り口の扉（透過した色）
    const doorGeometry = new THREE.PlaneGeometry(homeSize * 0.3, homeHeight * 0.5);
    const doorMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x8B4513, 
        transparent: true, 
        opacity: 0.7 
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, homeHeight * 0.25, homeSize * 0.5);
    homeGroup.add(door);
    
    // 扉の境界線
    const doorEdges = new THREE.EdgesGeometry(doorGeometry);
    const doorEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x8B4513 });
    const doorEdge = new THREE.LineSegments(doorEdges, doorEdgeMaterial);
    doorEdge.position.copy(door.position);
    homeGroup.add(doorEdge);

    // 玄関の庇（透過した色）
    const canopyGeometry = new THREE.BoxGeometry(homeSize * 0.4, 0.1, homeSize * 0.2);
    const canopyMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x8B4513, 
        transparent: true, 
        opacity: 0.8 
    });
    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopy.position.set(0, homeHeight * 0.8, homeSize * 0.4);
    homeGroup.add(canopy);
    
    // 庇の境界線
    const canopyEdges = new THREE.EdgesGeometry(canopyGeometry);
    const canopyEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x8B4513 });
    const canopyEdge = new THREE.LineSegments(canopyEdges, canopyEdgeMaterial);
    canopyEdge.position.copy(canopy.position);
    homeGroup.add(canopyEdge);

    // 煙突（透過した色）
    const chimneyGeometry = new THREE.BoxGeometry(homeSize * 0.15, homeSize * 0.3, homeSize * 0.15);
    const chimneyMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x696969, 
        transparent: true, 
        opacity: 0.8 
    });
    const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
    chimney.position.set(homeSize * 0.2, homeHeight + homeSize * 0.4, 0);
    homeGroup.add(chimney);
    
    // 煙突の境界線
    const chimneyEdges = new THREE.EdgesGeometry(chimneyGeometry);
    const chimneyEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x696969 });
    const chimneyEdge = new THREE.LineSegments(chimneyEdges, chimneyEdgeMaterial);
    chimneyEdge.position.copy(chimney.position);
    homeGroup.add(chimneyEdge);

    // 看板（自宅）
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, 256, 64);
    context.shadowColor = '#00ffff';
    context.shadowBlur = 16;
    context.font = 'bold 24px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#00ffff';
    context.fillText(homeData.name, 128, 32);
    const texture = new THREE.CanvasTexture(canvas);
    const signGeometry = new THREE.PlaneGeometry(2, 0.5);
    const signMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.7 });
    const signMesh = new THREE.Mesh(signGeometry, signMaterial);
    signMesh.position.set(0, homeHeight + 0.5, homeSize * 0.6);
    homeGroup.add(signMesh);
    const signEdges = new THREE.EdgesGeometry(signGeometry);
    const signLine = new THREE.LineSegments(signEdges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
    signLine.position.copy(signMesh.position);
    homeGroup.add(signLine);

    // 家の位置を設定
    homeGroup.position.set(homeData.x, 0, homeData.z);
    scene.add(homeGroup);
    
    // 家の入り口接続を作成
    const homeBuilding = {
        x: homeData.x,
        z: homeData.z,
        size: homeSize,
        rotation: 0, // 家は正面を向いていると仮定
        type: 'home'
    };
    
    // 入り口接続を描画
    if (cityLayout && cityLayout.createEntranceConnection) {
        const connection = cityLayout.createEntranceConnection(homeBuilding);
        if (connection) {
            const dx = connection.end.x - connection.start.x;
            const dz = connection.end.z - connection.start.z;
            const length = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dz, dx);
            
            // 家の入り口通路の地面（塗りつぶし）
            const pathGeometry = new THREE.PlaneGeometry(length, 1.2);
            const roadMaterial = new THREE.MeshBasicMaterial({ 
                color: cityLayoutConfig.roadColors.homeRoad, // 設定ファイルから読み込み
                transparent: true,
                opacity: cityLayoutConfig.roadColors.opacity // 設定ファイルから読み込み
            });
            const path = new THREE.Mesh(pathGeometry, roadMaterial);
            path.position.set(
                (connection.start.x + connection.end.x) / 2,
                0.15, // 地面より少し上に配置
                (connection.start.z + connection.end.z) / 2
            );
            path.rotation.x = -Math.PI / 2;
            path.rotation.z = angle;
            scene.add(path);
            
            // 境界線
            // 境界線（無効化）
            // const pathEdges = new THREE.EdgesGeometry(pathGeometry);
            // const edgeMaterial = new THREE.LineBasicMaterial({ 
            //     color: cityLayoutConfig.roadColors.borderLine, // 透明
            //     linewidth: 2
            // });
            // const edge = new THREE.LineSegments(pathEdges, edgeMaterial);
            // edge.position.copy(path.position);
            // edge.rotation.copy(path.rotation);
            // scene.add(edge);
            
            // 家の入り口の階段
            const stepGeometry = new THREE.BoxGeometry(1, 0.1, 0.15);
            const stepEdges = new THREE.EdgesGeometry(stepGeometry);
            const stepMaterial = new THREE.LineBasicMaterial({ color: homeData.color });
            const step = new THREE.LineSegments(stepEdges, stepMaterial);
            step.position.set(
                connection.start.x,
                0.05,
                connection.start.z
            );
            scene.add(step);
        }
    }
    
    locations.push({
        name: homeData.name,
        position: new THREE.Vector3(homeData.x, 0, homeData.z),
        mesh: homeGroup,
        activities: ["休憩する", "眠る", "読書する"],
        atmosphere: "静かで落ち着いた雰囲気の家",
        isHome: true,
        owner: homeData.name.replace('の家', '')
    });
}

// 家の入り口通路を作成する関数
function addHomeEntrancePath(homeGroup, homeSize, homeColor) {
    const pathWidth = homeSize * 0.4; // 通路の幅
    const pathLength = homeSize * 0.6; // 通路の長さ
    
    // 通路の地面
    const pathGeometry = new THREE.PlaneGeometry(pathWidth, pathLength);
    const pathEdges = new THREE.EdgesGeometry(pathGeometry);
    const pathMaterial = new THREE.LineBasicMaterial({ color: 0x666666 });
    const path = new THREE.LineSegments(pathEdges, pathMaterial);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.02, homeSize * 0.5); // 家の手前に配置
    homeGroup.add(path);
    
    // 入り口の階段
    const stepGeometry = new THREE.BoxGeometry(pathWidth * 0.6, 0.1, 0.15);
    const stepEdges = new THREE.EdgesGeometry(stepGeometry);
    const stepMaterial = new THREE.LineBasicMaterial({ color: homeColor });
    const step = new THREE.LineSegments(stepEdges, stepMaterial);
    step.position.set(0, 0.05, homeSize * 0.35);
    homeGroup.add(step);
    
    // 入り口のドア枠
    const doorFrameGeometry = new THREE.BoxGeometry(0.6, homeSize * 0.3, 0.1);
    const doorFrameEdges = new THREE.EdgesGeometry(doorFrameGeometry);
    const doorFrameMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
    const doorFrame = new THREE.LineSegments(doorFrameEdges, doorFrameMaterial);
    doorFrame.position.set(0, homeSize * 0.15, homeSize * 0.4);
    homeGroup.add(doorFrame);
    
    // 玄関のポーチ
    const porchGeometry = new THREE.BoxGeometry(pathWidth * 0.8, 0.05, 0.3);
    const porchEdges = new THREE.EdgesGeometry(porchGeometry);
    const porchMaterial = new THREE.LineBasicMaterial({ color: 0x444444 });
    const porch = new THREE.LineSegments(porchEdges, porchMaterial);
    porch.position.set(0, 0.025, homeSize * 0.25);
    homeGroup.add(porch);
}

// 公園と広場の入り口を作成する関数
function addPublicSpaceEntrance(locationGroup, facilitySize, spaceName) {
    const pathWidth = facilitySize * 0.4; // 通路の幅
    const pathLength = facilitySize * 0.5; // 通路の長さ
    
    // 通路の地面
    const pathGeometry = new THREE.PlaneGeometry(pathWidth, pathLength);
    const pathEdges = new THREE.EdgesGeometry(pathGeometry);
    const pathMaterial = new THREE.LineBasicMaterial({ color: 0x555555 });
    const path = new THREE.LineSegments(pathEdges, pathMaterial);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.02, facilitySize * 0.4); // 施設の手前に配置
    locationGroup.add(path);
    
    // 入り口の看板
    const signGeometry = new THREE.PlaneGeometry(2, 0.8);
    const signEdges = new THREE.EdgesGeometry(signGeometry);
    const signMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const sign = new THREE.LineSegments(signEdges, signMaterial);
    sign.position.set(0, 1, facilitySize * 0.3);
    locationGroup.add(sign);
    
    // 入り口の柵（公園の場合）
    if (spaceName === "公園") {
        for (let i = 0; i < 3; i++) {
            const fenceGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.1);
            const fenceEdges = new THREE.EdgesGeometry(fenceGeometry);
            const fenceMaterial = new THREE.LineBasicMaterial({ color: 0x8B4513 });
            const fence = new THREE.LineSegments(fenceEdges, fenceMaterial);
            fence.position.set(
                (i - 1) * 1.5,
                0.4,
                facilitySize * 0.25
            );
            locationGroup.add(fence);
        }
    }
    
    // 入り口のベンチ（広場の場合）
    if (spaceName === "町の広場") {
        const benchGeometry = new THREE.BoxGeometry(2, 0.2, 0.6);
        const benchEdges = new THREE.EdgesGeometry(benchGeometry);
        const benchMaterial = new THREE.LineBasicMaterial({ color: 0x8B4513 });
        const bench = new THREE.LineSegments(benchEdges, benchMaterial);
        bench.position.set(0, 0.1, facilitySize * 0.2);
        locationGroup.add(bench);
    }
}

// 施設情報を取得する関数
function getFacilityInfo(facilityName) {
    const facilityInfo = {
        'カフェ': {
            color: 0x8B4513,
            activities: ["コーヒーを飲む", "会話する", "読書する", "仕事をする"],
            atmosphere: "落ち着いた雰囲気で、コーヒーの香りが漂う"
        },
        '公園': {
            color: 0x228B22,
            activities: ["散歩する", "絵を描く", "ベンチで休む", "運動する"],
            atmosphere: "緑豊かで開放的な空間"
        },
        '図書館': {
            color: 0x4682B4,
            activities: ["勉強する", "本を読む", "調べ物をする", "静かに過ごす"],
            atmosphere: "静寂に包まれた知識の宝庫"
        },
        'スポーツジム': {
            color: 0xFF6347,
            activities: ["運動する", "筋トレする", "ヨガをする", "他の人と運動の話をする"],
            atmosphere: "活気があり、エネルギッシュな場所"
        },
        '町の広場': {
            color: 0x90EE90,
            activities: ["散歩する", "休憩する", "会話する"],
            atmosphere: "開放的な空間で、人々が集まる場所"
        },
        '学校': {
            color: 0x87CEEB,
            activities: ["勉強する", "運動する", "友達と話す"],
            atmosphere: "活気のある教育施設"
        },
        '病院': {
            color: 0xFFFFFF,
            activities: ["診察を受ける", "待合室で待つ", "健康相談する"],
            atmosphere: "清潔で落ち着いた医療施設"
        },
        'スーパーマーケット': {
            color: 0xFFD700,
            activities: ["買い物する", "食材を選ぶ", "レジで支払う"],
            atmosphere: "便利で快適なショッピング空間"
        },
        'ファミレス': {
            color: 0xFF69B4,
            activities: ["食事する", "会話する", "休憩する"],
            atmosphere: "家族向けの温かいレストラン"
        },
        '郵便局': {
            color: 0x4169E1,
            activities: ["郵便物を出す", "手紙を書く", "荷物を送る", "手続きをする"],
            atmosphere: "静かで落ち着いた公共施設"
        },
        '銀行': {
            color: 0x32CD32,
            activities: ["お金を下ろす", "振り込みをする", "相談する", "手続きをする"],
            atmosphere: "重厚で信頼感のある金融機関"
        },
        '美容院': {
            color: 0xFF1493,
            activities: ["髪を切る", "美容の相談をする", "雑誌を読む", "リラックスする"],
            atmosphere: "明るく親しみやすい美容空間"
        },
        'クリーニング店': {
            color: 0x20B2AA,
            activities: ["洗濯物を出す", "取り置きを取る", "相談する"],
            atmosphere: "清潔で整然とした洗濯店"
        },
        '薬局': {
            color: 0x00CED1,
            activities: ["薬を買う", "健康相談をする", "サプリメントを選ぶ"],
            atmosphere: "清潔で安心感のある薬局"
        },
        '本屋': {
            color: 0x8B4513,
            activities: ["本を探す", "立ち読みする", "本の相談をする", "雑誌を読む"],
            atmosphere: "本の香りが漂う知的空間"
        },
        'コンビニ': {
            color: 0xFF4500,
            activities: ["買い物する", "雑誌を読む", "休憩する", "軽食を買う"],
            atmosphere: "24時間営業の便利な店"
        },
        'パン屋': {
            color: 0xFFB6C1,
            activities: ["パンを買う", "香りを楽しむ", "朝食を買う", "おやつを買う"],
            atmosphere: "焼きたてパンの香りが漂う温かい店"
        },
        '花屋': {
            color: 0xFF69B4,
            activities: ["花を買う", "花の相談をする", "花を眺める", "プレゼントを選ぶ"],
            atmosphere: "色とりどりの花が並ぶ華やかな店"
        },
        '電気屋': {
            color: 0x1E90FF,
            activities: ["電化製品を見る", "相談する", "買い物する", "修理を依頼する"],
            atmosphere: "最新の電化製品が並ぶ明るい店"
        },
        '八百屋': {
            color: 0x32CD32,
            activities: ["野菜を買う", "果物を買う", "新鮮な食材を選ぶ", "店主と話す"],
            atmosphere: "新鮮な野菜や果物が並ぶ活気のある店"
        },
        '魚屋': {
            color: 0x00CED1,
            activities: ["魚を買う", "鮮度を確認する", "調理法を聞く", "刺身を買う"],
            atmosphere: "新鮮な魚の香りが漂う海鮮店"
        },
        '肉屋': {
            color: 0xDC143C,
            activities: ["肉を買う", "調理法を聞く", "新鮮さを確認する", "注文する"],
            atmosphere: "新鮮な肉が並ぶ専門店"
        },
        'ケーキ屋': {
            color: 0xFFB6C1,
            activities: ["ケーキを買う", "ケーキを眺める", "誕生日ケーキを注文する", "おやつを買う"],
            atmosphere: "甘い香りが漂う可愛らしい店"
        },
        '喫茶店': {
            color: 0x8B4513,
            activities: ["コーヒーを飲む", "ケーキを食べる", "会話する", "読書する"],
            atmosphere: "昭和の雰囲気が残る落ち着いた店"
        },
        'ラーメン屋': {
            color: 0xFF6347,
            activities: ["ラーメンを食べる", "会話する", "暖かいスープを楽しむ"],
            atmosphere: "醤油の香りが漂う温かい店"
        },
        '寿司屋': {
            color: 0x00CED1,
            activities: ["寿司を食べる", "刺身を食べる", "会話する", "職人の技を楽しむ"],
            atmosphere: "新鮮な魚と職人の技が光る高級店"
        },
        '居酒屋': {
            color: 0xFF4500,
            activities: ["お酒を飲む", "料理を食べる", "会話する", "リラックスする"],
            atmosphere: "温かみのある日本の居酒屋"
        },
        '銭湯': {
            color: 0x20B2AA,
            activities: ["お風呂に入る", "リラックスする", "会話する", "体を休める"],
            atmosphere: "日本の伝統的な銭湯"
        },
        'ゲームセンター': {
            color: 0xFF1493,
            activities: ["ゲームをする", "友達と遊ぶ", "景品を狙う", "楽しむ"],
            atmosphere: "活気があり、音と光が溢れる遊び場"
        },
        '映画館': {
            color: 0x4B0082,
            activities: ["映画を見る", "ポップコーンを食べる", "映画の話をする", "リラックスする"],
            atmosphere: "暗くて落ち着いた映画鑑賞空間"
        },
        'カラオケ': {
            color: 0xFF69B4,
            activities: ["歌を歌う", "友達と楽しむ", "リラックスする", "飲み物を飲む"],
            atmosphere: "明るく楽しいカラオケ空間"
        },
        'ボーリング場': {
            color: 0x1E90FF,
            activities: ["ボーリングをする", "友達と遊ぶ", "スコアを競う", "楽しむ"],
            atmosphere: "活気があり、音が響く遊び場"
        },
        '温泉': {
            color: 0x20B2AA,
            activities: ["温泉に入る", "リラックスする", "会話する", "体を休める"],
            atmosphere: "日本の伝統的な温泉施設"
        },
        '神社': {
            color: 0x8B4513,
            activities: ["お参りする", "願い事をする", "静かに過ごす", "写真を撮る"],
            atmosphere: "静寂で神聖な日本の伝統施設"
        },
        '寺': {
            color: 0x8B4513,
            activities: ["お参りする", "静かに過ごす", "仏像を見る", "心を落ち着かせる"],
            atmosphere: "静寂で厳かな仏教施設"
        },
        '消防署': {
            color: 0xFF0000,
            activities: ["見学する", "防災について学ぶ", "消防車を見る"],
            atmosphere: "安全を守る重要な公共施設"
        },
        '警察署': {
            color: 0x0000FF,
            activities: ["相談する", "届け出をする", "安全について学ぶ"],
            atmosphere: "地域の安全を守る重要な施設"
        },
        '市役所': {
            color: 0x808080,
            activities: ["手続きをする", "相談する", "書類を提出する", "情報を集める"],
            atmosphere: "地域の行政を担う重要な施設"
        }
    };
    
    return facilityInfo[facilityName] || {
        color: 0x808080,
        activities: ["過ごす"],
        atmosphere: "一般的な施設"
    };
}

// 施設サイズを取得する関数
function getFacilitySize(facilityName) {
    const sizeMap = {
        // 大サイズの施設
        '公園': cityLayoutConfig.buildingSizes.large,
        '学校': cityLayoutConfig.buildingSizes.large,
        'スーパーマーケット': cityLayoutConfig.buildingSizes.large,
        '病院': cityLayoutConfig.buildingSizes.large,
        'スポーツジム': cityLayoutConfig.buildingSizes.large,
        '図書館': cityLayoutConfig.buildingSizes.large,
        '町の広場': cityLayoutConfig.buildingSizes.large,
        
        // 中サイズの施設
        'カフェ': cityLayoutConfig.buildingSizes.medium,
        'ファミレス': cityLayoutConfig.buildingSizes.medium,
        'ショップ': cityLayoutConfig.buildingSizes.medium,
        'オフィス': cityLayoutConfig.buildingSizes.medium,
        '銀行': cityLayoutConfig.buildingSizes.medium,
        '郵便局': cityLayoutConfig.buildingSizes.medium
    };
    
    return sizeMap[facilityName] || cityLayoutConfig.buildingSizes.medium;
}

// 待機スポットの座標を取得する関数
function getWaitingSpots(facilityName, facilitySize) {
    const waitingSpots = [];
    const scale = facilitySize / 4; // 基準サイズ4に対するスケール

    switch(facilityName) {
        case "カフェ":
            // カフェの待機スポットは椅子のみ
            for(let i = 0; i < 4; i++) {
                waitingSpots.push({
                    position: new THREE.Vector3(
                        Math.cos(i * Math.PI/2) * 1 * scale,
                        0.2 * scale,
                        Math.sin(i * Math.PI/2) * 1 * scale
                    ),
                    type: "chair"
                });
            }
            break;

        case "公園":
            // 公園の待機スポットはベンチ（複数の座席）
            for(let i = 0; i < 3; i++) {
                waitingSpots.push({
                    position: new THREE.Vector3(
                        (i - 1) * 0.8 * scale,
                        0.1 * scale,
                        2 * scale
                    ),
                    type: "bench"
                });
            }
            
            // 公園内の散歩道にも待機スポットを追加
            for(let i = 0; i < 4; i++) {
                waitingSpots.push({
                    position: new THREE.Vector3(
                        Math.cos(i * Math.PI/2) * 1.5 * scale,
                        0.05 * scale,
                        Math.sin(i * Math.PI/2) * 1.5 * scale
                    ),
                    type: "path"
                });
            }
            break;

        case "図書館":
            // 図書館の待機スポットは椅子のみ
            for(let i = 0; i < 3; i++) {
                waitingSpots.push({
                    position: new THREE.Vector3(
                        (i - 1) * 2 * scale,
                        0.2 * scale,
                        -0.8 * scale
                    ),
                    type: "chair"
                });
            }
            break;

        case "スポーツジム":
            // ジムの待機スポットはベンチ（複数の座席）
            for(let i = 0; i < 2; i++) {
                for(let j = 0; j < 3; j++) {
                    waitingSpots.push({
                        position: new THREE.Vector3(
                            (i === 0 ? -2 * scale : 2 * scale) + (j - 1) * 0.6 * scale,
                            0.1 * scale,
                            0
                        ),
                        type: "gymBench"
                    });
                }
            }
            
            // トレーニングエリアにも待機スポットを追加
            for(let i = 0; i < 4; i++) {
                waitingSpots.push({
                    position: new THREE.Vector3(
                        Math.cos(i * Math.PI/2) * 1.5 * scale,
                        0.05 * scale,
                        Math.sin(i * Math.PI/2) * 1.5 * scale
                    ),
                    type: "trainingArea"
                });
            }
            break;

        case "町の広場":
            // 広場の待機スポットはベンチ（各ベンチに複数の座席）
            for(let i = 0; i < 4; i++) {
                // 各ベンチに3つの座席を作成
                for(let j = 0; j < 3; j++) {
                    const benchAngle = i * Math.PI/2;
                    const seatOffset = (j - 1) * 0.8 * scale; // ベンチに沿った座席の間隔
                    
                    // ベンチの方向に沿った座席位置を計算
                    const seatX = Math.cos(benchAngle) * 3 * scale + Math.cos(benchAngle + Math.PI/2) * seatOffset;
                    const seatZ = Math.sin(benchAngle) * 3 * scale + Math.sin(benchAngle + Math.PI/2) * seatOffset;
                    
                    waitingSpots.push({
                        position: new THREE.Vector3(
                            seatX,
                            0.1 * scale,
                            seatZ
                        ),
                        type: "bench"
                    });
                }
            }
            
            // 噴水の周りにも待機スポットを追加
            for(let i = 0; i < 6; i++) {
                waitingSpots.push({
                    position: new THREE.Vector3(
                        Math.cos(i * Math.PI/3) * 2 * scale,
                        0.05 * scale,
                        Math.sin(i * Math.PI/3) * 2 * scale
                    ),
                    type: "fountain"
                });
            }
            break;

        case "学校":
            // 学校の待機スポットはベンチ（複数の座席）
            for(let i = 0; i < 2; i++) {
                for(let j = 0; j < 3; j++) {
                    waitingSpots.push({
                        position: new THREE.Vector3(
                            (i === 0 ? -1.5 * scale : 1.5 * scale) + (j - 1) * 0.6 * scale,
                            0.1 * scale,
                            2 * scale
                        ),
                        type: "schoolBench"
                    });
                }
            }
            
            // 校庭にも待機スポットを追加
            for(let i = 0; i < 4; i++) {
                waitingSpots.push({
                    position: new THREE.Vector3(
                        Math.cos(i * Math.PI/2) * 1.5 * scale,
                        0.05 * scale,
                        Math.sin(i * Math.PI/2) * 1.5 * scale
                    ),
                    type: "playground"
                });
            }
            break;

        case "病院":
            // 病院の待機スポットは椅子
            for(let i = 0; i < 4; i++) {
                waitingSpots.push({
                    position: new THREE.Vector3(
                        (i - 1.5) * 1.2 * scale,
                        0.2 * scale,
                        -2 * scale
                    ),
                    type: "waitingChair"
                });
            }
            break;

        case "スーパーマーケット":
            // スーパーの待機スポットはレジ待機列
            for(let i = 0; i < 3; i++) {
                waitingSpots.push({
                    position: new THREE.Vector3(
                        -2 * scale,
                        0.05 * scale,
                        (i - 1) * 1.2 * scale
                    ),
                    type: "queueSpot"
                });
            }
            break;

        case "ファミレス":
            // ファミレスの待機スポットは椅子と席
            for(let i = 0; i < 6; i++) {
                waitingSpots.push({
                    position: new THREE.Vector3(
                        Math.cos(i * Math.PI/3) * 1.5 * scale,
                        0.25 * scale,
                        Math.sin(i * Math.PI/3) * 1.5 * scale
                    ),
                    type: "chair"
                });
            }
            // 待機席
            for(let i = 0; i < 2; i++) {
                waitingSpots.push({
                    position: new THREE.Vector3(
                        (i - 0.5) * 1.5 * scale,
                        0.2 * scale,
                        -3 * scale
                    ),
                    type: "waitingSeat"
                });
            }
            break;
    }
    return waitingSpots;
}

// 郵便局の建物を作成
function createPostOfficeBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    // メインの建物
    const mainBuildingGeometry = new THREE.BoxGeometry(facilitySize, facilityHeight, facilitySize);
    const mainBuildingMaterial = new THREE.MeshBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.3 
    });
    const mainBuilding = new THREE.Mesh(mainBuildingGeometry, mainBuildingMaterial);
    mainBuilding.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuilding);
    
    // 建物の輪郭線
    const mainBuildingEdges = new THREE.EdgesGeometry(mainBuildingGeometry);
    const mainBuildingOutline = new THREE.LineSegments(mainBuildingEdges, new THREE.LineBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.8 
    }));
    mainBuildingOutline.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuildingOutline);
    
    // 郵便局の看板
    const signGeometry = new THREE.BoxGeometry(facilitySize * 0.6, facilityHeight * 0.2, 0.1);
    const signMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x4169E1, 
        transparent: true, 
        opacity: 0.8 
    });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, facilityHeight + facilityHeight * 0.1, facilitySize * 0.4);
    locationGroup.add(sign);
    
    // 窓
    for(let i = 0; i < 2; i++) {
        const windowGeometry = new THREE.PlaneGeometry(facilitySize * 0.2, facilityHeight * 0.4);
        const windowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x87CEEB, 
            transparent: true, 
            opacity: 0.6 
        });
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(
            (i === 0 ? -1 : 1) * facilitySize * 0.25,
            facilityHeight * 0.3,
            facilitySize * 0.5
        );
        locationGroup.add(window);
    }
    
    // 屋根（平ら）
    const roofGeometry = new THREE.BoxGeometry(facilitySize * 1.1, 0.2, facilitySize * 1.1);
    const roofMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x696969, 
        transparent: true, 
        opacity: 0.4 
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, facilityHeight + 0.1, 0);
    locationGroup.add(roof);
    
    // 屋根の輪郭線
    const roofEdges = new THREE.EdgesGeometry(roofGeometry);
    const roofOutline = new THREE.LineSegments(roofEdges, new THREE.LineBasicMaterial({ 
        color: 0x696969, 
        transparent: true, 
        opacity: 0.8 
    }));
    roofOutline.position.set(0, facilityHeight + 0.1, 0);
    locationGroup.add(roofOutline);
}

// 銀行の建物を作成
function createBankBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    // メインの建物
    const mainBuildingGeometry = new THREE.BoxGeometry(facilitySize, facilityHeight, facilitySize);
    const mainBuildingMaterial = new THREE.MeshBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.3 
    });
    const mainBuilding = new THREE.Mesh(mainBuildingGeometry, mainBuildingMaterial);
    mainBuilding.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuilding);
    
    // 建物の輪郭線
    const mainBuildingEdges = new THREE.EdgesGeometry(mainBuildingGeometry);
    const mainBuildingOutline = new THREE.LineSegments(mainBuildingEdges, new THREE.LineBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.8 
    }));
    mainBuildingOutline.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuildingOutline);
    
    // 柱（正面）
    for(let i = 0; i < 3; i++) {
        const columnGeometry = new THREE.BoxGeometry(0.3, facilityHeight, 0.3);
        const columnMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x8B4513, 
            transparent: true, 
            opacity: 0.6 
        });
        const column = new THREE.Mesh(columnGeometry, columnMaterial);
        column.position.set(
            (i - 1) * facilitySize * 0.3,
            facilityHeight/2,
            facilitySize * 0.5
        );
        locationGroup.add(column);
    }
    
    // 大きな入口
    const entranceGeometry = new THREE.PlaneGeometry(facilitySize * 0.4, facilityHeight * 0.7);
    const entranceMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x8B4513, 
        transparent: true, 
        opacity: 0.7 
    });
    const entrance = new THREE.Mesh(entranceGeometry, entranceMaterial);
    entrance.position.set(0, facilityHeight * 0.35, facilitySize * 0.5);
    locationGroup.add(entrance);
    
    // 屋根（平ら）
    const roofGeometry = new THREE.BoxGeometry(facilitySize * 1.1, 0.2, facilitySize * 1.1);
    const roofMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x696969, 
        transparent: true, 
        opacity: 0.4 
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, facilityHeight + 0.1, 0);
    locationGroup.add(roof);
    
    // 屋根の輪郭線
    const roofEdges = new THREE.EdgesGeometry(roofGeometry);
    const roofOutline = new THREE.LineSegments(roofEdges, new THREE.LineBasicMaterial({ 
        color: 0x696969, 
        transparent: true, 
        opacity: 0.8 
    }));
    roofOutline.position.set(0, facilityHeight + 0.1, 0);
    locationGroup.add(roofOutline);
}

// 美容院の建物を作成
function createBeautySalonBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    // メインの建物
    const mainBuildingGeometry = new THREE.BoxGeometry(facilitySize, facilityHeight, facilitySize);
    const mainBuildingMaterial = new THREE.MeshBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.3 
    });
    const mainBuilding = new THREE.Mesh(mainBuildingGeometry, mainBuildingMaterial);
    mainBuilding.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuilding);
    
    // 建物の輪郭線
    const mainBuildingEdges = new THREE.EdgesGeometry(mainBuildingGeometry);
    const mainBuildingOutline = new THREE.LineSegments(mainBuildingEdges, new THREE.LineBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.8 
    }));
    mainBuildingOutline.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuildingOutline);
    
    // 大きな窓（美容院らしい）
    for(let i = 0; i < 2; i++) {
        const windowGeometry = new THREE.PlaneGeometry(facilitySize * 0.3, facilityHeight * 0.6);
        const windowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x87CEEB, 
            transparent: true, 
            opacity: 0.6 
        });
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(
            (i === 0 ? -1 : 1) * facilitySize * 0.25,
            facilityHeight * 0.3,
            facilitySize * 0.5
        );
        locationGroup.add(window);
    }
    
    // 屋根（三角屋根）
    const roofGeometry = new THREE.ConeGeometry(facilitySize * 0.8, facilityHeight * 0.3, 4);
    const roofMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x8B4513, 
        transparent: true, 
        opacity: 0.4 
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, facilityHeight + facilityHeight * 0.15, 0);
    roof.rotation.y = Math.PI / 4;
    locationGroup.add(roof);
}

// クリーニング店の建物を作成
function createCleaningShopBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    // メインの建物
    const mainBuildingGeometry = new THREE.BoxGeometry(facilitySize, facilityHeight, facilitySize);
    const mainBuildingMaterial = new THREE.MeshBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.3 
    });
    const mainBuilding = new THREE.Mesh(mainBuildingGeometry, mainBuildingMaterial);
    mainBuilding.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuilding);
    
    // 建物の輪郭線
    const mainBuildingEdges = new THREE.EdgesGeometry(mainBuildingGeometry);
    const mainBuildingOutline = new THREE.LineSegments(mainBuildingEdges, new THREE.LineBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.8 
    }));
    mainBuildingOutline.position.set(0, facilityHeight/2, 0);
    locationGroup.add(mainBuildingOutline);
    
    // 窓
    for(let i = 0; i < 2; i++) {
        const windowGeometry = new THREE.PlaneGeometry(facilitySize * 0.2, facilityHeight * 0.4);
        const windowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x87CEEB, 
            transparent: true, 
            opacity: 0.6 
        });
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(
            (i === 0 ? -1 : 1) * facilitySize * 0.25,
            facilityHeight * 0.3,
            facilitySize * 0.5
        );
        locationGroup.add(window);
    }
    
    // 屋根（平ら）
    const roofGeometry = new THREE.BoxGeometry(facilitySize * 1.1, 0.2, facilitySize * 1.1);
    const roofMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x696969, 
        transparent: true, 
        opacity: 0.4 
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, facilityHeight + 0.1, 0);
    locationGroup.add(roof);
    
    // 屋根の輪郭線
    const roofEdges = new THREE.EdgesGeometry(roofGeometry);
    const roofOutline = new THREE.LineSegments(roofEdges, new THREE.LineBasicMaterial({ 
        color: 0x696969, 
        transparent: true, 
        opacity: 0.8 
    }));
    roofOutline.position.set(0, facilityHeight + 0.1, 0);
    locationGroup.add(roofOutline);
}

// 薬局の建物を作成
function createPharmacyBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const windows = [
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: -facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        },
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        }
    ];
    
    const decorations = [
        {
            width: facilitySize * 0.1,
            height: facilityHeight * 0.2,
            depth: facilitySize * 0.2,
            x: 0,
            y: facilityHeight + facilityHeight * 0.1,
            z: 0,
            color: 0x00CED1,
            opacity: 0.8
        },
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.2,
            depth: facilitySize * 0.1,
            x: 0,
            y: facilityHeight + facilityHeight * 0.1,
            z: 0,
            color: 0x00CED1,
            opacity: 0.8
        }
    ];
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        windows: windows,
        roof: { type: 'flat', color: 0x696969 },
        decorations: decorations
    });
}

// 本屋の建物を作成
function createBookstoreBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const windows = [
        {
            width: facilitySize * 0.3,
            height: facilityHeight * 0.5,
            x: -facilitySize * 0.25,
            y: facilityHeight * 0.25,
            z: facilitySize * 0.5
        },
        {
            width: facilitySize * 0.3,
            height: facilityHeight * 0.5,
            x: facilitySize * 0.25,
            y: facilityHeight * 0.25,
            z: facilitySize * 0.5
        }
    ];
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        windows: windows,
        roof: { type: 'cone', color: 0x8B4513 }
    });
}

// コンビニの建物を作成
function createConvenienceStoreBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const entrance = {
        width: facilitySize * 0.5,
        height: facilityHeight * 0.8,
        x: 0,
        y: facilityHeight * 0.4,
        z: facilitySize * 0.5,
        color: 0x87CEEB,
        opacity: 0.7
    };
    
    const sign = {
        width: facilitySize * 0.7,
        height: facilityHeight * 0.15,
        depth: 0.1,
        x: 0,
        y: facilityHeight + facilityHeight * 0.075,
        z: facilitySize * 0.4,
        color: 0xFF4500,
        opacity: 0.8
    };
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        roof: { type: 'flat', color: 0x696969 },
        entrance: entrance,
        sign: sign
    });
}

// パン屋の建物を作成
function createBakeryBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const windows = [
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: -facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        },
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        }
    ];
    
    const decorations = [
        {
            width: facilitySize * 0.15,
            height: facilitySize * 0.4,
            depth: facilitySize * 0.15,
            x: facilitySize * 0.2,
            y: facilityHeight + facilitySize * 0.2,
            z: 0,
            color: 0x696969,
            opacity: 0.6
        }
    ];
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        windows: windows,
        roof: { type: 'cone', color: 0x8B4513 },
        decorations: decorations
    });
}

// 花屋の建物を作成
function createFlowerShopBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const windows = [
        {
            width: facilitySize * 0.3,
            height: facilityHeight * 0.6,
            x: -facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        },
        {
            width: facilitySize * 0.3,
            height: facilityHeight * 0.6,
            x: facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        }
    ];
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        windows: windows,
        roof: { type: 'cone', color: 0x8B4513 }
    });
}

// 電気屋の建物を作成
function createElectronicsShopBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const entrance = {
        width: facilitySize * 0.4,
        height: facilityHeight * 0.7,
        x: 0,
        y: facilityHeight * 0.35,
        z: facilitySize * 0.5,
        color: 0x87CEEB,
        opacity: 0.7
    };
    
    const sign = {
        width: facilitySize * 0.6,
        height: facilityHeight * 0.15,
        depth: 0.1,
        x: 0,
        y: facilityHeight + facilityHeight * 0.075,
        z: facilitySize * 0.4,
        color: 0x1E90FF,
        opacity: 0.8
    };
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        roof: { type: 'flat', color: 0x696969 },
        entrance: entrance,
        sign: sign
    });
}

// 八百屋の建物を作成
function createGreengrocerBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const windows = [
        {
            width: facilitySize * 0.3,
            height: facilityHeight * 0.5,
            x: -facilitySize * 0.25,
            y: facilityHeight * 0.25,
            z: facilitySize * 0.5
        },
        {
            width: facilitySize * 0.3,
            height: facilityHeight * 0.5,
            x: facilitySize * 0.25,
            y: facilityHeight * 0.25,
            z: facilitySize * 0.5
        }
    ];
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        windows: windows,
        roof: { type: 'cone', color: 0x8B4513 }
    });
}

// 魚屋の建物を作成
function createFishShopBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const windows = [
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: -facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        },
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        }
    ];
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        windows: windows,
        roof: { type: 'cone', color: 0x8B4513 }
    });
}

// 肉屋の建物を作成
function createButcherShopBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const windows = [
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: -facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        },
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        }
    ];
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        windows: windows,
        roof: { type: 'cone', color: 0x8B4513 }
    });
}

// ケーキ屋の建物を作成
function createCakeShopBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const windows = [
        {
            width: facilitySize * 0.3,
            height: facilityHeight * 0.5,
            x: -facilitySize * 0.25,
            y: facilityHeight * 0.25,
            z: facilitySize * 0.5
        },
        {
            width: facilitySize * 0.3,
            height: facilityHeight * 0.5,
            x: facilitySize * 0.25,
            y: facilityHeight * 0.25,
            z: facilitySize * 0.5
        }
    ];
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        windows: windows,
        roof: { type: 'cone', color: 0x8B4513 }
    });
}

// 喫茶店の建物を作成
function createTeaHouseBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const windows = [
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: -facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        },
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        }
    ];
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        windows: windows,
        roof: { type: 'cone', color: 0x8B4513 }
    });
}

// ラーメン屋の建物を作成
function createRamenShopBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const windows = [
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: -facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        },
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        }
    ];
    
    const decorations = [
        {
            width: facilitySize * 0.15,
            height: facilitySize * 0.3,
            depth: facilitySize * 0.15,
            x: facilitySize * 0.2,
            y: facilityHeight + facilitySize * 0.15,
            z: 0,
            color: 0x696969,
            opacity: 0.6
        }
    ];
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        windows: windows,
        roof: { type: 'cone', color: 0x8B4513 },
        decorations: decorations
    });
}

// 寿司屋の建物を作成
function createSushiShopBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const windows = [
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: -facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        },
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        }
    ];
    
    const sign = {
        width: facilitySize * 0.5,
        height: facilityHeight * 0.15,
        depth: 0.1,
        x: 0,
        y: facilityHeight + facilityHeight * 0.075,
        z: facilitySize * 0.4,
        color: 0x00CED1,
        opacity: 0.8
    };
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        windows: windows,
        roof: { type: 'cone', color: 0x8B4513 },
        sign: sign
    });
}

// 居酒屋の建物を作成
function createIzakayaBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const windows = [
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: -facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        },
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        }
    ];
    
    const sign = {
        width: facilitySize * 0.5,
        height: facilityHeight * 0.15,
        depth: 0.1,
        x: 0,
        y: facilityHeight + facilityHeight * 0.075,
        z: facilitySize * 0.4,
        color: 0xFF4500,
        opacity: 0.8
    };
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        windows: windows,
        roof: { type: 'cone', color: 0x8B4513 },
        sign: sign
    });
}

// 銭湯の建物を作成
function createPublicBathBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const windows = [
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: -facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        },
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        }
    ];
    
    const sign = {
        width: facilitySize * 0.5,
        height: facilityHeight * 0.15,
        depth: 0.1,
        x: 0,
        y: facilityHeight + facilityHeight * 0.075,
        z: facilitySize * 0.4,
        color: 0x20B2AA,
        opacity: 0.8
    };
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        windows: windows,
        roof: { type: 'flat', color: 0x696969 },
        sign: sign
    });
}

// ゲームセンターの建物を作成
function createGameCenterBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const entrance = {
        width: facilitySize * 0.4,
        height: facilityHeight * 0.7,
        x: 0,
        y: facilityHeight * 0.35,
        z: facilitySize * 0.5,
        color: 0x87CEEB,
        opacity: 0.7
    };
    
    const sign = {
        width: facilitySize * 0.6,
        height: facilityHeight * 0.15,
        depth: 0.1,
        x: 0,
        y: facilityHeight + facilityHeight * 0.075,
        z: facilitySize * 0.4,
        color: 0xFF1493,
        opacity: 0.8
    };
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        roof: { type: 'flat', color: 0x696969 },
        entrance: entrance,
        sign: sign
    });
}

// 映画館の建物を作成
function createCinemaBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const entrance = {
        width: facilitySize * 0.5,
        height: facilityHeight * 0.8,
        x: 0,
        y: facilityHeight * 0.4,
        z: facilitySize * 0.5,
        color: 0x87CEEB,
        opacity: 0.7
    };
    
    const sign = {
        width: facilitySize * 0.7,
        height: facilityHeight * 0.2,
        depth: 0.1,
        x: 0,
        y: facilityHeight + facilityHeight * 0.1,
        z: facilitySize * 0.4,
        color: 0x4B0082,
        opacity: 0.8
    };
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        roof: { type: 'flat', color: 0x696969 },
        entrance: entrance,
        sign: sign
    });
}

// カラオケの建物を作成
function createKaraokeBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const entrance = {
        width: facilitySize * 0.4,
        height: facilityHeight * 0.7,
        x: 0,
        y: facilityHeight * 0.35,
        z: facilitySize * 0.5,
        color: 0x87CEEB,
        opacity: 0.7
    };
    
    const sign = {
        width: facilitySize * 0.6,
        height: facilityHeight * 0.15,
        depth: 0.1,
        x: 0,
        y: facilityHeight + facilityHeight * 0.075,
        z: facilitySize * 0.4,
        color: 0xFF69B4,
        opacity: 0.8
    };
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        roof: { type: 'flat', color: 0x696969 },
        entrance: entrance,
        sign: sign
    });
}

// ボーリング場の建物を作成
function createBowlingAlleyBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const entrance = {
        width: facilitySize * 0.4,
        height: facilityHeight * 0.7,
        x: 0,
        y: facilityHeight * 0.35,
        z: facilitySize * 0.5,
        color: 0x87CEEB,
        opacity: 0.7
    };
    
    const sign = {
        width: facilitySize * 0.6,
        height: facilityHeight * 0.15,
        depth: 0.1,
        x: 0,
        y: facilityHeight + facilityHeight * 0.075,
        z: facilitySize * 0.4,
        color: 0x1E90FF,
        opacity: 0.8
    };
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        roof: { type: 'flat', color: 0x696969 },
        entrance: entrance,
        sign: sign
    });
}

// 温泉の建物を作成
function createHotSpringBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const windows = [
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: -facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        },
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        }
    ];
    
    const sign = {
        width: facilitySize * 0.5,
        height: facilityHeight * 0.15,
        depth: 0.1,
        x: 0,
        y: facilityHeight + facilityHeight * 0.075,
        z: facilitySize * 0.4,
        color: 0x20B2AA,
        opacity: 0.8
    };
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        windows: windows,
        roof: { type: 'flat', color: 0x696969 },
        sign: sign
    });
}

// 神社の建物を作成
function createShrineBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const windows = [
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: -facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        },
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        }
    ];
    
    const decorations = [
        {
            width: facilitySize * 0.8,
            height: facilityHeight * 0.3,
            depth: 0.2,
            x: 0,
            y: facilityHeight + facilityHeight * 0.15,
            z: facilitySize * 0.3,
            color: 0x8B4513,
            opacity: 0.8
        }
    ];
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        windows: windows,
        roof: { type: 'cone', color: 0x8B4513 },
        decorations: decorations
    });
}

// 寺の建物を作成
function createTempleBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const windows = [
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: -facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        },
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.4,
            x: facilitySize * 0.25,
            y: facilityHeight * 0.3,
            z: facilitySize * 0.5
        }
    ];
    
    const decorations = [
        {
            width: facilitySize * 0.2,
            height: facilityHeight * 0.6,
            depth: facilitySize * 0.2,
            x: 0,
            y: facilityHeight + facilityHeight * 0.3,
            z: 0,
            color: 0x8B4513,
            opacity: 0.8
        },
        {
            width: facilitySize * 0.08,
            height: facilitySize * 0.1,
            depth: facilitySize * 0.08,
            x: 0,
            y: facilityHeight + facilityHeight * 0.6,
            z: 0,
            color: 0xFFD700,
            opacity: 0.8
        }
    ];
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        windows: windows,
        roof: { type: 'cone', color: 0x8B4513 },
        decorations: decorations
    });
}

// 消防署の建物を作成
function createFireStationBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const entrance = {
        width: facilitySize * 0.6,
        height: facilityHeight * 0.8,
        x: 0,
        y: facilityHeight * 0.4,
        z: facilitySize * 0.5,
        color: 0x87CEEB,
        opacity: 0.7
    };
    
    const sign = {
        width: facilitySize * 0.6,
        height: facilityHeight * 0.15,
        depth: 0.1,
        x: 0,
        y: facilityHeight + facilityHeight * 0.075,
        z: facilitySize * 0.4,
        color: 0xFF0000,
        opacity: 0.8
    };
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        roof: { type: 'flat', color: 0x696969 },
        entrance: entrance,
        sign: sign
    });
}

// 警察署の建物を作成
function createPoliceStationBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const entrance = {
        width: facilitySize * 0.4,
        height: facilityHeight * 0.7,
        x: 0,
        y: facilityHeight * 0.35,
        z: facilitySize * 0.5,
        color: 0x87CEEB,
        opacity: 0.7
    };
    
    const sign = {
        width: facilitySize * 0.6,
        height: facilityHeight * 0.15,
        depth: 0.1,
        x: 0,
        y: facilityHeight + facilityHeight * 0.075,
        z: facilitySize * 0.4,
        color: 0x0000FF,
        opacity: 0.8
    };
    
    const decorations = [
        {
            width: 0.3,
            height: facilityHeight,
            depth: 0.3,
            x: -facilitySize * 0.3,
            y: facilityHeight/2,
            z: facilitySize * 0.5,
            color: 0x8B4513,
            opacity: 0.8
        },
        {
            width: 0.3,
            height: facilityHeight,
            depth: 0.3,
            x: 0,
            y: facilityHeight/2,
            z: facilitySize * 0.5,
            color: 0x8B4513,
            opacity: 0.8
        },
        {
            width: 0.3,
            height: facilityHeight,
            depth: 0.3,
            x: facilitySize * 0.3,
            y: facilityHeight/2,
            z: facilitySize * 0.5,
            color: 0x8B4513,
            opacity: 0.8
        }
    ];
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        roof: { type: 'flat', color: 0x696969 },
        entrance: entrance,
        sign: sign,
        decorations: decorations
    });
}

// 市役所の建物を作成
function createCityHallBuilding(locationGroup, facilitySize, facilityHeight, color, scale) {
    const entrance = {
        width: facilitySize * 0.5,
        height: facilityHeight * 0.8,
        x: 0,
        y: facilityHeight * 0.4,
        z: facilitySize * 0.5,
        color: 0x87CEEB,
        opacity: 0.7
    };
    
    const sign = {
        width: facilitySize * 0.7,
        height: facilityHeight * 0.2,
        depth: 0.1,
        x: 0,
        y: facilityHeight + facilityHeight * 0.1,
        z: facilitySize * 0.4,
        color: 0x808080,
        opacity: 0.8
    };
    
    const decorations = [
        {
            width: 0.3,
            height: facilityHeight,
            depth: 0.3,
            x: -facilitySize * 0.375,
            y: facilityHeight/2,
            z: facilitySize * 0.5,
            color: 0x8B4513,
            opacity: 0.8
        },
        {
            width: 0.3,
            height: facilityHeight,
            depth: 0.3,
            x: -facilitySize * 0.125,
            y: facilityHeight/2,
            z: facilitySize * 0.5,
            color: 0x8B4513,
            opacity: 0.8
        },
        {
            width: 0.3,
            height: facilityHeight,
            depth: 0.3,
            x: facilitySize * 0.125,
            y: facilityHeight/2,
            z: facilitySize * 0.5,
            color: 0x8B4513,
            opacity: 0.8
        },
        {
            width: 0.3,
            height: facilityHeight,
            depth: 0.3,
            x: facilitySize * 0.375,
            y: facilityHeight/2,
            z: facilitySize * 0.5,
            color: 0x8B4513,
            opacity: 0.8
        }
    ];
    
    createTransparentBuilding(locationGroup, facilitySize, facilityHeight, color, scale, {
        roof: { type: 'flat', color: 0x696969 },
        entrance: entrance,
        sign: sign,
        decorations: decorations
    });
}

