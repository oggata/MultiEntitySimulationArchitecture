// エージェントクラス（拡張版）
class Agent {
    constructor(data, index) {
        this.name = data.name;
        this.age = data.age;
        this.background = data.background; // 新しい背景情報
        this.personality = data.personality;
        this.dailyRoutine = data.dailyRoutine;
        this.home = data.home;
        
        // homeが未定義の場合はエラーハンドリング
        if (!this.home) {
            console.error('Home is undefined for agent:', data.name);
            // ランダムで自宅を割り当て
            this.home = homeManager.getRandomAvailableHome();
            this.home.occupant = this.name;
        }
        
        // 自宅から出発するように設定
        this.currentLocation = locations.find(loc => loc.name === this.home.name);
        if (!this.currentLocation) {
            // 自宅が見つからない場合は自宅を作成
            this.currentLocation = {
                name: this.home.name,
                position: new THREE.Vector3(this.home.x, 0, this.home.z),
                activities: ["休憩する", "眠る", "読書する"],
                atmosphere: "静かで落ち着いた雰囲気の家",
                isHome: true,
                owner: this.name
            };
            locations.push(this.currentLocation);
        }
        
        // 確実に自宅の位置に初期化
        if (this.characterInstance) {
            this.characterInstance.setPosition(
                this.home.x,
                0,
                this.home.z
            );
        }
        
        // 現在位置と目標位置を自宅に設定
        this.targetLocation = this.currentLocation;
        
        // 移動目標も自宅に設定
        this.movementTarget = new THREE.Vector3(this.home.x, 0, this.home.z);
        
        // 記憶システム
        this.shortTermMemory = [];  // 短期記憶（最近の出来事）
        this.longTermMemory = [];   // 長期記憶（重要な出来事）
        this.relationships = new Map(); // 他のエージェントとの関係性
        
        // 現在の状態
        this.currentThought = "一日を始めています...";
        this.currentActivity = null;
        this.mood = "普通";
        this.energy = 1.0;
        this.isThinking = false;
        
        // 相互作用関連の設定
        this.lastInteractionTime = 0;
        this.interactionCooldown = 30000; // 30秒のクールダウン
        this.socialUrge = 0; // 社交欲求（時間とともに増加）
        
        // タイミング制御
        this.lastActionTime = Date.now();
        this.lastThoughtTime = Date.now();
        this.thinkingDuration = 5000 + Math.random() * 10000; // 5-15秒
        
        // 3Dモデル
        this.createModel(data.color);
        
        // 移動関連
        this.speed = 0.03 + (this.personality.traits.energy * 0.02);
        this.movementTarget = null;
        this.lastMovingState = false; // 移動状態の変更を追跡するためのフラグ
        
        // 街中での出会い関連
        this.isInConversation = false;
        this.conversationPartner = null;
        this.pausedMovementTarget = null;
        this.pausedTargetLocation = null;
        this.pausedCurrentPath = null;
        this.pausedCurrentPathIndex = 0;
        
        // 履歴記録
        this.movementHistory = [];
        this.actionHistory = [];
        this.thoughtHistory = [];
        this.moodHistory = [];
        this.energyHistory = [];
        
        // 他のエージェントとの関係を初期化
        this.initializeRelationships();
    }
    
    createModel(color) {
        // 既存の3Dモデルを削除（再生成時のため）
        if (this.characterInstance && this.characterInstance.dispose) {
            this.characterInstance.dispose();
        }
        // Characterクラスを使ってアバターを生成（gameはnullで渡す）
        this.characterInstance = new Character(scene, 'agent', null);
        
        // 確実に自宅の位置に初期化
        if (this.home) {
            this.characterInstance.setPosition(
                this.home.x,
                0,
                this.home.z
            );
        } else if (this.currentLocation && this.currentLocation.position) {
            this.characterInstance.setPosition(
                this.currentLocation.position.x,
                this.currentLocation.position.y || 0,
                this.currentLocation.position.z
            );
        }
        
        // 色を反映
        if (color) {
            //this.characterInstance.setColor(color);
        }
        // 参照用
        this.mesh = this.characterInstance.character;
    }
    
