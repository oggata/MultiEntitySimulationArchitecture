// エージェント情報のlocalStorage管理
const agentStorage = {
    // エージェント情報をlocalStorageに保存
    saveAgents() {
        try {
            const agentsData = agents.map(agent => ({
                name: agent.name,
                age: agent.age,
                background: agent.background,
                personality: agent.personality,
                dailyRoutine: agent.dailyRoutine,
                // home情報は削除（事前作成された自宅に割り当てるため）
                color: agent.characterInstance ? agent.characterInstance.color : null,
                // 関係性情報も保存
                relationships: Array.from(agent.relationships.entries()),
                // 記憶情報も保存
                shortTermMemory: agent.shortTermMemory,
                longTermMemory: agent.longTermMemory
            }));
            
            localStorage.setItem('resident_agents', JSON.stringify(agentsData));
            console.log(`${agentsData.length}人のエージェント情報をlocalStorageに保存しました`);
        } catch (error) {
            console.error('エージェント情報の保存に失敗しました:', error);
        }
    },
    
    // localStorageからエージェント情報を読み込み
    loadAgents() {
        try {
            const savedData = localStorage.getItem('resident_agents');
            if (!savedData) {
                console.log('保存されたエージェント情報が見つかりません');
                return false;
            }
            
            const agentsData = JSON.parse(savedData);
            console.log(`${agentsData.length}人のエージェント情報をlocalStorageから読み込みました`);
            
            // 既存のエージェントをクリア
            agents.length = 0;
            
            // 保存されたエージェントを復元
            for (let index = 0; index < agentsData.length; index++) {
                const agentData = agentsData[index];
                
                // 関係性をMapに変換
                if (agentData.relationships) {
                    agentData.relationships = new Map(agentData.relationships);
                }
                
                // ランダムで自宅を割り当て
                const assignedHome = homeManager.getRandomAvailableHome();
                if (!assignedHome) {
                    console.error(`エージェント「${agentData.name}」に自宅を割り当てできませんでした。`);
                    continue; // このエージェントをスキップ
                }
                
                agentData.home = assignedHome;
                assignedHome.occupant = agentData.name;
                
                // 自宅の3Dオブジェクトは既に初期化時に作成済みのため、ここでは作成しない
                // 必要に応じて自宅の状態を更新
                
                const agent = new Agent(agentData, index);
                agents.push(agent);
            }
            
            // エージェント情報を更新
            updateAgentInfo();
            
            return true;
        } catch (error) {
            console.error('エージェント情報の読み込みに失敗しました:', error);
            return false;
        }
    },
    
    // エージェント情報をクリア
    clearAgents() {
        try {
            localStorage.removeItem('resident_agents');
            console.log('エージェント情報をlocalStorageから削除しました');
        } catch (error) {
            console.error('エージェント情報の削除に失敗しました:', error);
        }
    },
    
    // 保存されたエージェント情報があるかチェック
    hasSavedAgents() {
        return localStorage.getItem('resident_agents') !== null;
    },
    
    // 保存されているエージェントの人数を取得
    getSavedAgentsCount() {
        try {
            const savedData = localStorage.getItem('resident_agents');
            if (!savedData) return 0;
            
            const agentsData = JSON.parse(savedData);
            return agentsData.length;
        } catch (error) {
            console.error('保存されたエージェント数の取得に失敗しました:', error);
            return 0;
        }
    }
};

// 保存されたエージェントを読み込む関数
function loadSavedAgents() {
    if (agentStorage.hasSavedAgents()) {
        const success = agentStorage.loadAgents();
        if (success) {
            addLog(`📂 保存されたエージェント情報を読み込みました (${agents.length}人)`, 'info');
            // ボタンテキストを更新（読み込み後は0人になる）
            updateStorageButtonText();
            // シミュレーション開始ボタンの状態を更新
            if (typeof window.updateSimulationButton === 'function') {
                window.updateSimulationButton();
            }
        } else {
            addLog(`❌ エージェント情報の読み込みに失敗しました`, 'error');
        }
    } else {
        addLog(`ℹ️ 保存されたエージェント情報が見つかりません`, 'info');
    }
}

