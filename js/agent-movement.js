// 移動・経路探索機能

// 場所に対応する建物オブジェクトを探す
function findBuildingForLocation(location) {
    // 建物リストから対応する建物を探す
    for (const building of cityLayout.buildings) {
        const distance = Math.sqrt(
            Math.pow(location.position.x - building.x, 2) + 
            Math.pow(location.position.z - building.z, 2)
        );
        // 建物のサイズの半分以内なら同じ建物とみなす
        if (distance <= building.size / 2) {
            return building;
        }
    }
    
    // 施設リストからも探す
    for (const facility of cityLayout.facilities) {
        const distance = Math.sqrt(
            Math.pow(location.position.x - facility.x, 2) + 
            Math.pow(location.position.z - facility.z, 2)
        );
        // 施設のサイズの半分以内なら同じ施設とみなす
        if (distance <= facility.size / 2) {
            return facility;
        }
    }
    
    return null;
}

// 街中での偶然の出会いをチェック
function checkForStreetEncounter(agent) {
    // 移動中の他のエージェントを検索
    const nearbyMovingAgents = agents.filter(otherAgent => 
        otherAgent !== agent && 
        otherAgent.movementTarget && // 移動中
        !otherAgent.isInConversation && // 会話中でない
        agent.mesh.position.distanceTo(otherAgent.mesh.position) < 3 // 3メートル以内
    );
    
    if (nearbyMovingAgents.length > 0) {
        // 最も近いエージェントを選択
        const closestAgent = nearbyMovingAgents.reduce((closest, current) => {
            const closestDistance = agent.mesh.position.distanceTo(closest.mesh.position);
            const currentDistance = agent.mesh.position.distanceTo(current.mesh.position);
            return currentDistance < closestDistance ? current : closest;
        });
        
        // 相互作用の確率を計算
        const interactionProbability = calculateStreetEncounterProbability(agent, closestAgent);
        
        if (Math.random() < interactionProbability) {
            startStreetConversation(agent, closestAgent);
        }
    }
}

// 街中での出会い確率を計算
function calculateStreetEncounterProbability(agent, otherAgent) {
    let probability = 0.1; // 基本確率10%
    
    // 社交性による調整
    probability += agent.personality.traits.sociability * 0.2;
    probability += otherAgent.personality.traits.sociability * 0.2;
    
    // 関係性による調整
    const relationship = agent.relationships.get(otherAgent.name);
    if (relationship) {
        probability += relationship.affinity * 0.3;
        probability += relationship.familiarity * 0.2;
    }
    
    // 時間帯による調整
    const timeOfDay = agent.getTimeOfDay();
    if (timeOfDay === "morning" || timeOfDay === "afternoon") {
        probability *= 1.2; // 昼間は出会いやすい
    } else if (timeOfDay === "night") {
        probability *= 0.5; // 夜間は出会いにくい
    }
    
    // 気分による調整
    if (agent.mood === "良い" || agent.mood === "楽しい") {
        probability *= 1.3;
    }
    if (otherAgent.mood === "良い" || otherAgent.mood === "楽しい") {
        probability *= 1.3;
    }
    
    // 社交欲求による調整
    probability += agent.socialUrge * 0.2;
    probability += otherAgent.socialUrge * 0.2;
    
    return Math.min(0.8, probability); // 最大80%に制限
}

// 街中での会話を開始
function startStreetConversation(agent, otherAgent) {
    // 両方のエージェントを会話状態にする
    agent.isInConversation = true;
    agent.conversationPartner = otherAgent;
    otherAgent.isInConversation = true;
    otherAgent.conversationPartner = agent;
    
    // 移動を一時停止
    agent.pauseMovement();
    otherAgent.pauseMovement();
    
    // お互いに向き合う
    agent.faceAgent(otherAgent);
    otherAgent.faceAgent(agent);
    
    // 会話を開始
    performStreetInteraction(agent, otherAgent);
    
    addLog(`🚶 ${agent.name}と${otherAgent.name}が街中で偶然出会いました！`, 'encounter');
}