    initializeRelationships() {
        // 既存のエージェントとの関係を初期化
        agents.forEach(other => {
            if (other.name !== this.name) {
                this.relationships.set(other.name, {
                    familiarity: Math.random() * 0.3, // 0-0.3の初期値
                    affinity: 0.5, // 中立的な関係から開始
                    lastInteraction: null,
                    interactionCount: 0
                });

                // 相手側の関係も初期化
                if (!other.relationships.has(this.name)) {
                    other.relationships.set(this.name, {
                        familiarity: Math.random() * 0.3,
                        affinity: 0.5,
                        lastInteraction: null,
                        interactionCount: 0
                    });
                }
            }
        });
    }
    
    moveToLocation(location) {
        // 現在の場所から離れる際に待機スポットを解放
        if (this.currentLocation && this.currentLocation !== location) {
            this.releaseWaitingSpot();
        }
        
        this.targetLocation = location;
        
        // 移動開始時に思考を一時停止
        this.lastThoughtTime = Date.now();
        
        // 建物や施設への移動かどうかを判定
        const isBuildingOrFacility = location.name !== this.home.name;
        
        let path;
        if (isBuildingOrFacility) {
            // 建物や施設への移動の場合、対応する建物オブジェクトを探す
            const building = findBuildingForLocation(location);
            if (building) {
                // 建物への経路を計算（入り口経由）
                path = cityLayout.findPathToBuilding(
                    { x: this.mesh.position.x, z: this.mesh.position.z },
                    building
                );
            } else {
                // 建物が見つからない場合は直接移動
                path = [
                    { x: this.mesh.position.x, z: this.mesh.position.z },
                    { x: location.position.x, z: location.position.z }
                ];
            }
        } else {
            // 自宅への移動は通常の経路探索
            path = cityLayout.findPath(
                { x: this.mesh.position.x, z: this.mesh.position.z },
                { x: location.position.x, z: location.position.z }
            );
            
            // 経路が見つからない場合は直接移動
            if (!path || path.length === 0) {
                path = [
                    { x: this.mesh.position.x, z: this.mesh.position.z },
                    { x: location.position.x, z: location.position.z }
                ];
            }
        }

        if (path && path.length > 0) {
            // 最初の点を目標地点として設定
            this.movementTarget = new THREE.Vector3(
                path[0].x,
                0,
                path[0].z
            );
            this.currentPath = path;
            this.currentPathIndex = 0;

            // 移動方向を設定
            const direction = new THREE.Vector3()
                .subVectors(this.movementTarget, this.mesh.position)
                .normalize();
            this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
            
            // 経路を視覚化（このエージェントの経路のみ）
            cityLayout.visualizePath(path, 0x00ff00);
            
            // 移動履歴を記録
            this.recordMovement(this.currentLocation.name, location.name, '目的地への移動');
            
            addLog(`🚶 ${this.name}が${location.name}へ移動開始`, 'move', `
                <div class="log-detail-section">
                    <h4>移動の詳細</h4>
                    <p>出発地: ${this.currentLocation.name}</p>
                    <p>目的地: ${location.name}</p>
                    <p>移動速度: ${this.speed.toFixed(2)}</p>
                    <p>経路ポイント数: ${this.currentPath.length}</p>
                    <p>建物内移動: ${isBuildingOrFacility ? '有効' : '無効'}</p>
                </div>
            `);
        } else {
            // 経路が見つからない場合は直接移動
            this.movementTarget = new THREE.Vector3(
                location.position.x,
                0,
                location.position.z
            );
            this.currentPath = null;
            
            addLog(`⚠️ ${this.name}が${location.name}へ直接移動開始`, 'move', `
                <div class="log-detail-section">
                    <h4>移動の詳細</h4>
                    <p>出発地: ${this.currentLocation.name}</p>
                    <p>目的地: ${location.name}</p>
                    <p>移動速度: ${this.speed.toFixed(2)}</p>
                    <p>経路探索: 失敗（直接移動）</p>
                </div>
            `);
        }
    }

