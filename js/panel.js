// パネルのドラッグ機能を実装
function setupPanelDrag() {
    const panels = ['control-panel', 'info-panel', 'log-panel'];
    const showPanelsBtn = document.getElementById('showPanelsBtn');
    let closedPanels = new Set();
    
    panels.forEach(panelId => {
        const panel = document.getElementById(panelId);
        const header = panel.querySelector('.panel-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        // 最小化ボタンの設定
        const minimizeBtn = panel.querySelector('.minimize-btn');
        minimizeBtn.addEventListener('click', () => {
            panel.classList.toggle('panel-minimized');
            minimizeBtn.textContent = panel.classList.contains('panel-minimized') ? '□' : '−';
        });

        // 閉じるボタンの設定
        const closeBtn = panel.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => {
            panel.style.display = 'none';
            closedPanels.add(panelId);
            if (showPanelsBtn) showPanelsBtn.style.display = 'block';
        });

        // ドラッグ開始
        header.addEventListener('mousedown', dragStart);

        // ドラッグ中
        document.addEventListener('mousemove', drag);

        // ドラッグ終了
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === header || e.target.parentNode === header) {
                isDragging = true;
                window.setPanelDragging(true); // パネルドラッグ開始
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                setTranslate(currentX, currentY, panel);
            }
        }

        function dragEnd() {
            if (isDragging) {
                initialX = currentX;
                initialY = currentY;
                isDragging = false;
                window.setPanelDragging(false); // パネルドラッグ終了
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate(${xPos}px, ${yPos}px)`;
        }
    });

    // パネル再表示ボタンの処理
    if (showPanelsBtn) {
        showPanelsBtn.addEventListener('click', () => {
            panels.forEach(panelId => {
                const panel = document.getElementById(panelId);
                panel.style.display = 'block';
            });
            closedPanels.clear();
            showPanelsBtn.style.display = 'none';
        });
    }
}

// パネルのHTMLを更新
function updatePanelHTML() {
    const panels = {
        'control-panel': '🔧 制御パネル',
        'info-panel': '👥 エージェント情報',
        'log-panel': '📝 活動ログ'
    };

    Object.entries(panels).forEach(([id, title]) => {
        const panel = document.getElementById(id);
        const header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <h3 class="panel-title">${title}</h3>
            <div class="panel-controls">
                <button class="panel-button minimize-btn">−</button>
                <button class="panel-button close-btn">×</button>
            </div>
        `;
        panel.insertBefore(header, panel.firstChild);
    });
}

// エージェント詳細モーダルの機能
function setupAgentDetailModal() {
    const modal = document.getElementById('agentDetailModal');
    const closeBtn = document.getElementById('closeAgentDetailModal');
    const tabButtons = document.querySelectorAll('.tab-button');
    
    // モーダルを閉じる
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // モーダル外をクリックして閉じる
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // タブ切り替え
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // アクティブなタブボタンを更新
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // タブコンテンツを更新
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
}
window.setupAgentDetailModal = setupAgentDetailModal;

// エージェント詳細モーダルを表示
function showAgentDetailModal(agent) {
    const modal = document.getElementById('agentDetailModal');
    const title = document.getElementById('agentDetailModalTitle');
    console.log('showAgentDetailModal called', agent);
    console.log('modal:', modal);
    if (!modal) {
        alert('agentDetailModalが見つかりません');
        return;
    }
    title.textContent = `${agent.name}の詳細`;
    
    // 各タブの内容を更新
    updateAgentSummary(agent);
    updateMovementHistory(agent);
    updateActionHistory(agent);
    updateThoughtHistory(agent);
    updateCharts(agent);
    
    modal.style.display = 'block';
    console.log('modal.style.display set to', modal.style.display);
}
window._showAgentDetailModal = showAgentDetailModal;