// 移動を一時停止
function pauseMovement(agent) {
    agent.pausedMovementTarget = agent.movementTarget;
    agent.pausedTargetLocation = agent.targetLocation;
    agent.pausedCurrentPath = agent.currentPath;
    agent.pausedCurrentPathIndex = agent.currentPathIndex;
    
    agent.movementTarget = null;
    agent.targetLocation = null;
    agent.currentPath = null;
    agent.currentPathIndex = 0;
}

// 移動を再開
function resumeMovement(agent) {
    if (agent.pausedMovementTarget) {
        agent.movementTarget = agent.pausedMovementTarget;
        agent.targetLocation = agent.pausedTargetLocation;
        agent.currentPath = agent.pausedCurrentPath;
        agent.currentPathIndex = agent.pausedCurrentPathIndex;
        
        agent.pausedMovementTarget = null;
        agent.pausedTargetLocation = null;
        agent.pausedCurrentPath = null;
        agent.pausedCurrentPathIndex = 0;
    }
}

// 他のエージェントに向き合う
function faceAgent(agent, otherAgent) {
    const direction = new THREE.Vector3()
        .subVectors(otherAgent.mesh.position, agent.mesh.position)
        .normalize();
    agent.mesh.rotation.y = Math.atan2(direction.x, direction.z);
}

// 街中での会話を終了
function endStreetConversation(agent) {
    agent.isInConversation = false;
    agent.conversationPartner = null;
    
    // 移動を再開
    resumeMovement(agent);
    
    // 相互作用のクールダウンを設定
    agent.lastInteractionTime = Date.now();
    agent.interactionCooldown = 30000 + Math.random() * 60000; // 30秒〜90秒
    
    addLog(`🚶 ${agent.name}が移動を再開しました`, 'move');
}

// 待機スポットを選択
function selectWaitingSpot(agent) {
    // 自宅の場合は待機スポットは不要
    if (agent.currentLocation.isHome) {
        return;
    }
    
    // 施設に待機スポットがある場合
    if (agent.currentLocation.waitingSpots && agent.currentLocation.waitingSpots.length > 0) {
        // 利用可能なスポットを探す
        let availableSpot = null;
        
        for (const spot of agent.currentLocation.waitingSpots) {
            if (!agent.currentLocation.occupiedSpots.has(spot)) {
                availableSpot = spot;
                break;
            }
        }
        
        if (availableSpot) {
            // スポットを占有
            agent.currentLocation.occupiedSpots.add(availableSpot);
            agent.assignedWaitingSpot = availableSpot;
            
            // エージェントを待機スポットの位置に移動
            const worldPosition = new THREE.Vector3();
            worldPosition.copy(availableSpot.position);
            worldPosition.add(agent.currentLocation.position);
            
            agent.mesh.position.copy(worldPosition);
            
            addLog(`🪑 ${agent.name}が${agent.currentLocation.name}の${availableSpot.type}に座りました (${agent.currentLocation.occupiedSpots.size}/${agent.currentLocation.waitingSpots.length})`, 'system');
        } else {
            // 全てのスポットが埋まっている場合、待機列を形成
            createWaitingQueue(agent);
        }
    } else {
        // 待機スポットがない場合は施設の中心付近に配置
        const offsetX = (Math.random() - 0.5) * 2;
        const offsetZ = (Math.random() - 0.5) * 2;
        
        agent.mesh.position.set(
            agent.currentLocation.position.x + offsetX,
            0,
            agent.currentLocation.position.z + offsetZ
        );
    }
}