    update(deltaTime) {
        // 初期位置の設定（初回のみ）
        if (this.mesh && !this.initialPositionSet) {
            if (this.home) {
                this.mesh.position.set(this.home.x, 0, this.home.z);
                this.initialPositionSet = true;
            }
        }
        
        // エネルギーの更新（時間とともに減少）
        this.energy = Math.max(0.1, this.energy - (deltaTime * 0.0001));
        
        // 夜間は自宅でエネルギーを回復
        if (this.getTimeOfDay() === "night" && this.currentLocation.name === this.home.name) {
            this.energy = Math.min(1.0, this.energy + (deltaTime * 0.0002));
        }
        
        // 社交欲求の更新（時間とともに増加）
        this.socialUrge = Math.min(1.0, this.socialUrge + (deltaTime * 0.00005));
        
        // 相互作用のクールダウン更新
        if (Date.now() - this.lastInteractionTime > this.interactionCooldown) {
            this.lastInteractionTime = 0; // クールダウン終了
        }
        
        // 移動処理
        if (this.movementTarget) {
            const direction = new THREE.Vector3()
                .subVectors(this.movementTarget, this.mesh.position)
                .normalize();
            
            const distance = this.mesh.position.distanceTo(this.movementTarget);
            
            if (distance > 0.5) {
                const currentSpeed = this.speed * this.energy;
                
                // シンプルな移動処理：常に直接移動
                const newPosition = this.mesh.position.clone().add(direction.multiplyScalar(currentSpeed));
                this.mesh.position.copy(newPosition);
                this.mesh.position.y = 0;

                // 移動方向に応じてエージェントの向きを更新
                this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
            } else if (this.currentPath && this.currentPathIndex < this.currentPath.length - 1) {
                // 次の経路ポイントへ移動
                this.currentPathIndex++;
                this.movementTarget = new THREE.Vector3(
                    this.currentPath[this.currentPathIndex].x,
                    0,
                    this.currentPath[this.currentPathIndex].z
                );

                // 新しい移動方向に応じてエージェントの向きを更新
                const newDirection = new THREE.Vector3()
                    .subVectors(this.movementTarget, this.mesh.position)
                    .normalize();
                this.mesh.rotation.y = Math.atan2(newDirection.x, newDirection.z);

                addLog(`🔄 ${this.name}が経路ポイント${this.currentPathIndex + 1}/${this.currentPath.length}へ向かっています`, 'move');
            } else if (this.targetLocation) {
                // 目的地に到着
                this.currentLocation = this.targetLocation;
                this.movementTarget = null;
                this.currentPath = null;
                
                // 経路表示をクリア
                cityLayout.clearPathVisualization();
                
                // 移動完了時に思考タイマーをリセット
                this.lastThoughtTime = Date.now() - this.thinkingDuration + 1000; // 1秒後に思考開始
                
                this.onArrival();
            }
        }
        
        // 思考処理
        if (!this.isThinking && Date.now() - this.lastThoughtTime > this.thinkingDuration) {
            // 移動中は思考を停止
            if (this.movementTarget === null) {
                this.think();
            }
        }
        
        // キャラクターのアニメーション更新
        if (this.characterInstance && typeof this.characterInstance.updateLimbAnimation === 'function') {
            this.characterInstance.updateLimbAnimation(deltaTime);
        }
        
        // キャラクターの移動状態を反映
        if (this.characterInstance) {
            // 移動中かどうかを判定（movementTargetが存在し、かつ目的地に十分近くない場合）
            const isMoving = this.movementTarget !== null && 
                           this.mesh.position.distanceTo(this.movementTarget) > 0.5;
            this.characterInstance.setRunning(isMoving);
            
            // デバッグ用：移動状態の変更をログに出力（初回のみ）
            if (isMoving !== this.lastMovingState) {
                this.lastMovingState = isMoving;
                if (isMoving) {
                    addLog(`🚶 ${this.name}の歩行アニメーション開始`, 'system');
                } else {
                    addLog(`⏸️ ${this.name}の歩行アニメーション停止`, 'system');
                }
            }
        }
        
        // 待機列の更新（1秒ごと）
        if (Math.floor(clock.getElapsedTime()) % 1 === 0) {
            updateWaitingQueue(this);
        }
        
        // 気分とエネルギーの履歴を記録（10秒ごと）
        if (Math.floor(clock.getElapsedTime()) % 10 === 0) {
            this.recordMoodAndEnergy();
        }
        
        // 街中での偶然の出会いをチェック（移動中のみ）
        if (this.movementTarget && !this.isInConversation) {
            checkForStreetEncounter(this);
        }
    }
    
