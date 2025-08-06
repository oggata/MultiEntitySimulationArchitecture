
// ログシステム
function addLog(message, type = 'info', details = null) {
    const logPanel = document.getElementById('activity-log');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    
    const time = new Date();
    const timeString = time.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    
    let logContent = `<strong>${timeString}</strong> ${message}`;
    
    // 詳細情報がある場合は折りたたみ可能なセクションとして表示
    if (details) {
        const detailsId = `details-${Date.now()}`;
        logContent += `
            <div class="log-details-toggle" onclick="toggleDetails('${detailsId}')">
                <span class="toggle-icon">▼</span> 詳細を見る
            </div>
            <div id="${detailsId}" class="log-details" style="display: none;">
                ${details}
            </div>
        `;
    }
    
    logEntry.innerHTML = logContent;
    logPanel.insertBefore(logEntry, logPanel.firstChild);
    
    // 最大50件のログを保持
    while (logPanel.children.length > 50) {
        logPanel.removeChild(logPanel.lastChild);
    }
}

// ログの詳細表示切り替え
function toggleDetails(detailsId) {
    const details = document.getElementById(detailsId);
    const toggle = details.previousElementSibling;
    const icon = toggle.querySelector('.toggle-icon');
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
        icon.textContent = '▲';
        toggle.querySelector('span:not(.toggle-icon)').textContent = ' 詳細を隠す';
    } else {
        details.style.display = 'none';
        icon.textContent = '▼';
        toggle.querySelector('span:not(.toggle-icon)').textContent = ' 詳細を見る';
    }
}

// エージェントの行動ログを記録
function logAgentAction(agent, action, details = null) {
    const actionTypes = {
        'move': '🚶 移動',
        'interact': '💬 会話',
        'activity': '🎯 活動',
        'think': '💭 思考'
    };

    const actionType = actionTypes[action] || action;
    const message = `<span class="agent-name">${agent.name}</span>: ${actionType}`;
    
    if (!details) {
        details = `
            <div class="log-detail-section">
                <h4>現在の状態</h4>
                <p>場所: ${agent.currentLocation.name}</p>
                <p>体力: ${Math.round(agent.energy * 100)}%</p>
                <p>気分: ${agent.calculateMood()}</p>
            </div>
        `;
    }
    
    addLog(message, action, details);
}

// エージェントの関係性ログを記録
function logRelationshipChange(agent1, agent2, changeType, details = null) {
    const relationship = agent1.relationships.get(agent2.name);
    const message = `
        <span class="agent-name">${agent1.name}</span> と 
        <span class="agent-name">${agent2.name}</span> の関係性が変化
    `;
    
    if (!details) {
        details = `
            <div class="log-detail-section">
                <h4>関係性の詳細</h4>
                <p>親密度: ${Math.round(relationship.familiarity * 100)}%</p>
                <p>好感度: ${Math.round(relationship.affinity * 100)}%</p>
                <p>交流回数: ${relationship.interactionCount}回</p>
                <p>最後の交流: ${relationship.lastInteraction ? relationship.lastInteraction.toLocaleString() : 'なし'}</p>
            </div>
        `;
    }
    
    addLog(message, 'relationship', details);
}