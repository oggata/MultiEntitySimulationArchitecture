// 場所の作成
function createLocations() {
    locationData.forEach(loc => {
        const locationGroup = new THREE.Group();
        

if(loc.name == "公園"){

}else if(loc.name == "町の広場"){

}else{

        // 建物の基本構造
        const buildingGeometry = new THREE.BoxGeometry(4, 4, 4);
        const buildingMaterial = new THREE.MeshLambertMaterial({ 
            color: loc.color,
            emissive: loc.color,
            emissiveIntensity: 0.1,
            transparent: true,
            opacity: 0.3
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.set(0, 2, 0);
        building.castShadow = true;
        building.receiveShadow = true;
        locationGroup.add(building);


}

        // 場所特有の装飾
        switch(loc.name) {
            case "カフェ":
                // テーブルと椅子
                for(let i = 0; i < 4; i++) {
                    const tableGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 8);
                    const tableMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                    const table = new THREE.Mesh(tableGeometry, tableMaterial);
                    table.position.set(
                        Math.cos(i * Math.PI/2) * 1.2,
                        0.05,
                        Math.sin(i * Math.PI/2) * 1.2
                    );
                    locationGroup.add(table);

                    // 椅子
                    const chairGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
                    const chairMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                    const chair = new THREE.Mesh(chairGeometry, chairMaterial);
                    chair.position.set(
                        Math.cos(i * Math.PI/2) * 1,
                        0.2,
                        Math.sin(i * Math.PI/2) * 1
                    );
                    locationGroup.add(chair);
                }
                break;

            case "公園":
                // 木
                for(let i = 0; i < 3; i++) {
                    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8);
                    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
                    trunk.position.set(
                        Math.cos(i * Math.PI/1.5) * 2,
                        0.75,
                        Math.sin(i * Math.PI/1.5) * 2
                    );
                    locationGroup.add(trunk);

                    const leavesGeometry = new THREE.SphereGeometry(1, 8, 8);
                    const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
                    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
                    leaves.position.set(
                        Math.cos(i * Math.PI/1.5) * 2,
                        2,
                        Math.sin(i * Math.PI/1.5) * 2
                    );
                    locationGroup.add(leaves);
                }

                // ベンチ
                const benchGeometry = new THREE.BoxGeometry(2, 0.2, 0.5);
                const benchMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                const bench = new THREE.Mesh(benchGeometry, benchMaterial);
                bench.position.set(0, 0.1, 2);
                locationGroup.add(bench);
                break;

            case "図書館":
                // 本棚
                for(let i = 0; i < 2; i++) {
                    const bookshelfGeometry = new THREE.BoxGeometry(0.3, 3, 2);
                    const bookshelfMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                    const bookshelf = new THREE.Mesh(bookshelfGeometry, bookshelfMaterial);
                    bookshelf.position.set(
                        i === 0 ? -2 : 2,
                        1.5,
                        0
                    );
                    locationGroup.add(bookshelf);
                }
                break;

            case "スポーツジム":
                // トレーニングマシン
                const machineGeometry = new THREE.BoxGeometry(1, 1, 2);
                const machineMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
                const machine = new THREE.Mesh(machineGeometry, machineMaterial);
                machine.position.set(0, 0.5, 0);
                locationGroup.add(machine);

                // ウェイト
                const weightGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 8);
                const weightMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
                for(let i = 0; i < 4; i++) {
                    const weight = new THREE.Mesh(weightGeometry, weightMaterial);
                    weight.position.set(
                        Math.cos(i * Math.PI/2) * 1.5,
                        0.2,
                        Math.sin(i * Math.PI/2) * 1.5
                    );
                    locationGroup.add(weight);
                }
                break;

            case "町の広場":
                // 噴水
                const fountainBaseGeometry = new THREE.CylinderGeometry(1, 1.2, 0.3, 16);
                const fountainBaseMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
                const fountainBase = new THREE.Mesh(fountainBaseGeometry, fountainBaseMaterial);
                fountainBase.position.set(0, 0.15, 0);
                locationGroup.add(fountainBase);

                const fountainCenterGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 8);
                const fountainCenterMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
                const fountainCenter = new THREE.Mesh(fountainCenterGeometry, fountainCenterMaterial);
                fountainCenter.position.set(0, 0.8, 0);
                locationGroup.add(fountainCenter);

                // ベンチ
                for(let i = 0; i < 4; i++) {
                    const benchGeometry = new THREE.BoxGeometry(2, 0.2, 0.5);
                    const benchMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                    const bench = new THREE.Mesh(benchGeometry, benchMaterial);
                    bench.position.set(
                        Math.cos(i * Math.PI/2) * 3,
                        0.1,
                        Math.sin(i * Math.PI/2) * 3
                    );
                    bench.rotation.y = i * Math.PI/2;
                    locationGroup.add(bench);
                }
                break;

            case "学校":
                // 校舎の装飾
                const schoolFlagGeometry = new THREE.BoxGeometry(0.1, 2, 0.1);
                const schoolFlagMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
                const schoolFlag = new THREE.Mesh(schoolFlagGeometry, schoolFlagMaterial);
                schoolFlag.position.set(2, 3, 2);
                locationGroup.add(schoolFlag);

                // 校庭の装飾
                const playgroundGeometry = new THREE.CircleGeometry(2, 32);
                const playgroundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
                const playground = new THREE.Mesh(playgroundGeometry, playgroundMaterial);
                playground.rotation.x = -Math.PI / 2;
                playground.position.set(0, 0.01, 0);
                locationGroup.add(playground);
                break;

            case "病院":
                // 救急車の駐車スペース
                const ambulanceSpaceGeometry = new THREE.BoxGeometry(2, 0.1, 1);
                const ambulanceSpaceMaterial = new THREE.MeshLambertMaterial({ color: 0xFF0000 });
                const ambulanceSpace = new THREE.Mesh(ambulanceSpaceGeometry, ambulanceSpaceMaterial);
                ambulanceSpace.position.set(2, 0.05, 0);
                locationGroup.add(ambulanceSpace);

                // ヘリポート
                const helipadGeometry = new THREE.CircleGeometry(1, 32);
                const helipadMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
                const helipad = new THREE.Mesh(helipadGeometry, helipadMaterial);
                helipad.rotation.x = -Math.PI / 2;
                helipad.position.set(0, 4.1, 0);
                locationGroup.add(helipad);
                break;

            case "スーパーマーケット":
                // ショッピングカート
                for(let i = 0; i < 3; i++) {
                    const cartGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.8);
                    const cartMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
                    const cart = new THREE.Mesh(cartGeometry, cartMaterial);
                    cart.position.set(
                        Math.cos(i * Math.PI/1.5) * 2,
                        0.25,
                        Math.sin(i * Math.PI/1.5) * 2
                    );
                    locationGroup.add(cart);
                }

                // 駐車場
                const parkingGeometry = new THREE.BoxGeometry(4, 0.1, 2);
                const parkingMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
                const parking = new THREE.Mesh(parkingGeometry, parkingMaterial);
                parking.position.set(0, 0.05, 3);
                locationGroup.add(parking);
                break;

            case "ファミレス":
                // テーブルと椅子
                for(let i = 0; i < 6; i++) {
                    const tableGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 8);
                    const tableMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                    const table = new THREE.Mesh(tableGeometry, tableMaterial);
                    table.position.set(
                        Math.cos(i * Math.PI/3) * 1.2,
                        0.05,
                        Math.sin(i * Math.PI/3) * 1.2
                    );
                    locationGroup.add(table);

                    // 椅子
                    const chairGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
                    const chairMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                    const chair = new THREE.Mesh(chairGeometry, chairMaterial);
                    chair.position.set(
                        Math.cos(i * Math.PI/3) * 1.5,
                        0.25,
                        Math.sin(i * Math.PI/3) *1.5
                    );
                    locationGroup.add(chair);
                }

                // カウンター
                const counterGeometry = new THREE.BoxGeometry(3, 0.8, 0.5);
                const counterMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                const counter = new THREE.Mesh(counterGeometry, counterMaterial);
                counter.position.set(0, 0.4, -2);
                locationGroup.add(counter);
                break;
        }

        // 看板
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        context.fillStyle = 'white';
        context.fillRect(0, 0, 256, 64);
        context.fillStyle = 'black';
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.fillText(loc.name, 128, 40);
        
        const texture = new THREE.CanvasTexture(canvas);
        const signMaterial = new THREE.MeshBasicMaterial({ map: texture });
        const signGeometry = new THREE.PlaneGeometry(3, 0.75);
        const signMesh = new THREE.Mesh(signGeometry, signMaterial);
        signMesh.position.set(0, 4.5, 3.1);
        locationGroup.add(signMesh);

        // 場所の位置を設定
        locationGroup.position.set(loc.x, 0, loc.z);
        scene.add(locationGroup);
        
        locations.push({
            name: loc.name,
            position: new THREE.Vector3(loc.x, 0, loc.z),
            mesh: locationGroup,
            activities: loc.activities,
            atmosphere: loc.atmosphere
        });
    });

    // エージェントの自宅を作成
    agentPersonalities.forEach(agent => {
        const homeGroup = new THREE.Group();
        
        // 家の基本構造
        const houseGeometry = new THREE.BoxGeometry(2, 2, 2);
        const houseMaterial = new THREE.MeshLambertMaterial({ 
            color: agent.home.color,
            emissive: agent.home.color,
            emissiveIntensity: 0.1,
            transparent: true,
            opacity: 0.3
        });
        const house = new THREE.Mesh(houseGeometry, houseMaterial);
        house.position.set(0, 1, 0);
        house.castShadow = true;
        house.receiveShadow = true;
        homeGroup.add(house);

        // 屋根
        const roofGeometry = new THREE.ConeGeometry(2, 2, 4);
        const roofMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B4513,
            emissive: 0x8B4513,
            emissiveIntensity: 0.1,
            transparent: true,
            opacity: 0.3
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(0, 3, 0);
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        homeGroup.add(roof);

        // 看板
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        context.fillStyle = 'white';
        context.fillRect(0, 0, 256, 64);
        context.fillStyle = 'black';
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.fillText(agent.home.name, 128, 40);
        
        const texture = new THREE.CanvasTexture(canvas);
        const signMaterial = new THREE.MeshBasicMaterial({ map: texture });
        const signGeometry = new THREE.PlaneGeometry(2, 0.5);
        const signMesh = new THREE.Mesh(signGeometry, signMaterial);
        signMesh.position.set(0, 3.5, 2.1);
        homeGroup.add(signMesh);

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



// エージェントの自宅を作成する関数
function createAgentHome(homeData) {
    const homeGroup = new THREE.Group();
    
    // 家の基本構造
    const houseGeometry = new THREE.BoxGeometry(4, 3, 4);
    const houseMaterial = new THREE.MeshLambertMaterial({ 
        color: parseInt(homeData.color),
        emissive: parseInt(homeData.color),
        emissiveIntensity: 0.1,
        transparent: true,
        opacity: 0.3
    });
    const house = new THREE.Mesh(houseGeometry, houseMaterial);
    house.position.set(0, 1.5, 0);
    house.castShadow = true;
    house.receiveShadow = true;
    homeGroup.add(house);

    // 屋根
    const roofGeometry = new THREE.ConeGeometry(3, 2, 4);
    const roofMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x8B4513,
        emissive: 0x8B4513,
        emissiveIntensity: 0.1,
        transparent: true,
        opacity: 0.3
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, 4, 0);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    homeGroup.add(roof);

    // 看板
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.fillStyle = 'white';
    context.fillRect(0, 0, 256, 64);
    context.fillStyle = 'black';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.fillText(homeData.name, 128, 40);
    
    const texture = new THREE.CanvasTexture(canvas);
    const signMaterial = new THREE.MeshBasicMaterial({ map: texture });
    const signGeometry = new THREE.PlaneGeometry(2, 0.5);
    const signMesh = new THREE.Mesh(signGeometry, signMaterial);
    signMesh.position.set(0, 3.5, 2.1);
    homeGroup.add(signMesh);

    // 家の位置を設定
    homeGroup.position.set(homeData.x, 0, homeData.z);
    scene.add(homeGroup);
    
    locations.push({
        name: homeData.name,
        position: new THREE.Vector3(homeData.x, 0, homeData.z),
        mesh: homeGroup,
        activities: ["休憩する", "眠る", "読書する"],
        atmosphere: "静かで落ち着いた雰囲気の家",
        isHome: true,
        owner: homeData.name
    });
}