    async think() {
        if (!apiKey || !simulationRunning || simulationPaused) return;
        this.isThinking = true;
        const timeOfDay = this.getTimeOfDay();
        const nearbyAgents = this.getNearbyAgents();
        try {
            // LLMに完全自由行動を問い合わせるプロンプト
            const prompt = this.buildLLMActionPrompt(timeOfDay, nearbyAgents);
            const aiResponse = await callLLM({
                prompt,
                systemPrompt: "あなたは自律的なエージェントの意思決定システムです。夢や価値観、状況に基づき、現実的かつ自由な行動を1つだけ日本語で具体的に提案してください。場所や行動、理由も含めてください。JSON形式で出力してください。例: {\"action\":\"move\",\"target\":\"図書館\",\"reason\":\"起業のための本を探す\"}。施設名は必ず既存のものから選んでください。",
                maxTokens: 200,
                temperature: 0.9
            });
            // 返答をパース
            let decision = { action: null, thought: aiResponse, targetLocation: null, targetAgent: null };
            try {
                const parsed = JSON.parse(aiResponse.match(/\{[\s\S]*\}/)[0]);
                if (parsed.action === "move" && parsed.target) {
                    const loc = locations.find(l => l.name === parsed.target);
                    if (loc) {
                        decision.action = "move";
                        decision.targetLocation = loc;
                        decision.thought = parsed.reason || `${loc.name}へ移動したい`; 
                    }
                } else if (parsed.action === "interact" && parsed.target) {
                    const agent = agents.find(a => a.name === parsed.target);
                    if (agent) {
                        decision.action = "interact";
                        decision.targetAgent = agent;
                        decision.thought = parsed.reason || `${agent.name}と話したい`;
                    }
                } else if (parsed.action === "activity" && parsed.target) {
                    decision.action = "activity";
                    this.currentActivity = parsed.target;
                    decision.thought = parsed.reason || `${parsed.target}をしたい`;
                } else {
                    decision.thought = parsed.reason || aiResponse;
                }
            } catch (e) {
                // パース失敗時は思考のみ
                decision.thought = aiResponse;
            }
            // 思考履歴を記録
            this.recordThought(this.currentThought, `時間帯: ${timeOfDay}, 場所: ${this.currentLocation.name}`);
            
            this.executeDecision(decision);
            AgentUtils.logAgentAction(this, 'think', `
                <div class="log-detail-section">
                    <h4>思考の詳細</h4>
                    <p>時間帯: ${timeOfDay}</p>
                    <p>場所: ${this.currentLocation.name}</p>
                    <p>近くのエージェント: ${nearbyAgents.map(a => a.name).join(', ') || 'なし'}</p>
                    <p>思考内容: ${this.currentThought}</p>
                </div>
            `);
        } catch (error) {
            console.error(`${this.name}の思考プロセスエラー:`, error);
        } finally {
            this.isThinking = false;
            this.lastThoughtTime = Date.now();
            const nearbyAgents = this.getNearbyAgents();
            if (nearbyAgents.length > 0) {
                this.thinkingDuration = 5000 + Math.random() * 10000;
            } else {
                this.thinkingDuration = 10000 + Math.random() * 20000;
            }
        }
    }

