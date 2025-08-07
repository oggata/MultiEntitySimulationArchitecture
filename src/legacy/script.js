// エージェント情報の表示
function updateAgentInfo() {
    const agentList = document.getElementById('agentList');
    agentList.innerHTML = '';

    agentPersonalities.forEach(agent => {
        const agentItem = document.createElement('div');
        agentItem.className = 'agent-item';
        
        // エージェントの基本情報
        const agentInfo = document.createElement('div');
        agentInfo.className = 'agent-info';
        
        const nameRow = document.createElement('div');
        nameRow.className = 'agent-name-row';
        
        const agentName = document.createElement('span');
        agentName.className = 'agent-name';
        agentName.textContent = agent.name;
        
        const cameraButton = document.createElement('button');
        cameraButton.className = 'camera-button';
        cameraButton.innerHTML = '📷';
        cameraButton.title = 'カメラをフォーカス';
        cameraButton.onclick = () => focusCameraOnAgent(agent);
        
        nameRow.appendChild(agentName);
        nameRow.appendChild(cameraButton);
        
        const location = document.createElement('div');
        location.className = 'agent-location';
        location.textContent = `場所：${agent.currentLocation || '移動中'}`;
        
        const health = document.createElement('div');
        health.className = 'agent-health';
        health.textContent = `体力：${agent.health || 100}%`;
        
        const mood = document.createElement('div');
        mood.className = 'agent-mood';
        mood.textContent = `気分：${agent.mood || '普通'}`;
        
        agentInfo.appendChild(nameRow);
        agentInfo.appendChild(location);
        agentInfo.appendChild(health);
        agentInfo.appendChild(mood);
        
        agentItem.appendChild(agentInfo);
        agentList.appendChild(agentItem);
    });
}

// カメラをエージェントにフォーカス
function focusCameraOnAgent(agent) {
    const targetPosition = new THREE.Vector3(agent.home.x, 0, agent.home.z);
    const cameraPosition = new THREE.Vector3(
        targetPosition.x + 10,
        10,
        targetPosition.z + 10
    );
    
    // カメラの移動をアニメーション
    gsap.to(camera.position, {
        x: cameraPosition.x,
        y: cameraPosition.y,
        z: cameraPosition.z,
        duration: 1,
        ease: "power2.inOut"
    });
    
    // カメラの向きを調整
    camera.lookAt(targetPosition);
}

// カメラをリセット（全体表示）
function resetCamera() {
    gsap.to(camera.position, {
        x: 0,
        y: 30,
        z: 30,
        duration: 1,
        ease: "power2.inOut"
    });
    
    camera.lookAt(0, 0, 0);
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', () => {
    updateAgentInfo();
    
    // カメラリセットボタンのイベントリスナー
    document.getElementById('resetCamera').addEventListener('click', resetCamera);
}); 