// サマリタブを更新
function updateAgentSummary(agent) {
    const basicInfo = document.getElementById('agentBasicInfo');
    const stats = document.getElementById('agentStats');
    const relationships = document.getElementById('agentRelationships');
    
    // 基本情報
    basicInfo.innerHTML = `
        <div class="info-row">
            <span class="info-label">名前:</span>
            <span class="info-value">${agent.name}</span>
        </div>
        <div class="info-row">
            <span class="info-label">年齢:</span>
            <span class="info-value">${agent.age}歳</span>
        </div>
        <div class="info-row">
            <span class="info-label">現在地:</span>
            <span class="info-value">${agent.currentLocation.name}</span>
        </div>
        <div class="info-row">
            <span class="info-label">気分:</span>
            <span class="info-value">${agent.mood}</span>
        </div>
        <div class="info-row">
            <span class="info-label">体力:</span>
            <span class="info-value">${Math.round(agent.energy * 100)}%</span>
        </div>
        <div class="info-row">
            <span class="info-label">社交性:</span>
            <span class="info-value">${Math.round(agent.personality.traits.sociability * 100)}%</span>
        </div>
    `;
    
    // 統計情報
    const totalMovements = agent.movementHistory.length;
    const totalActions = agent.actionHistory.length;
    const totalThoughts = agent.thoughtHistory.length;
    const avgEnergy = agent.energyHistory.length > 0 ? 
        agent.energyHistory.reduce((sum, record) => sum + record.energy, 0) / agent.energyHistory.length : 0;
    
    stats.innerHTML = `
        <div class="info-row">
            <span class="info-label">総移動回数:</span>
            <span class="info-value">${totalMovements}</span>
        </div>
        <div class="info-row">
            <span class="info-label">総行動回数:</span>
            <span class="info-value">${totalActions}</span>
        </div>
        <div class="info-row">
            <span class="info-label">総思考回数:</span>
            <span class="info-value">${totalThoughts}</span>
        </div>
        <div class="info-row">
            <span class="info-label">平均体力:</span>
            <span class="info-value">${Math.round(avgEnergy * 100)}%</span>
        </div>
        <div class="info-row">
            <span class="info-label">記録開始:</span>
            <span class="info-value">${agent.movementHistory.length > 0 ? 
                agent.movementHistory[0].timestamp.toLocaleString('ja-JP') : 'なし'}</span>
        </div>
    `;
    
    // 関係性
    let relationshipsHTML = '';
    agent.relationships.forEach((relationship, agentName) => {
        const otherAgent = agents.find(a => a.name === agentName);
        if (otherAgent) {
            relationshipsHTML += `
                <div class="info-row">
                    <span class="info-label">${agentName}:</span>
                    <span class="info-value">親密度: ${Math.round(relationship.familiarity * 100)}%, 好感度: ${Math.round(relationship.affinity * 100)}%</span>
                </div>
            `;
        }
    });
    relationships.innerHTML = relationshipsHTML || '<div class="info-row"><span class="info-value">関係性データなし</span></div>';
}