    buildLLMActionPrompt(timeOfDay, nearbyAgents) {
        const recentMemories = this.shortTermMemory.slice(-5).map(m => m.event).join(', ');
        const currentMood = this.calculateMood();
        const topicPrompt = document.getElementById('topicPrompt') ? document.getElementById('topicPrompt').value.trim() : '';
        const themeContext = topicPrompt ? `\n\n話題のテーマ: ${topicPrompt}\nこのテーマに関連する話題や関心事についても考えてください。` : '';
        return `
あなたは${this.name}（${this.age}歳）です。\n
【現在の状況】\n- 時間帯: ${timeOfDay}\n- 現在地: ${this.currentLocation.name}\n- 体力: ${Math.round(this.energy * 100)}%\n- 気分: ${currentMood}\n- 最近の出来事: ${recentMemories || 'なし'}\n${nearbyAgents.length > 0 ? `- 近くにいる人: ${nearbyAgents.map(a => a.name).join(', ')}` : ''}\n\n【ペルソナ】\n- 性格: ${this.personality.description}\n- 価値観: ${this.personality.values}\n- 夢・目標: ${this.personality.goals}\n- 趣味: ${(this.background && this.background.hobbies) ? this.background.hobbies.join(', ') : ''}\n\n【ルール】\n- 夜間（22:00-6:00）は必ず自宅に帰ること\n- 施設名は必ず既存のもの（${locations.map(l => l.name).join('、')}）から選ぶこと\n- できるだけ現実的な行動を1つだけ提案してください\n- 例: {\"action\":\"move\",\"target\":\"図書館\",\"reason\":\"起業のための本を探す\"}\n${themeContext}\n\n今の状況で、あなたが最もしたいこと・すべきことを1つだけJSON形式で答えてください。`;
    }
    
    executeDecision(decision) {
        this.currentThought = decision.thought;
        
        // 思考をログに追加
        addLog(decision.thought, 'thought');
        
        // 記憶に追加
        this.addMemory(decision.thought, "thought");
        
        switch (decision.action) {
            case "move":
                if (decision.targetLocation) {
                    this.moveToLocation(decision.targetLocation);
                }
                break;
            
            case "interact":
                if (decision.targetAgent) {
                    this.interactWith(decision.targetAgent);
                }
                break;
            
            case "activity":
                performActivity(this);
                break;
        }
    }
    
    onArrival() {
        addLog(`📍 ${this.name}が${this.currentLocation.name}に到着`, 'arrival');
        
        // 待機スポットを選択
        selectWaitingSpot(this);
        
        // 到着時に近くのエージェントを確認
        this.checkForNearbyAgents();
        
        // 到着時の活動を決定
        if (this.currentLocation.activities.length > 0) {
            const activity = this.currentLocation.activities[
                Math.floor(Math.random() * this.currentLocation.activities.length)
            ];
            this.currentActivity = activity;
            this.currentThought = `${activity}ことにしよう`;
        }
    }
    
    // 近くのエージェントを確認し、相互作用の機会を探すメソッド
    checkForNearbyAgents() {
        const nearbyAgents = this.getNearbyAgents();
        
        if (nearbyAgents.length > 0) {
            // 社交性が高い場合は即座に相互作用を試行
            if (this.personality.traits.sociability > 0.6) {
                const targetAgent = nearbyAgents[Math.floor(Math.random() * nearbyAgents.length)];
                const relationship = this.relationships.get(targetAgent.name);
                
                // 初対面または親密度が低い場合は挨拶
                if (!relationship || relationship.familiarity < 0.3) {
                    setTimeout(() => {
                        this.interactWith(targetAgent);
                    }, 2000); // 2秒後に相互作用開始
                }
            }
            
            // 近くにいるエージェントの情報をログに追加
            addLog(`👥 ${this.name}が${this.currentLocation.name}で${nearbyAgents.length}人のエージェントを発見`, 'system');
        }
    }
    
    interactWith(otherAgent) {
        if (!otherAgent || !this.relationships.has(otherAgent.name)) {
            console.error('無効なエージェントとの相互作用:', otherAgent);
            return;
        }

        const relationship = this.relationships.get(otherAgent.name);
        if (!relationship) return;
        
        // 相互作用のクールダウンと社交欲求をリセット
        this.lastInteractionTime = Date.now();
        this.socialUrge = 0;
        
        // 相互作用の種類を決定
        const interactionTypes = getInteractionTypes(relationship);
        const interaction = interactionTypes[Math.floor(Math.random() * interactionTypes.length)];
        
        // 相互作用を実行
        performInteraction(this, otherAgent, interaction);
        
        // 関係性の更新（共通化）
        const affinityChange = (Math.random() - 0.3) * 0.2;
        AgentUtils.updateRelationship(this, otherAgent, 'interaction', affinityChange);
    }
    