// 待機列を形成
function createWaitingQueue(agent) {
    // 施設の入り口付近に待機列を形成
    const queueOffset = 3; // 施設から3単位離れた位置
    const queueSpacing = 1.5; // エージェント間の間隔
    
    // 現在の待機列の人数を計算
    const waitingAgents = agents.filter(otherAgent => 
        otherAgent.currentLocation === agent.currentLocation && 
        otherAgent.assignedWaitingSpot === null &&
        otherAgent.isInWaitingQueue
    );
    
    const queueIndex = waitingAgents.length;
    
    // 待機列の位置を計算（施設の入り口方向）
    const entranceDirection = new THREE.Vector3(1, 0, 0); // 仮の入り口方向
    const queuePosition = new THREE.Vector3();
    queuePosition.copy(agent.currentLocation.position);
    queuePosition.add(entranceDirection.multiplyScalar(queueOffset + queueIndex * queueSpacing));
    
    agent.mesh.position.copy(queuePosition);
    agent.isInWaitingQueue = true;
    agent.queueIndex = queueIndex;
    
    addLog(`⏳ ${agent.name}が${agent.currentLocation.name}の待機列に並びました（${queueIndex + 1}番目）`, 'system');
}

// 待機列の順序を更新
function updateWaitingQueue(agent) {
    if (!agent.isInWaitingQueue || !agent.currentLocation) {
        return;
    }
    
    // 同じ施設の待機列にいるエージェントを取得
    const waitingAgents = agents.filter(otherAgent => 
        otherAgent.currentLocation === agent.currentLocation && 
        otherAgent.isInWaitingQueue
    ).sort((a, b) => (a.queueIndex || 0) - (b.queueIndex || 0));
    
    // 待機列の順序を再計算
    waitingAgents.forEach((otherAgent, index) => {
        otherAgent.queueIndex = index;
        
        // 待機列の位置を更新
        const queueOffset = 3;
        const queueSpacing = 1.5;
        const entranceDirection = new THREE.Vector3(1, 0, 0);
        const queuePosition = new THREE.Vector3();
        queuePosition.copy(agent.currentLocation.position);
        queuePosition.add(entranceDirection.multiplyScalar(queueOffset + index * queueSpacing));
        
        otherAgent.mesh.position.copy(queuePosition);
    });
    
    // 待機列の先頭のエージェントが利用可能なスポットに移動できるかチェック
    if (waitingAgents.length > 0) {
        const firstInQueue = waitingAgents[0];
        const availableSpot = findAvailableSpot(agent);
        
        if (availableSpot) {
            // 先頭のエージェントを待機スポットに移動
            moveToWaitingSpot(firstInQueue, availableSpot);
        }
    }
}

// 利用可能なスポットを探す
function findAvailableSpot(agent) {
    if (!agent.currentLocation.waitingSpots) {
        return null;
    }
    
    for (const spot of agent.currentLocation.waitingSpots) {
        if (!agent.currentLocation.occupiedSpots.has(spot)) {
            return spot;
        }
    }
    
    return null;
}

// 待機スポットに移動
function moveToWaitingSpot(agent, spot) {
    // 待機列から離脱
    agent.isInWaitingQueue = false;
    agent.queueIndex = null;
    
    // スポットを占有
    agent.currentLocation.occupiedSpots.add(spot);
    agent.assignedWaitingSpot = spot;
    
    // エージェントを待機スポットの位置に移動
    const worldPosition = new THREE.Vector3();
    worldPosition.copy(spot.position);
    worldPosition.add(agent.currentLocation.position);
    
    agent.mesh.position.copy(worldPosition);
    
    addLog(`🪑 ${agent.name}が${agent.currentLocation.name}の${spot.type}に移動しました`, 'system');
    
    // 待機列の順序を更新
    updateWaitingQueue(agent);
}

// 待機スポットを解放
function releaseWaitingSpot(agent) {
    if (agent.assignedWaitingSpot) {
        agent.currentLocation.occupiedSpots.delete(agent.assignedWaitingSpot);
        agent.assignedWaitingSpot = null;
    }
    
    if (agent.isInWaitingQueue) {
        agent.isInWaitingQueue = false;
        agent.queueIndex = null;
    }
} 