// 動画生成システム
class VideoGenerationSystem {
    constructor() {
        this.isRecording = false;
        this.recordingFrames = [];
        this.frameRate = 30;
        this.recordingDuration = 10; // 10秒間録画
        this.currentFrame = 0;
        this.veoServerUrl = '';
        this.veoApiKey = '';
        this.isConnected = false;
        this.recordingStartTime = 0;
        this.lastFrameTime = 0;
        this.frameInterval = 1000 / this.frameRate; // ミリ秒
        
        // エージェント行動データ記録用
        this.agentActionHistory = [];
        this.locationActivityHistory = [];
        this.eventHistory = [];
        
        this.initializeUI();
        this.loadSettings();
    }

    // UIの初期化
    initializeUI() {
        // イベントリスナーを設定
        this.setupEventListeners();
    }

    // イベントリスナーを設定
    setupEventListeners() {
        // 接続テスト
        const testConnectionBtn = document.getElementById('testVeoConnection');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => {
                this.testVeoConnection();
            });
        }

        // 録画開始
        const startRecordingBtn = document.getElementById('startRecording');
        if (startRecordingBtn) {
            startRecordingBtn.addEventListener('click', () => {
                this.startRecording();
            });
        }

        // 録画停止
        const stopRecordingBtn = document.getElementById('stopRecording');
        if (stopRecordingBtn) {
            stopRecordingBtn.addEventListener('click', () => {
                this.stopRecording();
            });
        }

        // 動画生成
        const generateVideoBtn = document.getElementById('generateVideo');
        if (generateVideoBtn) {
            generateVideoBtn.addEventListener('click', () => {
                this.generateVideo();
            });
        }

        // 設定の変更を監視
        const recordingDurationInput = document.getElementById('recordingDuration');
        const frameRateInput = document.getElementById('frameRate');
        
        if (recordingDurationInput) {
            recordingDurationInput.addEventListener('change', (e) => {
                this.recordingDuration = parseInt(e.target.value);
                this.frameInterval = 1000 / this.frameRate;
            });
        }

        if (frameRateInput) {
            frameRateInput.addEventListener('change', (e) => {
                this.frameRate = parseInt(e.target.value);
                this.frameInterval = 1000 / this.frameRate;
            });
        }

        // 設定の保存
        const inputs = ['veoServerUrl', 'veoApiKey', 'recordingDuration', 'frameRate', 'videoQuality', 'videoStyle', 'videoFocus', 'videoMood', 'customVideoPrompt'];
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('change', () => {
                    this.saveSettings();
                });
            }
        });
    }

    // 設定を読み込み
    loadSettings() {
        const savedSettings = localStorage.getItem('videoGenerationSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            const veoServerUrlInput = document.getElementById('veoServerUrl');
            const veoApiKeyInput = document.getElementById('veoApiKey');
            const recordingDurationInput = document.getElementById('recordingDuration');
            const frameRateInput = document.getElementById('frameRate');
            const videoQualitySelect = document.getElementById('videoQuality');

            if (veoServerUrlInput && settings.veoServerUrl) {
                veoServerUrlInput.value = settings.veoServerUrl;
                this.veoServerUrl = settings.veoServerUrl;
            }
            
            if (veoApiKeyInput && settings.veoApiKey) {
                veoApiKeyInput.value = settings.veoApiKey;
                this.veoApiKey = settings.veoApiKey;
            }
            
            if (recordingDurationInput && settings.recordingDuration) {
                recordingDurationInput.value = settings.recordingDuration;
                this.recordingDuration = settings.recordingDuration;
            }
            
            if (frameRateInput && settings.frameRate) {
                frameRateInput.value = settings.frameRate;
                this.frameRate = settings.frameRate;
                this.frameInterval = 1000 / this.frameRate;
            }
            
            if (videoQualitySelect && settings.videoQuality) {
                videoQualitySelect.value = settings.videoQuality;
            }
            
            // 動画生成指示設定を読み込み
            const videoStyleSelect = document.getElementById('videoStyle');
            const videoFocusSelect = document.getElementById('videoFocus');
            const videoMoodSelect = document.getElementById('videoMood');
            const customVideoPromptInput = document.getElementById('customVideoPrompt');
            
            if (videoStyleSelect && settings.videoStyle) {
                videoStyleSelect.value = settings.videoStyle;
            }
            if (videoFocusSelect && settings.videoFocus) {
                videoFocusSelect.value = settings.videoFocus;
            }
            if (videoMoodSelect && settings.videoMood) {
                videoMoodSelect.value = settings.videoMood;
            }
            if (customVideoPromptInput && settings.customVideoPrompt) {
                customVideoPromptInput.value = settings.customVideoPrompt;
            }
        }
    }

    // 設定を保存
    saveSettings() {
        const settings = {
            veoServerUrl: document.getElementById('veoServerUrl')?.value || '',
            veoApiKey: document.getElementById('veoApiKey')?.value || '',
            recordingDuration: parseInt(document.getElementById('recordingDuration')?.value) || 10,
            frameRate: parseInt(document.getElementById('frameRate')?.value) || 30,
            videoQuality: document.getElementById('videoQuality')?.value || 'low',
            videoStyle: document.getElementById('videoStyle')?.value || 'auto',
            videoFocus: document.getElementById('videoFocus')?.value || 'auto',
            videoMood: document.getElementById('videoMood')?.value || 'auto',
            customVideoPrompt: document.getElementById('customVideoPrompt')?.value || ''
        };
        
        localStorage.setItem('videoGenerationSettings', JSON.stringify(settings));
    }

    // Veo Serverとの接続テスト
    async testVeoConnection() {
        const statusElement = document.getElementById('connectionStatus');
        const testBtn = document.getElementById('testVeoConnection');
        
        if (!statusElement || !testBtn) return;

        // URLとAPIキーを取得
        const urlInput = document.getElementById('veoServerUrl');
        const apiKeyInput = document.getElementById('veoApiKey');
        
        if (!urlInput || !apiKeyInput) return;

        const serverUrl = urlInput.value.trim();
        const apiKey = apiKeyInput.value.trim();

        if (!serverUrl) {
            this.updateConnectionStatus('❌ Veo Server URLを入力してください', 'error');
            return;
        }

        testBtn.disabled = true;
        testBtn.textContent = '🔗 接続中...';
        this.updateConnectionStatus('🔄 Veo Serverに接続中...', 'connecting');

        try {
            // 接続テスト用のリクエスト
            const response = await fetch(`${serverUrl}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
                },
                timeout: 5000
            });

            if (response.ok) {
                this.isConnected = true;
                this.veoServerUrl = serverUrl;
                this.veoApiKey = apiKey;
                this.updateConnectionStatus('✅ Veo Serverに接続しました', 'success');
                addLog('🎬 Veo Serverとの接続が確立されました', 'system');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Veo Server接続エラー:', error);
            this.isConnected = false;
            this.updateConnectionStatus(`❌ 接続エラー: ${error.message}`, 'error');
            addLog(`❌ Veo Server接続エラー: ${error.message}`, 'error');
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = '🔗 接続テスト';
        }
    }

    // 接続状態を更新
    updateConnectionStatus(message, status) {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;

        statusElement.textContent = message;
        statusElement.className = `status-indicator ${status}`;
    }

    // 録画開始
    startRecording() {
        if (this.isRecording) return;

        // 接続確認
        if (!this.isConnected) {
            alert('先にVeo Serverとの接続を確立してください。');
            return;
        }

        // 録画設定を取得
        this.recordingDuration = parseInt(document.getElementById('recordingDuration')?.value) || 10;
        this.frameRate = parseInt(document.getElementById('frameRate')?.value) || 30;
        this.frameInterval = 1000 / this.frameRate;

        // 録画状態を初期化
        this.isRecording = true;
        this.recordingFrames = [];
        this.currentFrame = 0;
        this.recordingStartTime = Date.now();
        this.lastFrameTime = 0;

        // UIを更新
        const startBtn = document.getElementById('startRecording');
        const stopBtn = document.getElementById('stopRecording');
        const generateBtn = document.getElementById('generateVideo');

        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;
        if (generateBtn) generateBtn.disabled = true;

        // 録画情報を表示
        this.updateRecordingInfo();

        addLog('🎬 録画を開始しました', 'system');

        // 録画ループを開始
        this.recordingLoop();
    }

    // 録画ループ
    recordingLoop() {
        if (!this.isRecording) return;

        const currentTime = Date.now();
        const elapsedTime = (currentTime - this.recordingStartTime) / 1000;

        // 録画時間を超えたら停止
        if (elapsedTime >= this.recordingDuration) {
            this.stopRecording();
            return;
        }

        // フレーム間隔をチェック
        if (currentTime - this.lastFrameTime >= this.frameInterval) {
            this.captureFrame();
            this.lastFrameTime = currentTime;
        }

        // 進捗を更新
        this.updateRecordingProgress(elapsedTime);

        // 次のフレームをスケジュール
        requestAnimationFrame(() => this.recordingLoop());
    }

    // フレームをキャプチャ
    captureFrame() {
        if (!renderer || !scene || !camera) return;

        try {
            // 現在のシーンをレンダリング
            renderer.render(scene, camera);

            // キャンバスから画像データを取得
            const canvas = renderer.domElement;
            const imageData = canvas.toDataURL('image/jpeg', 0.8);

            // エージェント行動データを記録
            const agentActions = this.captureAgentActions();
            const locationActivity = this.captureLocationActivity();
            const events = this.captureEvents();

            // フレーム情報を記録
            const frame = {
                timestamp: Date.now(),
                imageData: imageData,
                frameNumber: this.currentFrame,
                cameraPosition: camera.position.clone(),
                cameraRotation: camera.rotation.clone(),
                agentActions: agentActions,
                locationActivity: locationActivity,
                events: events
            };

            this.recordingFrames.push(frame);
            this.agentActionHistory.push(agentActions);
            this.locationActivityHistory.push(locationActivity);
            this.eventHistory.push(events);
            this.currentFrame++;

        } catch (error) {
            console.error('フレームキャプチャエラー:', error);
        }
    }

    // エージェント行動データをキャプチャ
    captureAgentActions() {
        if (!agents || agents.length === 0) return [];

        return agents.map(agent => ({
            name: agent.name,
            age: agent.age,
            personality: agent.personality?.description || '不明',
            position: agent.position ? {
                x: agent.position.x,
                y: agent.position.y,
                z: agent.position.z
            } : null,
            currentLocation: agent.currentLocation ? {
                name: agent.currentLocation.name,
                type: agent.currentLocation.type,
                position: agent.currentLocation.position
            } : null,
            destination: agent.destination ? {
                name: agent.destination.name,
                type: agent.destination.type,
                position: agent.destination.position
            } : null,
            currentAction: agent.currentAction || '移動中',
            mood: agent.mood || '普通',
            energy: agent.energy || 1.0,
            relationships: Array.from(agent.relationships.entries()).map(([name, rel]) => ({
                name: name,
                affinity: rel.affinity,
                interactionCount: rel.interactionCount
            })),
            currentThought: agent.currentThought || null,
            shortTermMemory: agent.shortTermMemory ? agent.shortTermMemory.slice(-3) : []
        }));
    }

    // 場所活動データをキャプチャ
    captureLocationActivity() {
        if (!locations || locations.length === 0) return [];

        return locations.map(location => ({
            name: location.name,
            type: location.type,
            position: location.position,
            visitors: location.visitors ? location.visitors.map(visitor => ({
                name: visitor.name,
                timeSpent: visitor.timeSpent || 0
            })) : [],
            visitorCount: location.visitors ? location.visitors.length : 0,
            isActive: location.visitors && location.visitors.length > 0
        }));
    }

    // イベントデータをキャプチャ
    captureEvents() {
        const events = [];
        const currentTime = Date.now();

        // エージェント間の相互作用を検出
        if (agents && agents.length > 1) {
            for (let i = 0; i < agents.length; i++) {
                for (let j = i + 1; j < agents.length; j++) {
                    const agent1 = agents[i];
                    const agent2 = agents[j];
                    
                    // 同じ場所にいる場合の相互作用
                    if (agent1.currentLocation && agent2.currentLocation &&
                        agent1.currentLocation.name === agent2.currentLocation.name) {
                        events.push({
                            type: 'interaction',
                            participants: [agent1.name, agent2.name],
                            location: agent1.currentLocation.name,
                            timestamp: currentTime,
                            description: `${agent1.name}と${agent2.name}が${agent1.currentLocation.name}で交流`
                        });
                    }
                }
            }
        }

        // 場所の訪問イベント
        if (locations) {
            locations.forEach(location => {
                if (location.visitors && location.visitors.length > 0) {
                    events.push({
                        type: 'location_visit',
                        location: location.name,
                        visitors: location.visitors.map(v => v.name),
                        timestamp: currentTime,
                        description: `${location.name}に${location.visitors.length}人が訪問中`
                    });
                }
            });
        }

        return events;
    }

    // 録画停止
    stopRecording() {
        if (!this.isRecording) return;

        this.isRecording = false;

        // UIを更新
        const startBtn = document.getElementById('startRecording');
        const stopBtn = document.getElementById('stopRecording');
        const generateBtn = document.getElementById('generateVideo');

        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        if (generateBtn) generateBtn.disabled = false;

        addLog(`🎬 録画を停止しました (${this.recordingFrames.length}フレーム)`, 'system');

        // 録画情報を更新
        this.updateRecordingInfo();
    }

    // 録画進捗を更新
    updateRecordingProgress(elapsedTime) {
        const progressFill = document.getElementById('recordingProgressFill');
        const recordingInfo = document.getElementById('recordingInfo');

        if (progressFill) {
            const progress = (elapsedTime / this.recordingDuration) * 100;
            progressFill.style.width = `${Math.min(progress, 100)}%`;
        }

        if (recordingInfo) {
            const remainingTime = Math.max(0, this.recordingDuration - elapsedTime);
            recordingInfo.textContent = `録画中... ${elapsedTime.toFixed(1)}秒 / ${this.recordingDuration}秒 (残り${remainingTime.toFixed(1)}秒)`;
        }
    }

    // 録画情報を更新
    updateRecordingInfo() {
        const recordingInfo = document.getElementById('recordingInfo');
        if (!recordingInfo) return;

        if (this.isRecording) {
            recordingInfo.textContent = `録画中... ${this.currentFrame}フレーム`;
        } else if (this.recordingFrames.length > 0) {
            recordingInfo.textContent = `録画完了: ${this.recordingFrames.length}フレーム (${(this.recordingFrames.length / this.frameRate).toFixed(1)}秒)`;
        } else {
            recordingInfo.textContent = '録画待機中...';
        }
    }

    // 動画生成
    async generateVideo() {
        if (this.recordingFrames.length === 0) {
            alert('録画されたフレームがありません。');
            return;
        }

        if (!this.isConnected) {
            alert('Veo Serverとの接続が確立されていません。');
            return;
        }

        const generateBtn = document.getElementById('generateVideo');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.textContent = '🎥 生成中...';
        }

        addLog('🎥 動画生成を開始しました...', 'system');

        try {
            // 動画生成指示を準備
            const videoInstructions = this.generateVideoInstructions();
            
            // 録画データを準備
            const videoData = {
                frames: this.recordingFrames,
                frameRate: this.frameRate,
                duration: this.recordingDuration,
                quality: document.getElementById('videoQuality')?.value || 'low',
                metadata: {
                    timestamp: new Date().toISOString(),
                    agentCount: agents.length,
                    weather: weatherSystem ? weatherSystem.currentWeather : 'none',
                    cameraPosition: camera.position,
                    cameraRotation: camera.rotation,
                    time: {
                        currentTime: currentTime,
                        timeString: this.getTimeString(currentTime),
                        dayProgress: (currentTime / (24 * 60)) * 100
                    }
                },
                // エージェント行動データ
                agentData: {
                    agents: this.agentActionHistory.flat(),
                    relationships: this.captureRelationshipNetwork(),
                    personalityTypes: this.capturePersonalityDistribution()
                },
                // 場所活動データ
                locationData: {
                    locations: this.locationActivityHistory.flat(),
                    popularLocations: this.capturePopularLocations(),
                    activityPatterns: this.captureActivityPatterns()
                },
                // イベントデータ
                eventData: {
                    events: this.eventHistory.flat(),
                    significantEvents: this.captureSignificantEvents(),
                    interactionSummary: this.captureInteractionSummary()
                },
                // 動画生成指示
                videoInstructions: videoInstructions
            };

            // Veo Serverに動画生成リクエストを送信
            const response = await fetch(`${this.veoServerUrl}/generate-video`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.veoApiKey && { 'Authorization': `Bearer ${this.veoApiKey}` })
                },
                body: JSON.stringify(videoData)
            });

            if (response.ok) {
                const result = await response.json();
                
                if (result.videoUrl) {
                    this.displayVideoPreview(result.videoUrl);
                    addLog('🎥 動画生成が完了しました', 'system');
                } else {
                    throw new Error('動画URLが返されませんでした');
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            console.error('動画生成エラー:', error);
            addLog(`❌ 動画生成エラー: ${error.message}`, 'error');
            alert(`動画生成に失敗しました: ${error.message}`);
        } finally {
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.textContent = '🎥 動画生成';
            }
        }
    }

    // 動画生成指示を生成
    generateVideoInstructions() {
        const agentCount = agents.length;
        const activeLocations = this.locationActivityHistory.flat().filter(loc => loc.isActive);
        const interactions = this.eventHistory.flat().filter(event => event.type === 'interaction');
        
        // ユーザー設定を取得
        const userStyle = document.getElementById('videoStyle')?.value || 'auto';
        const userFocus = document.getElementById('videoFocus')?.value || 'auto';
        const userMood = document.getElementById('videoMood')?.value || 'auto';
        const customPrompt = document.getElementById('customVideoPrompt')?.value || '';
        
        // スタイルの決定
        let style = "ドキュメンタリー風";
        if (userStyle !== 'auto') {
            const styleMap = {
                'documentary': 'ドキュメンタリー風',
                'cinematic': '映画風',
                'news': 'ニュース風',
                'vlog': 'Vlog風'
            };
            style = styleMap[userStyle] || style;
        } else {
            // 自動選択ロジック
            if (agentCount > 5) {
                style = "都市ドキュメンタリー風";
            } else if (agentCount <= 2) {
                style = "親密なドキュメンタリー風";
            }
        }
        
        // 焦点の決定
        let focus = "エージェントの日常的な行動";
        if (userFocus !== 'auto') {
            const focusMap = {
                'agents': 'エージェントの行動',
                'interactions': 'エージェント間の交流',
                'locations': '場所の活動',
                'daily': '日常の風景'
            };
            focus = focusMap[userFocus] || focus;
        } else {
            // 自動選択ロジック
            if (interactions.length > 10) {
                focus = "エージェント間の交流と街の活気";
            } else if (activeLocations.length > 3) {
                focus = "様々な場所での活動";
            }
        }
        
        // 雰囲気の決定
        let mood = "温かみのある雰囲気";
        if (userMood !== 'auto') {
            const moodMap = {
                'warm': '温かみのある',
                'lively': '活気に満ちた',
                'peaceful': '静かな',
                'dynamic': '動的な'
            };
            mood = moodMap[userMood] || mood;
        } else {
            // 自動選択ロジック
            if (interactions.length > 10) {
                mood = "活気に満ちた交流の場";
            }
        }
        
        let cameraWork = "自然な視点で撮影";
        if (interactions.length > 10) {
            cameraWork = "動的な視点で交流を捉える";
        }
        
        // カスタムプロンプトがある場合は優先
        let description = customPrompt || `この街で起きている${agentCount}人のエージェントの日常を、${style}で表現してください。${focus}を中心に、${mood}で撮影してください。`;
        
        return {
            style: style,
            focus: focus,
            mood: mood,
            cameraWork: cameraWork,
            description: description,
            keyElements: {
                agents: agentCount,
                locations: activeLocations.length,
                interactions: interactions.length,
                timeOfDay: this.getTimeString(currentTime)
            }
        };
    }

    // 時間文字列を取得
    getTimeString(timeInMinutes) {
        const hours = Math.floor(timeInMinutes / 60);
        const minutes = Math.floor(timeInMinutes % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // 関係性ネットワークをキャプチャ
    captureRelationshipNetwork() {
        const relationships = [];
        if (agents) {
            agents.forEach(agent => {
                agent.relationships.forEach((rel, name) => {
                    if (rel.interactionCount > 0) {
                        relationships.push({
                            from: agent.name,
                            to: name,
                            affinity: rel.affinity,
                            interactionCount: rel.interactionCount
                        });
                    }
                });
            });
        }
        return relationships;
    }

    // 性格分布をキャプチャ
    capturePersonalityDistribution() {
        const personalities = {};
        if (agents) {
            agents.forEach(agent => {
                const personality = agent.personality?.description || '不明';
                personalities[personality] = (personalities[personality] || 0) + 1;
            });
        }
        return personalities;
    }

    // 人気の場所をキャプチャ
    capturePopularLocations() {
        const locationVisits = {};
        this.locationActivityHistory.flat().forEach(location => {
            if (location.visitorCount > 0) {
                locationVisits[location.name] = (locationVisits[location.name] || 0) + location.visitorCount;
            }
        });
        return Object.entries(locationVisits)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, visitCount: count }));
    }

    // 活動パターンをキャプチャ
    captureActivityPatterns() {
        const patterns = {
            morning: 0,
            afternoon: 0,
            evening: 0,
            night: 0
        };
        
        this.agentActionHistory.flat().forEach(agent => {
            const hour = Math.floor(currentTime / 60);
            if (hour >= 6 && hour < 12) patterns.morning++;
            else if (hour >= 12 && hour < 18) patterns.afternoon++;
            else if (hour >= 18 && hour < 22) patterns.evening++;
            else patterns.night++;
        });
        
        return patterns;
    }

    // 重要なイベントをキャプチャ
    captureSignificantEvents() {
        return this.eventHistory.flat()
            .filter(event => event.type === 'interaction')
            .slice(-5); // 最新の5つの相互作用
    }

    // 相互作用サマリーをキャプチャ
    captureInteractionSummary() {
        const interactions = this.eventHistory.flat().filter(event => event.type === 'interaction');
        const locations = {};
        
        interactions.forEach(interaction => {
            const location = interaction.location;
            locations[location] = (locations[location] || 0) + 1;
        });
        
        return {
            totalInteractions: interactions.length,
            locations: Object.entries(locations).map(([name, count]) => ({ name, count }))
        };
    }

    // 動画プレビューを表示
    displayVideoPreview(videoUrl) {
        const videoPreview = document.getElementById('videoPreview');
        if (!videoPreview) return;

        videoPreview.innerHTML = `
            <video controls width="100%" height="300">
                <source src="${videoUrl}" type="video/mp4">
                お使いのブラウザは動画再生に対応していません。
            </video>
            <div class="video-actions">
                <a href="${videoUrl}" download="simulation-video.mp4" class="btn btn-secondary">📥 ダウンロード</a>
                <button onclick="videoGenerationSystem.shareVideo('${videoUrl}')" class="btn btn-primary">📤 共有</button>
            </div>
        `;
    }

    // 動画を共有
    shareVideo(videoUrl) {
        if (navigator.share) {
            navigator.share({
                title: 'シミュレーション動画',
                text: 'MultiEntitySimulationArchitectureで生成された動画です。',
                url: videoUrl
            });
        } else {
            // フォールバック: URLをクリップボードにコピー
            navigator.clipboard.writeText(videoUrl).then(() => {
                alert('動画URLをクリップボードにコピーしました。');
            });
        }
    }

    // システムを更新
    update(deltaTime) {
        // 録画中の場合はフレームキャプチャを処理
        if (this.isRecording) {
            const currentTime = Date.now();
            if (currentTime - this.lastFrameTime >= this.frameInterval) {
                this.captureFrame();
                this.lastFrameTime = currentTime;
            }
        }
    }

    // システムをリセット
    reset() {
        this.isRecording = false;
        this.recordingFrames = [];
        this.currentFrame = 0;
        this.agentActionHistory = [];
        this.locationActivityHistory = [];
        this.eventHistory = [];
        
        // UIをリセット
        const startBtn = document.getElementById('startRecording');
        const stopBtn = document.getElementById('stopRecording');
        const generateBtn = document.getElementById('generateVideo');
        const progressFill = document.getElementById('recordingProgressFill');
        const recordingInfo = document.getElementById('recordingInfo');

        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        if (generateBtn) generateBtn.disabled = true;
        if (progressFill) progressFill.style.width = '0%';
        if (recordingInfo) recordingInfo.textContent = '録画待機中...';
    }
}

// グローバル変数として動画生成システムを初期化
let videoGenerationSystem = null;

// 動画生成システムを初期化する関数
function initializeVideoGenerationSystem() {
    if (!videoGenerationSystem) {
        videoGenerationSystem = new VideoGenerationSystem();
        console.log('動画生成システムを初期化しました');
    }
}

// グローバルスコープに公開
window.videoGenerationSystem = videoGenerationSystem;
window.initializeVideoGenerationSystem = initializeVideoGenerationSystem; 