    addMemory(event, type) {
        const memory = {
            time: new Date(),
            event: event,
            type: type,
            location: this.currentLocation.name,
            mood: this.mood
        };
        
        this.shortTermMemory.push(memory);
        
        // 短期記憶の制限（最新20件）
        if (this.shortTermMemory.length > 20) {
            const oldMemory = this.shortTermMemory.shift();
            // 重要な記憶は長期記憶へ
            if (oldMemory.type === "interaction" || Math.random() < 0.3) {
                this.longTermMemory.push(oldMemory);
            }
        }
        
        // 長期記憶の制限（最大50件）
        if (this.longTermMemory.length > 50) {
            this.longTermMemory.shift();
        }
    }
    
    getNearbyAgents() {
        return agents.filter(agent => 
            agent !== this && 
            !agent.isInConversation && // 会話中でない
            this.mesh.position.distanceTo(agent.mesh.position) < 5
        );
    }
    
    getTimeOfDay() {
        return AgentUtils.getTimeOfDay(currentTime);
    }
    
    getRoutineLocation(timeOfDay) {
        const routine = this.dailyRoutine[timeOfDay];
        if (routine && routine.length > 0) {
            // 夜間は必ず自宅に帰る
            if (timeOfDay === "night") {
                return this.home.name;
            }
            return routine[Math.floor(Math.random() * routine.length)];
        }
        return null;
    }
    
    calculateMood() {
        if (this.energy < 0.3) return "疲れている";
        if (this.energy > 0.8) return "元気";
        
        const recentInteractions = this.shortTermMemory.filter(m => 
            m.type === "interaction" && 
            (new Date() - m.time) < 300000 // 5分以内
        ).length;
        
        if (recentInteractions > 2) return "社交的";
        if (recentInteractions === 0 && this.personality.traits.sociability > 0.7) return "寂しい";
        
        return "普通";
    }
    
    // 目的地の情報を取得
    getDestinationInfo() {
        if (this.targetLocation && this.targetLocation !== this.currentLocation) {
            return this.targetLocation.name;
        }
        return "なし";
    }
    
    // 移動履歴を記録
    recordMovement(fromLocation, toLocation, reason = '') {
        AgentUtils.recordHistory(this.movementHistory, {
            from: fromLocation,
            to: toLocation,
            reason: reason,
            timeOfDay: this.getTimeOfDay()
        });
    }
    
    // 行動履歴を記録
    recordAction(action, target = '', details = '') {
        AgentUtils.recordHistory(this.actionHistory, {
            action: action,
            target: target,
            details: details,
            location: this.currentLocation.name,
            timeOfDay: this.getTimeOfDay()
        });
    }
    
    // 思考履歴を記録
    recordThought(thought, context = '') {
        AgentUtils.recordHistory(this.thoughtHistory, {
            thought: thought,
            context: context,
            location: this.currentLocation.name,
            mood: this.mood,
            energy: this.energy,
            timeOfDay: this.getTimeOfDay()
        });
    }
    
    // 気分とエネルギーの履歴を記録
    recordMoodAndEnergy() {
        AgentUtils.recordHistory(this.moodHistory, {
            mood: this.mood,
            timeOfDay: this.getTimeOfDay()
        }, 200);
        
        AgentUtils.recordHistory(this.energyHistory, {
            energy: this.energy,
            timeOfDay: this.getTimeOfDay()
        }, 200);
    }
    
    // 移動関連のメソッド（agent-movement.jsの関数を呼び出し）
    pauseMovement() {
        pauseMovement(this);
    }
    
    resumeMovement() {
        resumeMovement(this);
    }
    
    faceAgent(otherAgent) {
        faceAgent(this, otherAgent);
    }
    
    endStreetConversation() {
        endStreetConversation(this);
    }
    
    releaseWaitingSpot() {
        releaseWaitingSpot(this);
    }
} 