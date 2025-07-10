// エージェントクラス（拡張版）
class Agent {
    constructor(data, index) {
        this.name = data.name;
        this.age = data.age;
        this.personality = data.personality;
        this.dailyRoutine = data.dailyRoutine;
        this.home = data.home;
        this.currentLocation = locations.find(loc => loc.name === this.home.name) || locations[0];
        this.targetLocation = this.currentLocation;
        
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
        // 位置を初期化
        if (this.currentLocation && this.currentLocation.position) {
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
            const building = this.findBuildingForLocation(location);
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
    
    // 場所に対応する建物オブジェクトを探す
    findBuildingForLocation(location) {
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

    update(deltaTime) {
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
            this.updateWaitingQueue();
        }
    }
    
    async think() {
        if (!apiKey || !simulationRunning || simulationPaused) return;
        
        this.isThinking = true;
        const timeOfDay = this.getTimeOfDay();
        const nearbyAgents = this.getNearbyAgents();
        
        try {
            // 思考プロンプトの構築
            const prompt = this.buildThoughtPrompt(timeOfDay, nearbyAgents);
            
            // デモ用の思考シミュレーション（実際のAPI呼び出しの代わり）
            const decision = await this.simulateThought(prompt, timeOfDay, nearbyAgents);
            
            // 決定に基づいて行動
            this.executeDecision(decision);
            
            logAgentAction(this, 'think', `
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
            
            // 近くにエージェントがいる場合は思考間隔を短縮
            const nearbyAgents = this.getNearbyAgents();
            if (nearbyAgents.length > 0) {
                this.thinkingDuration = 5000 + Math.random() * 10000; // 5-15秒（短縮）
            } else {
                this.thinkingDuration = 10000 + Math.random() * 20000; // 10-30秒（通常）
            }
        }
    }
    
    buildThoughtPrompt(timeOfDay, nearbyAgents) {
        const recentMemories = this.shortTermMemory.slice(-5).map(m => m.event).join(', ');
        const currentMood = this.calculateMood();
        
        // プロンプトテーマを取得
        const topicPrompt = document.getElementById('topicPrompt') ? document.getElementById('topicPrompt').value.trim() : '';
        const themeContext = topicPrompt ? `\n\n話題のテーマ: ${topicPrompt}\nこのテーマに関連する話題や関心事についても考えてください。` : '';
        
        return `
        私は${this.name}、${this.age}歳。${this.personality.description}
        
        現在の状況:
        - 時間帯: ${timeOfDay}（夜間は22:00-6:00）
        - 現在地: ${this.currentLocation.name}（${this.currentLocation.atmosphere}）
        - 体力: ${Math.round(this.energy * 100)}%
        - 気分: ${currentMood}
        - 最近の出来事: ${recentMemories || 'なし'}
        
        ${nearbyAgents.length > 0 ? `近くにいる人: ${nearbyAgents.map(a => a.name).join(', ')}` : ''}
        
        私の性格特性:
        - 社交性: ${this.personality.traits.sociability}
        - 活動的さ: ${this.personality.traits.energy}
        - ルーチン重視: ${this.personality.traits.routine}
        - 好奇心: ${this.personality.traits.curiosity}
        
        重要な行動ルール:
        1. 夜間（22:00-6:00）は必ず自宅に帰る必要があります
        2. 夜間は自宅以外の場所に長く留まらないでください
        3. 夜間は体力を回復するために自宅で休むことが重要です
        4. 同じ場所に他の人がいる場合は、積極的に交流を試みてください
        5. 特にカフェ、公園、町の広場では、人との交流を大切にしてください${themeContext}
        
        この状況で、次に何をしたいですか？どのように感じていますか？
        特に夜間の場合は、自宅に帰ることを優先してください。
        他の人がいる場合は、交流することも考えてください。
        `;
    }
    
    async simulateThought(prompt, timeOfDay, nearbyAgents) {
        if (!document.getElementById('apiKey') || !window.getSelectedApiProvider) return null;
        try {
            const aiResponse = await callLLM({
                prompt,
                systemPrompt: "あなたは自律的なエージェントの意思決定システムです。与えられた状況に基づいて、自然な行動と思考を生成してください。特に夜間（22:00-6:00）は必ず自宅に帰ることを優先してください。",
                maxTokens: 150,
                temperature: 0.7
            });
            // AIの応答を解析して決定を生成
            const decision = {
                action: null,
                thought: aiResponse,
                targetLocation: null,
                targetAgent: null
            };

            // 夜間の場合は必ず自宅に帰る
            if (timeOfDay === "night" && this.currentLocation.name !== this.home.name) {
                const homeLocation = locations.find(l => l.name === this.home.name);
                if (homeLocation) {
                    decision.action = "move";
                    decision.targetLocation = homeLocation;
                    decision.thought = "夜になったので、自宅に帰ります。";
                    return decision;
                }
            }

            // 時間帯に基づくルーチンの確認
            const routineLocation = this.getRoutineLocation(timeOfDay);
            const shouldFollowRoutine = Math.random() < this.personality.traits.routine;

            // 社交的な行動の決定（改善版）
            if (nearbyAgents.length > 0) {
                // 相互作用の確率を計算
                let interactionProbability = this.personality.traits.sociability;
                
                // 施設の種類による相互作用確率の調整
                if (this.currentLocation.name === "カフェ" || this.currentLocation.name === "ファミレス") {
                    interactionProbability *= 1.5; // 飲食店では相互作用しやすい
                } else if (this.currentLocation.name === "公園" || this.currentLocation.name === "町の広場") {
                    interactionProbability *= 1.3; // 公共空間では相互作用しやすい
                } else if (this.currentLocation.name === "スポーツジム") {
                    interactionProbability *= 1.2; // ジムでは運動の話で相互作用しやすい
                }
                
                // 近くのエージェントが多いほど相互作用しやすい
                if (nearbyAgents.length >= 2) {
                    interactionProbability *= 1.2;
                }
                
                // 時間帯による調整（昼間は相互作用しやすい）
                if (timeOfDay === "day") {
                    interactionProbability *= 1.1;
                }
                
                // 気分による調整
                if (this.mood === "良い" || this.mood === "楽しい") {
                    interactionProbability *= 1.2;
                }
                
                // 社交欲求を考慮した相互作用確率の調整
                interactionProbability += this.socialUrge * 0.3;
                
                // 相互作用を試行
                if (Math.random() < interactionProbability && this.lastInteractionTime === 0) {
                    // 最も適切なターゲットを選択
                    let bestTarget = null;
                    let bestScore = 0;
                    
                    for (const agent of nearbyAgents) {
                        const relationship = this.relationships.get(agent.name);
                        if (!relationship) continue;
                        
                        // ターゲットスコアを計算
                        let score = relationship.affinity;
                        
                        // 親密度が低い場合は初対面の可能性が高い
                        if (relationship.familiarity < 0.3) {
                            score += 0.3; // 新しい出会いを重視
                        }
                        
                        // 相手の社交性も考慮
                        score += agent.personality.traits.sociability * 0.2;
                        
                        // 相手の気分も考慮
                        if (agent.mood === "良い" || agent.mood === "楽しい") {
                            score += 0.2;
                        }
                        
                        // 相手がクールダウン中でないことを確認
                        if (agent.lastInteractionTime !== 0) {
                            score -= 0.5; // クールダウン中の相手は避ける
                        }
                        
                        if (score > bestScore) {
                            bestScore = score;
                            bestTarget = agent;
                        }
                    }
                    
                    // 関係性の閾値を下げて、より多くの相互作用を可能に
                    if (bestTarget && bestScore > 0.1) {
                        decision.action = "interact";
                        decision.targetAgent = bestTarget;
                    }
                }
            }

            // 移動の決定
            if (!decision.action) {
                if (shouldFollowRoutine && routineLocation && routineLocation !== this.currentLocation.name) {
                    const targetLoc = locations.find(l => l.name === routineLocation);
                    if (targetLoc) {
                        decision.action = "move";
                        decision.targetLocation = targetLoc;
                    }
                } else if (Math.random() < this.personality.traits.curiosity) {
                    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
                    if (randomLocation !== this.currentLocation) {
                        decision.action = "move";
                        decision.targetLocation = randomLocation;
                    }
                }
            }

            // 現在地での活動
            if (!decision.action && this.currentLocation.activities.length > 0) {
                const activity = this.currentLocation.activities[
                    Math.floor(Math.random() * this.currentLocation.activities.length)
                ];
                decision.action = "activity";
                this.currentActivity = activity;
            }

            return decision;

        } catch (error) {
            console.error('LLM API呼び出しエラー:', error);
            // エラー時のフォールバック処理
            return {
                action: null,
                thought: "考え中...",
                targetLocation: null,
                targetAgent: null
            };
        }
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
                this.performActivity();
                break;
        }
    }
    
    onArrival() {
        addLog(`📍 ${this.name}が${this.currentLocation.name}に到着`, 'arrival');
        
        // 待機スポットを選択
        this.selectWaitingSpot();
        
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
    
    // 待機スポットを選択するメソッド
    selectWaitingSpot() {
        // 自宅の場合は待機スポットは不要
        if (this.currentLocation.isHome) {
            return;
        }
        
        // 施設に待機スポットがある場合
        if (this.currentLocation.waitingSpots && this.currentLocation.waitingSpots.length > 0) {
            // 利用可能なスポットを探す
            let availableSpot = null;
            
            for (const spot of this.currentLocation.waitingSpots) {
                if (!this.currentLocation.occupiedSpots.has(spot)) {
                    availableSpot = spot;
                    break;
                }
            }
            
            if (availableSpot) {
                // スポットを占有
                this.currentLocation.occupiedSpots.add(availableSpot);
                this.assignedWaitingSpot = availableSpot;
                
                // エージェントを待機スポットの位置に移動
                const worldPosition = new THREE.Vector3();
                worldPosition.copy(availableSpot.position);
                worldPosition.add(this.currentLocation.position);
                
                this.mesh.position.copy(worldPosition);
                
                addLog(`🪑 ${this.name}が${this.currentLocation.name}の${availableSpot.type}に座りました (${this.currentLocation.occupiedSpots.size}/${this.currentLocation.waitingSpots.length})`, 'system');
            } else {
                // 全てのスポットが埋まっている場合、待機列を形成
                this.createWaitingQueue();
            }
        } else {
            // 待機スポットがない場合は施設の中心付近に配置
            const offsetX = (Math.random() - 0.5) * 2;
            const offsetZ = (Math.random() - 0.5) * 2;
            
            this.mesh.position.set(
                this.currentLocation.position.x + offsetX,
                0,
                this.currentLocation.position.z + offsetZ
            );
        }
    }
    
    // 待機列を形成するメソッド
    createWaitingQueue() {
        // 施設の入り口付近に待機列を形成
        const queueOffset = 3; // 施設から3単位離れた位置
        const queueSpacing = 1.5; // エージェント間の間隔
        
        // 現在の待機列の人数を計算
        const waitingAgents = agents.filter(agent => 
            agent.currentLocation === this.currentLocation && 
            agent.assignedWaitingSpot === null &&
            agent.isInWaitingQueue
        );
        
        const queueIndex = waitingAgents.length;
        
        // 待機列の位置を計算（施設の入り口方向）
        const entranceDirection = new THREE.Vector3(1, 0, 0); // 仮の入り口方向
        const queuePosition = new THREE.Vector3();
        queuePosition.copy(this.currentLocation.position);
        queuePosition.add(entranceDirection.multiplyScalar(queueOffset + queueIndex * queueSpacing));
        
        this.mesh.position.copy(queuePosition);
        this.isInWaitingQueue = true;
        this.queueIndex = queueIndex;
        
        addLog(`⏳ ${this.name}が${this.currentLocation.name}の待機列に並びました（${queueIndex + 1}番目）`, 'system');
    }
    
    // 待機列の順序を更新するメソッド
    updateWaitingQueue() {
        if (!this.isInWaitingQueue || !this.currentLocation) {
            return;
        }
        
        // 同じ施設の待機列にいるエージェントを取得
        const waitingAgents = agents.filter(agent => 
            agent.currentLocation === this.currentLocation && 
            agent.isInWaitingQueue
        ).sort((a, b) => (a.queueIndex || 0) - (b.queueIndex || 0));
        
        // 待機列の順序を再計算
        waitingAgents.forEach((agent, index) => {
            agent.queueIndex = index;
            
            // 待機列の位置を更新
            const queueOffset = 3;
            const queueSpacing = 1.5;
            const entranceDirection = new THREE.Vector3(1, 0, 0);
            const queuePosition = new THREE.Vector3();
            queuePosition.copy(this.currentLocation.position);
            queuePosition.add(entranceDirection.multiplyScalar(queueOffset + index * queueSpacing));
            
            agent.mesh.position.copy(queuePosition);
        });
        
        // 待機列の先頭のエージェントが利用可能なスポットに移動できるかチェック
        if (waitingAgents.length > 0) {
            const firstInQueue = waitingAgents[0];
            const availableSpot = this.findAvailableSpot();
            
            if (availableSpot) {
                // 先頭のエージェントを待機スポットに移動
                firstInQueue.moveToWaitingSpot(availableSpot);
            }
        }
    }
    
    // 利用可能なスポットを探すメソッド
    findAvailableSpot() {
        if (!this.currentLocation.waitingSpots) {
            return null;
        }
        
        for (const spot of this.currentLocation.waitingSpots) {
            if (!this.currentLocation.occupiedSpots.has(spot)) {
                return spot;
            }
        }
        
        return null;
    }
    
    // 待機スポットに移動するメソッド
    moveToWaitingSpot(spot) {
        // 待機列から離脱
        this.isInWaitingQueue = false;
        this.queueIndex = null;
        
        // スポットを占有
        this.currentLocation.occupiedSpots.add(spot);
        this.assignedWaitingSpot = spot;
        
        // エージェントを待機スポットの位置に移動
        const worldPosition = new THREE.Vector3();
        worldPosition.copy(spot.position);
        worldPosition.add(this.currentLocation.position);
        
        this.mesh.position.copy(worldPosition);
        
        addLog(`🪑 ${this.name}が${this.currentLocation.name}の${spot.type}に移動しました`, 'system');
        
        // 待機列の順序を更新
        this.updateWaitingQueue();
    }
    
    // 待機スポットを解放するメソッド
    releaseWaitingSpot() {
        if (this.assignedWaitingSpot) {
            this.currentLocation.occupiedSpots.delete(this.assignedWaitingSpot);
            this.assignedWaitingSpot = null;
        }
        
        if (this.isInWaitingQueue) {
            this.isInWaitingQueue = false;
            this.queueIndex = null;
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
        const interactionTypes = this.getInteractionTypes(relationship);
        const interaction = interactionTypes[Math.floor(Math.random() * interactionTypes.length)];
        
        // 相互作用を実行
        this.performInteraction(otherAgent, interaction);
        
        // 関係性の更新
        const oldAffinity = relationship.affinity;
        relationship.familiarity = Math.min(1, relationship.familiarity + 0.1);
        relationship.affinity = Math.min(1, Math.max(0, relationship.affinity + (Math.random() - 0.3) * 0.2));
        
        if (Math.abs(relationship.affinity - oldAffinity) > 0.1) {
            logRelationshipChange(this, otherAgent, 'interaction');
        }
        
        relationship.lastInteraction = new Date();
        relationship.interactionCount++;
        
        // 相手側の関係性も更新
        const otherRelationship = otherAgent.relationships.get(this.name);
        if (otherRelationship) {
            otherRelationship.familiarity = relationship.familiarity;
            otherRelationship.affinity = relationship.affinity;
            otherRelationship.lastInteraction = relationship.lastInteraction;
            otherRelationship.interactionCount++;
        }
    }
    
    getInteractionTypes(relationship) {
        const types = [];
        
        if (relationship.familiarity < 0.3) {
            types.push("挨拶", "自己紹介", "天気の話");
        } else if (relationship.familiarity < 0.7) {
            types.push("雑談", "近況報告", "共通の話題");
        } else {
            types.push("深い会話", "相談", "一緒に活動");
        }
        
        if (relationship.affinity > 0.7) {
            types.push("冗談", "思い出話");
        } else if (relationship.affinity < 0.3) {
            types.push("短い会話", "形式的な挨拶");
        }
        
        return types;
    }
    
    async performInteraction(otherAgent, interactionType) {
        try {
            // プロンプトテーマを取得
            const topicPrompt = document.getElementById('topicPrompt') ? document.getElementById('topicPrompt').value.trim() : '';
            const themeContext = topicPrompt ? `\n\n話題のテーマ: ${topicPrompt}\nこのテーマに関連する話題についても話してください。` : '';
            
            const prompt = `\nあなたは${this.name}という${this.age}歳の${this.personality.description}です。\n現在${this.currentLocation.name}にいて、${otherAgent.name}さんと${interactionType}をしています。\n\nあなたの性格特性:\n- 社交性: ${this.personality.traits.sociability}\n- 活動的さ: ${this.personality.traits.energy}\n- ルーチン重視: ${this.personality.traits.routine}\n- 好奇心: ${this.personality.traits.curiosity}\n- 共感性: ${this.personality.traits.empathy}\n\n相手との関係:\n- 親密度: ${this.relationships.get(otherAgent.name).familiarity}\n- 好感度: ${this.relationships.get(otherAgent.name).affinity}${themeContext}\n\nこの状況で、自然な会話を生成してください。1-2文程度の短い会話にしてください。\n`;
            const message = await callLLM({
                prompt,
                systemPrompt: "あなたは自律的なエージェントの会話システムです。与えられた状況に基づいて、自然な会話を生成してください。",
                maxTokens: 100,
                temperature: 0.7
            });
            this.currentThought = message;
            addLog(`💬 ${this.name} → ${otherAgent.name}: "${message}"`, 'interaction');
            this.addMemory(`${otherAgent.name}と${interactionType}をした`, "interaction");
            // 相手の反応
            setTimeout(async () => {
                if (otherAgent && !otherAgent.isThinking) {
                    // プロンプトテーマを取得
                    const topicPrompt = document.getElementById('topicPrompt') ? document.getElementById('topicPrompt').value.trim() : '';
                    const themeContext = topicPrompt ? `\n\n話題のテーマ: ${topicPrompt}\nこのテーマに関連する話題についても話してください。` : '';
                    
                    const responsePrompt = `\nあなたは${otherAgent.name}という${otherAgent.age}歳の${otherAgent.personality.description}です。\n${this.name}さんから「${message}」と言われました。\n\nあなたの性格特性:\n- 社交性: ${otherAgent.personality.traits.sociability}\n- 活動的さ: ${otherAgent.personality.traits.energy}\n- ルーチン重視: ${otherAgent.personality.traits.routine}\n- 好奇心: ${otherAgent.personality.traits.curiosity}\n- 共感性: ${otherAgent.personality.traits.empathy}\n\n相手との関係:\n- 親密度: ${otherAgent.relationships.get(this.name).familiarity}\n- 好感度: ${otherAgent.relationships.get(this.name).affinity}${themeContext}\n\nこの状況で、自然な返答を生成してください。1-2文程度の短い返答にしてください。\n`;
                    try {
                        const responseMessage = await callLLM({
                            prompt: responsePrompt,
                            systemPrompt: "あなたは自律的なエージェントの会話システムです。与えられた状況に基づいて、自然な返答を生成してください。",
                            maxTokens: 100,
                            temperature: 0.7
                        });
                        otherAgent.currentThought = responseMessage;
                        addLog(`💬 ${otherAgent.name} → ${this.name}: "${responseMessage}"`, 'interaction');
                    } catch (error) {
                        console.error('LLM API呼び出しエラー:', error);
                        const fallbackResponses = [
                            `${this.name}さん、私も同じように思います！`,
                            "なるほど、そうですね。",
                            "それは興味深い話ですね。",
                            `${this.name}さんとお話しできて嬉しいです。`
                        ];
                        const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
                        otherAgent.currentThought = fallbackResponse;
                        addLog(`💬 ${otherAgent.name} → ${this.name}: "${fallbackResponse}"`, 'interaction');
                    }
                }
            }, 2000);
        } catch (error) {
            console.error('LLM API呼び出しエラー:', error);
            const fallbackMessages = {
                "挨拶": [
                    `${otherAgent.name}さん、こんにちは！`,
                    `やあ、${otherAgent.name}さん。元気？`,
                    `${otherAgent.name}さん、お久しぶり！`
                ],
                "自己紹介": [
                    `初めまして、${this.name}と申します。`,
                    `${this.personality.description.split('。')[0]}です。`,
                    `よろしくお願いします！`
                ],
                "天気の話": [
                    "今日はいい天気ですね。",
                    "最近、過ごしやすい気候ですね。",
                    "こんな日は外にいると気持ちいいですね。"
                ]
            };
            
            const messageList = fallbackMessages[interactionType] || ["..."];
            const message = messageList[Math.floor(Math.random() * messageList.length)];
            
            this.currentThought = message;
            addLog(`💬 ${this.name} → ${otherAgent.name}: "${message}"`, 'interaction');
        }
    }
    
    async performActivity() {
        if (this.currentActivity) {
            try {
                // プロンプトテーマを取得
                const topicPrompt = document.getElementById('topicPrompt') ? document.getElementById('topicPrompt').value.trim() : '';
                const themeContext = topicPrompt ? `\n\n話題のテーマ: ${topicPrompt}\nこのテーマに関連する考えや関心事についても表現してください。` : '';
                
                const prompt = `\nあなたは${this.name}という${this.age}歳の${this.personality.description}です。\n現在${this.currentLocation.name}で${this.currentActivity}しています。\n\nあなたの性格特性:\n- 社交性: ${this.personality.traits.sociability}\n- 活動的さ: ${this.personality.traits.energy}\n- ルーチン重視: ${this.personality.traits.routine}\n- 好奇心: ${this.personality.traits.curiosity}\n- 共感性: ${this.personality.traits.empathy}${themeContext}\n\nこの状況で、あなたが感じていることや考えていることを自然な形で表現してください。\n1-2文程度の短い思考にしてください。\n`;
                const thought = await callLLM({
                    prompt,
                    systemPrompt: "あなたは自律的なエージェントの思考システムです。与えられた状況に基づいて、自然な思考を生成してください。",
                    maxTokens: 100,
                    temperature: 0.7
                });
                this.currentThought = thought;
                addLog(`🎯 ${this.name}は${this.currentLocation.name}で${this.currentActivity}いる: "${thought}"`, 'activity', `\n                    <div class="log-detail-section">\n                        <h4>活動の詳細</h4>\n                        <p>場所: ${this.currentLocation.name}</p>\n                        <p>活動: ${this.currentActivity}</p>\n                        <p>思考: ${this.currentThought}</p>\n                    </div>\n                `);
                this.addMemory(`${this.currentLocation.name}で${this.currentActivity}`, "activity");
            } catch (error) {
                console.error('LLM API呼び出しエラー:', error);
                this.currentThought = `${this.currentActivity}いる`;
                addLog(`🎯 ${this.name}は${this.currentLocation.name}で${this.currentActivity}いる`, 'activity');
                this.addMemory(`${this.currentLocation.name}で${this.currentActivity}`, "activity");
            }
        }
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
            agent.currentLocation === this.currentLocation &&
            this.mesh.position.distanceTo(agent.mesh.position) < 5
        );
    }
    
    getTimeOfDay() {
        const hour = Math.floor(currentTime / 60);
        if (hour < 6 || hour >= 22) return "night";
        if (hour < 12) return "morning";
        if (hour < 18) return "afternoon";
        return "evening";
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
}

// エージェント生成関数
async function generateNewAgent() {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
        alert('APIキーを入力してください');
        return;
    }
    // APIプロバイダーによってバリデーションを分岐
    const provider = window.getSelectedApiProvider ? window.getSelectedApiProvider() : 'openai';
    if (provider === 'openai' && !(apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'))) {
        alert('無効なOpenAI APIキー形式です。sk-またはsk-proj-で始まる有効なAPIキーを入力してください。');
        return;
    }
    try {
        const prompt = `\nあなたは自律的なエージェントの性格生成システムです。\n以下の条件に基づいて、新しいエージェントの性格と特徴を生成してください。\n出力は必ず有効なJSON形式のみで、余分な説明やテキストは含めないでください。\n\n条件：\n1. 名前（日本語の一般的な苗字と名前の組み合わせ、例：田中太郎、佐藤花子など）\n2. 年齢（20-70歳の範囲の整数）\n3. 性格の説明（2-3文程度）\n4. 性格特性（0-1の範囲の数値、小数点以下2桁まで）：\n   - 社交性（sociability）\n   - 活動的さ（energy）\n   - ルーチン重視度（routine）\n   - 好奇心（curiosity）\n   - 共感性（empathy）\n5. 日課（各時間帯で2つまでの場所）\n6. 自宅の位置（x, z座標は-20から20の範囲の整数）\n\n有効な場所：\n- カフェ\n- 公園\n- 図書館\n- スポーツジム\n- 町の広場\n- 自宅\n\n出力形式（必ずこの形式のJSONのみを出力）：\n{\n    "name": "苗字 名前",\n    "age": 年齢,\n    "personality": {\n        "description": "性格の説明",\n        "traits": {\n            "sociability": 0.00,\n            "energy": 0.00,\n            "routine": 0.00,\n            "curiosity": 0.00,\n            "empathy": 0.00\n        }\n    },\n    "dailyRoutine": {\n        "morning": ["場所1", "場所2"],\n        "afternoon": ["場所1", "場所2"],\n        "evening": ["場所1", "場所2"],\n        "night": ["自宅"]\n    },\n    "home": {\n        "name": "苗字の家",\n        "x": 整数,\n        "z": 整数,\n        "color": "0x" + Math.floor(Math.random()*16777215).toString(16)\n    }\n}`;
        const content = await callLLM({
            prompt,
            systemPrompt: "あなたは自律的なエージェントの性格生成システムです。必ず有効なJSON形式のみを出力し、余分な説明やテキストは含めないでください。",
            maxTokens: 1000,
            temperature: 0.7,
            responseFormat: provider === 'openai' ? { type: "json_object" } : null
        });
        // レスポンスからJSONを抽出
        let jsonStr = content;
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}') + 1;
        if (jsonStart !== -1 && jsonEnd !== -1) {
            jsonStr = content.substring(jsonStart, jsonEnd);
        }
        if (!jsonStr.endsWith('}')) {
            jsonStr += '}';
        }
        if (!jsonStr.includes('"home"')) {
            const agentName = JSON.parse(jsonStr).name;
            // 苗字を抽出（最初の文字列を苗字とする）
            const lastName = agentName.split(' ')[0] || agentName;
            const homeInfo = {
                name: lastName + "の家",
                x: Math.floor(Math.random() * 41) - 20,
                z: Math.floor(Math.random() * 41) - 20,
                color: "0x" + Math.floor(Math.random()*16777215).toString(16)
            };
            jsonStr = jsonStr.slice(0, -1) + ',"home":' + JSON.stringify(homeInfo) + '}';
        }
        let agentData;
        try {
            agentData = JSON.parse(jsonStr);
            console.log('生成されたエージェントデータ:', agentData);
        } catch (parseError) {
            console.error('JSONパースエラー:', parseError);
            console.error('パースしようとしたJSON:', jsonStr);
            throw new Error('生成されたデータの形式が不正です');
        }
        if (!validateAgentData(agentData)) {
            throw new Error('生成されたデータが要件を満たしていません');
        }
        const agent = new Agent(agentData, agents.length);
        agents.push(agent);
        agent.initializeRelationships();
        createAgentHome(agentData.home);
        updateAgentInfo();
        addLog(`👤 新しいエージェント「${agentData.name}」が生成されました`, 'info', `\n            <div class="log-detail-section">\n                <h4>エージェントの詳細</h4>\n                <p>名前: ${agentData.name}</p>\n                <p>年齢: ${agentData.age}歳</p>\n                <p>性格: ${agentData.personality.description}</p>\n                <p>性格特性:</p>\n                <ul>\n                    <li>社交性: ${(agentData.personality.traits.sociability * 100).toFixed(0)}%</li>\n                    <li>活動的さ: ${(agentData.personality.traits.energy * 100).toFixed(0)}%</li>\n                    <li>ルーチン重視: ${(agentData.personality.traits.routine * 100).toFixed(0)}%</li>\n                    <li>好奇心: ${(agentData.personality.traits.curiosity * 100).toFixed(0)}%</li>\n                    <li>共感性: ${(agentData.personality.traits.empathy * 100).toFixed(0)}%</li>\n                </ul>\n            </div>\n        `);
    } catch (error) {
        console.error('エージェント生成エラー:', error);
        alert('エージェントの生成に失敗しました: ' + error.message);
    }
}

// エージェントデータの検証関数
function validateAgentData(data) {
    const requiredFields = [
        'name', 'age', 'personality', 'dailyRoutine', 'home'
    ];
    
    const requiredTraits = [
        'sociability', 'energy', 'routine', 'curiosity', 'empathy'
    ];
    
    const requiredRoutines = [
        'morning', 'afternoon', 'evening', 'night'
    ];
    
    const requiredHomeFields = [
        'name', 'x', 'z', 'color'
    ];
    
    const validLocations = [
        'カフェ', '公園', '図書館', 'スポーツジム', '町の広場', '自宅'
    ];

    // 必須フィールドのチェック
    for (const field of requiredFields) {
        if (!data[field]) {
            console.error(`必須フィールドが不足しています: ${field}`);
            return false;
        }
    }

    // 年齢のチェック
    if (typeof data.age !== 'number' || data.age < 20 || data.age > 70) {
        console.error('年齢が不正です');
        return false;
    }

    // 性格特性のチェック
    for (const trait of requiredTraits) {
        const value = data.personality.traits[trait];
        if (typeof value !== 'number' || value < 0 || value > 1) {
            console.error(`性格特性が不正です: ${trait}`);
            return false;
        }
    }

    // 日課のチェック
    for (const routine of requiredRoutines) {
        if (!Array.isArray(data.dailyRoutine[routine])) {
            console.error(`日課が不正です: ${routine}`);
            return false;
        }
        
        // 場所の妥当性チェック
        for (const location of data.dailyRoutine[routine]) {
            if (!validLocations.includes(location)) {
                console.error(`不正な場所が指定されています: ${location}`);
                return false;
            }
        }
    }

    // 自宅情報のチェック
    for (const field of requiredHomeFields) {
        if (!data.home[field]) {
            console.error(`自宅情報が不足しています: ${field}`);
            return false;
        }
    }

    // 座標の範囲チェック
    if (typeof data.home.x !== 'number' || typeof data.home.z !== 'number' ||
        data.home.x < -20 || data.home.x > 20 ||
        data.home.z < -20 || data.home.z > 20) {
        console.error('自宅の座標が不正です');
        return false;
    }

    return true;
}

// APIプロバイダーで切り替えてLLMに問い合わせる共通関数
async function callLLM({ prompt, systemPrompt = '', maxTokens = 150, temperature = 0.7, responseFormat = null }) {
    const provider = window.getSelectedApiProvider ? window.getSelectedApiProvider() : 'openai';
    const apiKey = document.getElementById('apiKey') ? document.getElementById('apiKey').value.trim() : '';
    if (!apiKey) throw new Error('APIキーが入力されていません');

    // LLMへの問い合わせ回数をカウント
    if (window.updateLlmCallCount) {
        window.updateLlmCallCount();
    }

    if (provider === 'openai') {
        const body = {
            model: "gpt-3.5-turbo",
            messages: [
                systemPrompt ? { role: "system", content: systemPrompt } : null,
                { role: "user", content: prompt }
            ].filter(Boolean),
            temperature,
            max_tokens: maxTokens
        };
        if (responseFormat) body.response_format = responseFormat;
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('OpenAI API エラー:', data);
            const errorMessage = data.error?.message || 'OpenAI API呼び出しに失敗しました';
            throw new Error(`OpenAI API エラー: ${errorMessage}`);
        }
        return data.choices[0].message.content;
    } else if (provider === 'gemini') {
        // Gemini API
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
        const body = {
            contents: [
                { role: "user", parts: [{ text: prompt }] }
            ]
        };
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Gemini API呼び出しに失敗しました');
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts[0].text) {
            throw new Error('Gemini APIからの応答が不正です');
        }
        return data.candidates[0].content.parts[0].text;
    } else {
        throw new Error('不明なAPIプロバイダーです');
    }
}