// 移動履歴タブを更新
function updateMovementHistory(agent) {
    const container = document.getElementById('movementHistory');
    
    if (agent.movementHistory.length === 0) {
        container.innerHTML = '<div class="history-item"><div class="history-content">移動履歴がありません</div></div>';
        return;
    }
    
    let html = '';
    agent.movementHistory.slice().reverse().forEach(record => {
        html += `
            <div class="history-item">
                <div class="history-time">${record.timestamp.toLocaleString('ja-JP')} (${record.timeOfDay})</div>
                <div class="history-content">
                    <strong>${record.from}</strong> → <strong>${record.to}</strong>
                    ${record.reason ? `<br>理由: ${record.reason}` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 行動履歴タブを更新
function updateActionHistory(agent) {
    const container = document.getElementById('actionHistory');
    
    if (agent.actionHistory.length === 0) {
        container.innerHTML = '<div class="history-item"><div class="history-content">行動履歴がありません</div></div>';
        return;
    }
    
    let html = '';
    agent.actionHistory.slice().reverse().forEach(record => {
        html += `
            <div class="history-item">
                <div class="history-time">${record.timestamp.toLocaleString('ja-JP')} (${record.timeOfDay})</div>
                <div class="history-content">
                    <strong>${record.action}</strong>
                    ${record.target ? ` - ${record.target}` : ''}
                    ${record.details ? `<br>詳細: ${record.details}` : ''}
                    <br>場所: ${record.location}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 思考履歴タブを更新
function updateThoughtHistory(agent) {
    const container = document.getElementById('thoughtHistory');
    
    if (agent.thoughtHistory.length === 0) {
        container.innerHTML = '<div class="history-item"><div class="history-content">思考履歴がありません</div></div>';
        return;
    }
    
    let html = '';
    agent.thoughtHistory.slice().reverse().forEach(record => {
        html += `
            <div class="history-item">
                <div class="history-time">${record.timestamp.toLocaleString('ja-JP')} (${record.timeOfDay})</div>
                <div class="history-content">
                    <strong>思考:</strong> ${record.thought}
                    <br>場所: ${record.location}, 気分: ${record.mood}, 体力: ${Math.round(record.energy * 100)}%
                    ${record.context ? `<br>状況: ${record.context}` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// チャートタブを更新
function updateCharts(agent) {
    // 移動パターンチャート
    drawMovementChart(agent);
    
    // 行動分布チャート
    drawActionChart(agent);
    
    // 気分変化チャート
    drawMoodChart(agent);
    
    // エネルギー変化チャート
    drawEnergyChart(agent);
}

// 移動パターンチャートを描画
function drawMovementChart(agent) {
    const canvas = document.getElementById('movementChart');
    const ctx = canvas.getContext('2d');
    
    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (agent.movementHistory.length === 0) {
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText('データなし', 10, 100);
        return;
    }
    
    // 移動先の集計
    const destinations = {};
    agent.movementHistory.forEach(record => {
        destinations[record.to] = (destinations[record.to] || 0) + 1;
    });
    
    const labels = Object.keys(destinations);
    const values = Object.values(destinations);
    const maxValue = Math.max(...values);
    
    // チャートを描画
    const barWidth = (canvas.width - 40) / labels.length;
    const maxBarHeight = canvas.height - 40;
    
    ctx.fillStyle = '#4CAF50';
    labels.forEach((label, index) => {
        const barHeight = (values[index] / maxValue) * maxBarHeight;
        const x = 20 + index * barWidth;
        const y = canvas.height - 20 - barHeight;
        
        ctx.fillRect(x, y, barWidth - 2, barHeight);
        
        // ラベル
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.fillText(label, x, canvas.height - 5);
        ctx.fillText(values[index], x, y - 5);
        ctx.fillStyle = '#4CAF50';
    });
}

// 行動分布チャートを描画
function drawActionChart(agent) {
    const canvas = document.getElementById('actionChart');
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (agent.actionHistory.length === 0) {
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText('データなし', 10, 100);
        return;
    }
    
    // 行動の集計
    const actions = {};
    agent.actionHistory.forEach(record => {
        actions[record.action] = (actions[record.action] || 0) + 1;
    });
    
    const labels = Object.keys(actions);
    const values = Object.values(actions);
    const maxValue = Math.max(...values);
    
    const barWidth = (canvas.width - 40) / labels.length;
    const maxBarHeight = canvas.height - 40;
    
    ctx.fillStyle = '#2196F3';
    labels.forEach((label, index) => {
        const barHeight = (values[index] / maxValue) * maxBarHeight;
        const x = 20 + index * barWidth;
        const y = canvas.height - 20 - barHeight;
        
        ctx.fillRect(x, y, barWidth - 2, barHeight);
        
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.fillText(label, x, canvas.height - 5);
        ctx.fillText(values[index], x, y - 5);
        ctx.fillStyle = '#2196F3';
    });
}

// 気分変化チャートを描画
function drawMoodChart(agent) {
    const canvas = document.getElementById('moodChart');
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (agent.moodHistory.length === 0) {
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText('データなし', 10, 100);
        return;
    }
    
    // 気分の数値化
    const moodValues = agent.moodHistory.map(record => {
        switch (record.mood) {
            case '良い': return 1.0;
            case '楽しい': return 0.9;
            case '社交的': return 0.7;
            case '普通': return 0.5;
            case '寂しい': return 0.3;
            case '疲れている': return 0.2;
            default: return 0.5;
        }
    });
    
    // 折れ線グラフを描画
    ctx.strokeStyle = '#FF9800';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const stepX = (canvas.width - 40) / (moodValues.length - 1);
    moodValues.forEach((value, index) => {
        const x = 20 + index * stepX;
        const y = canvas.height - 20 - (value * (canvas.height - 40));
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
}

// エネルギー変化チャートを描画
function drawEnergyChart(agent) {
    const canvas = document.getElementById('energyChart');
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (agent.energyHistory.length === 0) {
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText('データなし', 10, 100);
        return;
    }
    
    // 折れ線グラフを描画
    ctx.strokeStyle = '#E91E63';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const stepX = (canvas.width - 40) / (agent.energyHistory.length - 1);
    agent.energyHistory.forEach((record, index) => {
        const x = 20 + index * stepX;
        const y = canvas.height - 20 - (record.energy * (canvas.height - 40));
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
}
