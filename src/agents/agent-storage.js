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

// インポート用：確認なしで全エージェントを削除（読み込み前に呼ぶ）
function clearAllAgentsForImport() {
    const count = agents.length;
    if (typeof homeManager !== 'undefined') {
        agents.forEach(agent => {
            if (agent.home && agent.home.name) {
                homeManager.releaseHome(agent.home.name);
            }
        });
    }
    agents.length = 0;
    const homeObjects = scene.children.filter(child =>
        child.userData && child.userData.type === 'home'
    );
    homeObjects.forEach(obj => scene.remove(obj));
    if (typeof agentStorage !== 'undefined') agentStorage.clearAgents();
    updateStorageButtonText();
    if (typeof updateAgentInfo === 'function') updateAgentInfo();
    if (typeof window.updateSimulationButton === 'function') window.updateSimulationButton();
    if (count > 0) addLog(`🗑️ 既存エージェント ${count}人を削除しました`, 'info');
}

// 全エージェントを削除する関数
function clearAllAgents() {
    if (agents.length === 0) {
        alert('削除するエージェントがありません');
        return;
    }
    
    if (confirm(`本当に全エージェント (${agents.length}人) を削除しますか？\nこの操作は元に戻せません。`)) {
        clearAllAgentsForImport();
        addLog(`🗑️ 全エージェントを削除しました`, 'info');
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

// --- ペルソナのみ／記憶含むの書き出し用ヘルパー ---
function getAgentPersonaData(agent) {
    return {
        name: agent.name,
        age: agent.age,
        background: agent.background,
        personality: agent.personality,
        dailyRoutine: agent.dailyRoutine,
        color: agent.characterInstance ? agent.characterInstance.color : null
    };
}

function getAgentFullExportData(agent) {
    return {
        name: agent.name,
        age: agent.age,
        background: agent.background,
        personality: agent.personality,
        dailyRoutine: agent.dailyRoutine,
        color: agent.characterInstance ? agent.characterInstance.color : null,
        home: agent.home || null,
        relationships: Array.from(agent.relationships.entries()),
        shortTermMemory: agent.shortTermMemory || [],
        longTermMemory: agent.longTermMemory || []
    };
}

// エージェント書き出し（ペルソナのみ・軽量）
function exportAgentsPersonaOnly() {
    if (agents.length === 0) {
        alert('書き出すエージェントがありません');
        return;
    }
    const data = agents.map(getAgentPersonaData);
    const str = JSON.stringify(data, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agents_persona.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog(`📤 エージェントを書き出しました（ペルソナのみ ${agents.length}人）`, 'info');
}

// エージェント書き出し（記憶など含む）
function exportAgentsFull() {
    if (agents.length === 0) {
        alert('書き出すエージェントがありません');
        return;
    }
    const data = agents.map(getAgentFullExportData);
    const str = JSON.stringify(data, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agents_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog(`📤 エージェントを書き出しました（記憶など含む ${agents.length}人）`, 'info');
}

// インポートモード（読み込みボタンで設定）
let _importAgentsMode = 'full';

function setImportAgentsMode(mode) {
    _importAgentsMode = mode;
}

// エージェント読み込み実行（mode: 'persona' | 'full'）
function doImportAgents(json, mode) {
    if (!Array.isArray(json)) throw new Error('不正なファイル形式です');
    clearAllAgentsForImport();
    if (mode === 'persona') {
        json.forEach((agentData) => {
            const data = {
                name: agentData.name,
                age: agentData.age,
                background: agentData.background,
                personality: agentData.personality,
                dailyRoutine: agentData.dailyRoutine,
                color: agentData.color || null
            };
            const agent = new Agent(data, agents.length);
            agents.push(agent);
            agent.initializeRelationships();
        });
    } else {
        json.forEach((agentData) => {
            if (agentData.home && typeof createAgentHome === 'function') {
                createAgentHome(agentData.home);
            }
            const agent = new Agent(agentData, agents.length);
            if (agentData.home) agentData.home.occupant = agent.name;
            agents.push(agent);
            if (agentData.relationships && Array.isArray(agentData.relationships)) {
                agent.relationships = new Map(agentData.relationships);
            }
            if (Array.isArray(agentData.shortTermMemory)) agent.shortTermMemory = agentData.shortTermMemory;
            if (Array.isArray(agentData.longTermMemory)) agent.longTermMemory = agentData.longTermMemory;
        });
    }
    if (typeof updateAgentInfo === 'function') updateAgentInfo();
    if (typeof window.updateSimulationButton === 'function') window.updateSimulationButton();
    if (typeof window.agentStorage !== 'undefined' && typeof window.agentStorage.saveAgents === 'function') {
        window.agentStorage.saveAgents();
    }
}

// --- エージェント書き出し・読み込み機能（4ボタン） ---
function setupAgentExportImportButtons() {
    const exportPersonaBtn = document.getElementById('exportAgentsPersonaBtn');
    const exportFullBtn = document.getElementById('exportAgentsFullBtn');
    const importPersonaBtn = document.getElementById('importAgentsPersonaBtn');
    const importFullBtn = document.getElementById('importAgentsFullBtn');
    const importFile = document.getElementById('importAgentsFile');

    if (exportPersonaBtn && !exportPersonaBtn._exportImportBound) {
        exportPersonaBtn._exportImportBound = true;
        exportPersonaBtn.addEventListener('click', () => exportAgentsPersonaOnly());
    }
    if (exportFullBtn && !exportFullBtn._exportImportBound) {
        exportFullBtn._exportImportBound = true;
        exportFullBtn.addEventListener('click', () => exportAgentsFull());
    }
    if (importPersonaBtn && importFile && !importPersonaBtn._exportImportBound) {
        importPersonaBtn._exportImportBound = true;
        importPersonaBtn.addEventListener('click', () => {
            setImportAgentsMode('persona');
            importFile.value = '';
            importFile.click();
        });
    }
    if (importFullBtn && importFile && !importFullBtn._exportImportBound) {
        importFullBtn._exportImportBound = true;
        importFullBtn.addEventListener('click', () => {
            setImportAgentsMode('full');
            importFile.value = '';
            importFile.click();
        });
    }
    if (importFile && !importFile._exportImportBound) {
        importFile._exportImportBound = true;
        importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    const json = JSON.parse(ev.target.result);
                    doImportAgents(json, _importAgentsMode);
                    const label = _importAgentsMode === 'persona' ? 'ペルソナのみ' : '記憶など含む';
                    addLog(`📂 エージェント情報を読み込みました（${label} ${agents.length}人）`, 'info');
                    alert('エージェント情報を読み込みました (' + agents.length + '人)');
                } catch (err) {
                    alert('エージェント情報の読み込みに失敗しました: ' + err.message);
                }
            };
            reader.readAsText(file);
        });
    }
}

if (typeof window !== 'undefined') {
    window.exportAgentsPersonaOnly = exportAgentsPersonaOnly;
    window.exportAgentsFull = exportAgentsFull;
    window.setImportAgentsMode = setImportAgentsMode;
    window.setupAgentExportImportButtons = setupAgentExportImportButtons;

    function initWhenReady() {
        setupAgentExportImportButtons();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWhenReady);
    } else {
        initWhenReady();
    }
} 