// 全エージェントを削除する関数
function clearAllAgents() {
    if (agents.length === 0) {
        alert('削除するエージェントがありません');
        return;
    }
    
    if (confirm(`本当に全エージェント (${agents.length}人) を削除しますか？\nこの操作は元に戻せません。`)) {
        // 自宅を解放
        if (typeof homeManager !== 'undefined') {
            agents.forEach(agent => {
                if (agent.home && agent.home.name) {
                    homeManager.releaseHome(agent.home.name);
                }
            });
        }
        
        // エージェントをクリア
        agents.length = 0;
        
        // シーンから自宅を削除（簡易的な方法）
        const homeObjects = scene.children.filter(child => 
            child.userData && child.userData.type === 'home'
        );
        homeObjects.forEach(obj => scene.remove(obj));
        
        // localStorageからも削除
        agentStorage.clearAgents();
        
        // ボタンテキストを更新
        updateStorageButtonText();
        
        // UIを更新
        updateAgentInfo();
        // シミュレーション開始ボタンの状態を更新
        if (typeof window.updateSimulationButton === 'function') {
            window.updateSimulationButton();
        }
        
        addLog(`🗑️ 全エージェント (${agents.length}人) を削除しました`, 'info');
        alert('全エージェントを削除しました');
    }
}

// 定期的にエージェント情報を保存する機能
function startAutoSave() {
    setInterval(() => {
        if (agents.length > 0) {
            agentStorage.saveAgents();
            // ボタンテキストも更新
            updateStorageButtonText();
        }
    }, 30000); // 30秒ごとに自動保存
}

// ボタンのテキストを更新する関数
function updateStorageButtonText() {
    const loadAgentsBtn = document.getElementById('loadAgentsBtn');
    if (loadAgentsBtn && typeof agentStorage !== 'undefined') {
        const savedCount = agentStorage.getSavedAgentsCount();
        if (savedCount > 0) {
            loadAgentsBtn.textContent = `保存されたエージェントを読み込み (${savedCount}人)`;
        } else {
            loadAgentsBtn.textContent = '保存されたエージェントを読み込み';
        }
    }
}

// 自動保存を開始
startAutoSave();

// ページ読み込み時にボタンテキストを更新
document.addEventListener('DOMContentLoaded', () => {
    updateStorageButtonText();
});

// --- エージェント書き出し・読み込み機能 ---
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const exportBtn = document.getElementById('exportAgentsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const data = JSON.stringify(agents, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'agents_export.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }
        // 読み込み
        const importBtn = document.getElementById('importAgentsBtn');
        const importFile = document.getElementById('importAgentsFile');
        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => {
                importFile.value = '';
                importFile.click();
            });
            importFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = function(ev) {
                    try {
                        const json = JSON.parse(ev.target.result);
                        if (!Array.isArray(json)) throw new Error('不正なファイル形式です');
                        // 既存エージェントをクリア
                        if (typeof clearAllAgents === 'function') clearAllAgents();
                        // 各エージェントを復元
                        json.forEach((agentData, idx) => {
                            // 自宅3Dオブジェクトを作成
                            if (agentData.home && typeof createAgentHome === 'function') {
                                createAgentHome(agentData.home);
                            }
                            // Agentクラスのインスタンス化
                            const agent = new Agent(agentData, agents.length);
                            agents.push(agent);
                            agent.initializeRelationships();
                        });
                        // UI更新
                        if (typeof updateAgentInfo === 'function') updateAgentInfo();
                        if (typeof window.updateSimulationButton === 'function') window.updateSimulationButton();
                        if (window.agentStorage && typeof window.agentStorage.saveAgents === 'function') window.agentStorage.saveAgents();
                        alert('エージェント情報を読み込みました (' + agents.length + '人)');
                    } catch (err) {
                        alert('エージェント情報の読み込みに失敗しました: ' + err.message);
                    }
                };
                reader.readAsText(file);
            });
        }
    });
} 