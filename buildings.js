// 場所の作成
function createLocations() {
    // 動的に生成された施設データを使用
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
            // 建物の基本構造
            const buildingGeometry = new THREE.BoxGeometry(facilitySize, facilityHeight, facilitySize);
            const buildingEdges = new THREE.EdgesGeometry(buildingGeometry);
            const buildingMaterial = new THREE.LineBasicMaterial({ color: loc.color });
            const building = new THREE.LineSegments(buildingEdges, buildingMaterial);
            building.position.set(0, facilityHeight/2, 0);
            locationGroup.add(building);
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

    // エージェントの自宅を作成
    agentPersonalities.forEach(agent => {
        const homeGroup = new THREE.Group();
        
        // 自宅のサイズ（小サイズ）
        const homeSize = cityLayout.buildingSizes.small;
        const homeHeight = homeSize * 0.8;
        
        // 家の基本構造
        const houseGeometry = new THREE.BoxGeometry(homeSize, homeHeight, homeSize);
        const houseEdges = new THREE.EdgesGeometry(houseGeometry);
        const house = new THREE.LineSegments(houseEdges, new THREE.LineBasicMaterial({ color: 0xff00ff }));
        house.position.set(0, homeHeight/2, 0);
        homeGroup.add(house);

        // 屋根
        const roofGeometry = new THREE.ConeGeometry(homeSize * 0.75, homeSize * 0.5, 4);
        const roofEdges = new THREE.EdgesGeometry(roofGeometry);
        const roof = new THREE.LineSegments(roofEdges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
        roof.position.set(0, homeHeight + homeSize * 0.25, 0);
        roof.rotation.y = Math.PI / 4;
        homeGroup.add(roof);

        // 看板（自宅）
        const canvas2 = document.createElement('canvas');
        canvas2.width = 256;
        canvas2.height = 64;
        const context2 = canvas2.getContext('2d');
        context2.clearRect(0, 0, 256, 64);
        context2.shadowColor = '#00ffff';
        context2.shadowBlur = 16;
        context2.font = 'bold 24px sans-serif';
        context2.textAlign = 'center';
        context2.textBaseline = 'middle';
        context2.fillStyle = '#00ffff';
        context2.fillText(agent.home.name, 128, 32);
        const texture2 = new THREE.CanvasTexture(canvas2);
        const signGeometry2 = new THREE.PlaneGeometry(2, 0.5);
        const signMaterial2 = new THREE.MeshBasicMaterial({ map: texture2, transparent: true, opacity: 0.7 });
        const signMesh2 = new THREE.Mesh(signGeometry2, signMaterial2);
        signMesh2.position.set(0, homeHeight + 0.5, homeSize * 0.6);
        homeGroup.add(signMesh2);
        const signEdges2 = new THREE.EdgesGeometry(signGeometry2);
        const signLine2 = new THREE.LineSegments(signEdges2, new THREE.LineBasicMaterial({ color: 0x00ffff }));
        signLine2.position.copy(signMesh2.position);
        homeGroup.add(signLine2);

        // 家の位置を設定
        homeGroup.position.set(agent.home.x, 0, agent.home.z);
        scene.add(homeGroup);
        
        locations.push({
            name: agent.home.name,
            position: new THREE.Vector3(agent.home.x, 0, agent.home.z),
            mesh: homeGroup,
            activities: ["休憩する", "眠る", "読書する"],
            atmosphere: "静かで落ち着いた雰囲気の家",
            isHome: true,
            owner: agent.name
        });
    });
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
        '公園': cityLayout.buildingSizes.large,
        '学校': cityLayout.buildingSizes.large,
        'スーパーマーケット': cityLayout.buildingSizes.large,
        '病院': cityLayout.buildingSizes.large,
        'スポーツジム': cityLayout.buildingSizes.large,
        '図書館': cityLayout.buildingSizes.large,
        '町の広場': cityLayout.buildingSizes.large,
        
        // 中サイズの施設
        'カフェ': cityLayout.buildingSizes.medium,
        'ファミレス': cityLayout.buildingSizes.medium,
        'ショップ': cityLayout.buildingSizes.medium,
        'オフィス': cityLayout.buildingSizes.medium,
        '銀行': cityLayout.buildingSizes.medium,
        '郵便局': cityLayout.buildingSizes.medium
    };
    
    return sizeMap[facilityName] || cityLayout.buildingSizes.medium;
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

