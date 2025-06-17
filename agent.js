// エージェントクラス（拡張版）
class Agent {
    constructor(data, index) {
        this.name = data.name;
        this.age = data.age;
        this.personality = data.personality;
        this.dailyRoutine = data.dailyRoutine;
        this.currentLocation = locations[index % locations.length];
        this.targetLocation = this.currentLocation;
        this.home = data.home; // homeプロパティを追加
        
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
        
        // タイミング制御
        this.lastActionTime = Date.now();
        this.lastThoughtTime = Date.now();
        this.thinkingDuration = 5000 + Math.random() * 10000; // 5-15秒
        
        // 3Dモデル
        this.createModel(data.color);
        
        // 移動関連
        this.speed = 0.03 + (this.personality.traits.energy * 0.02);
        this.movementTarget = null;
        
        // 他のエージェントとの関係を初期化
        this.initializeRelationships();
    }
    
    createModel(color) {
        const group = new THREE.Group();
        
        // 体（円柱）
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: color });
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        bodyMesh.position.y = 0.5;
        bodyMesh.castShadow = true;
        group.add(bodyMesh);
        
        // 頭（球体）
        const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
        const headMaterial = new THREE.MeshLambertMaterial({ color: color });
        const headMesh = new THREE.Mesh(headGeometry, headMaterial);
        headMesh.position.y = 1.25;
        headMesh.castShadow = true;
        group.add(headMesh);
        
        // 思考中インジケーター（頭の上の小さな球）
        const thinkingGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const thinkingMaterial = new THREE.MeshLambertMaterial({
            color: 0xFFFFFF,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.5
        });
        this.thinkingIndicator = new THREE.Mesh(thinkingGeometry, thinkingMaterial);
        this.thinkingIndicator.position.y = 1.8;
        this.thinkingIndicator.visible = false;
        group.add(this.thinkingIndicator);
        
        this.mesh = group;
        this.mesh.position.copy(this.currentLocation.position);
        this.mesh.position.y = 0;
        scene.add(this.mesh);
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
        this.targetLocation = location;
        
        // 現在位置から目標位置への経路を計算
        const path = cityLayout.findPath(
            { x: this.mesh.position.x, z: this.mesh.position.z },
            { x: location.position.x, z: location.position.z }
        );

        if (path && path.length > 0) {
            // 最初の道路上の点を目標地点として設定
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
        } else {
            // 経路が見つからない場合は最も近い道路上の点を探してそこから開始
            const nearestRoadPoint = cityLayout.findNearestRoadPoint(
                this.mesh.position.x,
                this.mesh.position.z
            );
            
            if (nearestRoadPoint) {
                this.movementTarget = new THREE.Vector3(
                    nearestRoadPoint.x,
                    0,
                    nearestRoadPoint.z
                );
                // 再度経路を計算
                const newPath = cityLayout.findPath(
                    { x: nearestRoadPoint.x, z: nearestRoadPoint.z },
                    { x: location.position.x, z: location.position.z }
                );
                if (newPath) {
                    this.currentPath = newPath;
                    this.currentPathIndex = 0;
                }
            } else {
                // 道路が見つからない場合は直接移動
                this.movementTarget = new THREE.Vector3(
                    location.position.x,
                    0,
                    location.position.z
                );
                this.currentPath = null;
            }
        }
        
        addLog(`🚶 ${this.name}が${location.name}へ移動開始`, 'move', `
            <div class="log-detail-section">
                <h4>移動の詳細</h4>
                <p>出発地: ${this.currentLocation.name}</p>
                <p>目的地: ${location.name}</p>
                <p>移動速度: ${this.speed.toFixed(2)}</p>
                <p>経路ポイント数: ${this.currentPath ? this.currentPath.length : 1}</p>
            </div>
        `);
    }

    update(deltaTime) {
        // エネルギーの更新（時間とともに減少）
        this.energy = Math.max(0.1, this.energy - (deltaTime * 0.0001));
        
        // 夜間は自宅でエネルギーを回復
        if (this.getTimeOfDay() === "night" && this.currentLocation.name === this.home.name) {
            this.energy = Math.min(1.0, this.energy + (deltaTime * 0.0002));
        }
        
        // 移動処理
        if (this.movementTarget) {
            const direction = new THREE.Vector3()
                .subVectors(this.movementTarget, this.mesh.position)
                .normalize();
            
            const distance = this.mesh.position.distanceTo(this.movementTarget);
            
            if (distance > 0.5) {
                const currentSpeed = this.speed * this.energy;
                this.mesh.position.add(direction.multiplyScalar(currentSpeed));
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
                this.onArrival();
            }
        }
        
        // 思考中インジケーターのアニメーション
        if (this.isThinking && this.thinkingIndicator) {
            this.thinkingIndicator.visible = true;
            this.thinkingIndicator.position.y = 1.8 + Math.sin(Date.now() * 0.003) * 0.1;
            this.thinkingIndicator.rotation.y += deltaTime * 2;
        } else {
            this.thinkingIndicator.visible = false;
        }
        
        // 定期的な思考プロセス
        if (Date.now() - this.lastThoughtTime > this.thinkingDuration && !this.isThinking) {
            this.think();
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
            this.thinkingDuration = 10000 + Math.random() * 20000; // 10-30秒
        }
    }
    
    buildThoughtPrompt(timeOfDay, nearbyAgents) {
        const recentMemories = this.shortTermMemory.slice(-5).map(m => m.event).join(', ');
        const currentMood = this.calculateMood();
        
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
        
        この状況で、次に何をしたいですか？どのように感じていますか？
        特に夜間の場合は、自宅に帰ることを優先してください。
        `;
    }
    
    async simulateThought(prompt, timeOfDay, nearbyAgents) {
        if (!apiKey) return null;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: "あなたは自律的なエージェントの意思決定システムです。与えられた状況に基づいて、自然な行動と思考を生成してください。特に夜間（22:00-6:00）は必ず自宅に帰ることを優先してください。"
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 150
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'API呼び出しに失敗しました');
            }

            const data = await response.json();
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('APIからの応答が不正です');
            }

            const aiResponse = data.choices[0].message.content;
            
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

            // 社交的な行動の決定
            if (nearbyAgents.length > 0 && Math.random() < this.personality.traits.sociability) {
                const targetAgent = nearbyAgents[Math.floor(Math.random() * nearbyAgents.length)];
                const relationship = this.relationships.get(targetAgent.name);
                
                if (relationship && relationship.affinity > 0.3) {
                    decision.action = "interact";
                    decision.targetAgent = targetAgent;
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
            console.error('OpenAI API呼び出しエラー:', error);
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
        
        // 到着時の活動を決定
        if (this.currentLocation.activities.length > 0) {
            const activity = this.currentLocation.activities[
                Math.floor(Math.random() * this.currentLocation.activities.length)
            ];
            this.currentActivity = activity;
            this.currentThought = `${activity}ことにしよう`;
        }
    }
    
    interactWith(otherAgent) {
        if (!otherAgent || !this.relationships.has(otherAgent.name)) {
            console.error('無効なエージェントとの相互作用:', otherAgent);
            return;
        }

        const relationship = this.relationships.get(otherAgent.name);
        if (!relationship) return;
        
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
            const prompt = `
            あなたは${this.name}という${this.age}歳の${this.personality.description}です。
            現在${this.currentLocation.name}にいて、${otherAgent.name}さんと${interactionType}をしています。
            
            あなたの性格特性:
            - 社交性: ${this.personality.traits.sociability}
            - 活動的さ: ${this.personality.traits.energy}
            - ルーチン重視: ${this.personality.traits.routine}
            - 好奇心: ${this.personality.traits.curiosity}
            - 共感性: ${this.personality.traits.empathy}
            
            相手との関係:
            - 親密度: ${this.relationships.get(otherAgent.name).familiarity}
            - 好感度: ${this.relationships.get(otherAgent.name).affinity}
            
            この状況で、自然な会話を生成してください。1-2文程度の短い会話にしてください。
            `;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: "あなたは自律的なエージェントの会話システムです。与えられた状況に基づいて、自然な会話を生成してください。"
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 100
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message || 'API呼び出しに失敗しました');
            }

            const message = data.choices[0].message.content;
            
            this.currentThought = message;
            addLog(`💬 ${this.name} → ${otherAgent.name}: "${message}"`, 'interaction');
            
            this.addMemory(`${otherAgent.name}と${interactionType}をした`, "interaction");
            
            // 相手の反応
            setTimeout(async () => {
                if (otherAgent && !otherAgent.isThinking) {
                    const responsePrompt = `
                    あなたは${otherAgent.name}という${otherAgent.age}歳の${otherAgent.personality.description}です。
                    ${this.name}さんから「${message}」と言われました。
                    
                    あなたの性格特性:
                    - 社交性: ${otherAgent.personality.traits.sociability}
                    - 活動的さ: ${otherAgent.personality.traits.energy}
                    - ルーチン重視: ${otherAgent.personality.traits.routine}
                    - 好奇心: ${otherAgent.personality.traits.curiosity}
                    - 共感性: ${otherAgent.personality.traits.empathy}
                    
                    相手との関係:
                    - 親密度: ${otherAgent.relationships.get(this.name).familiarity}
                    - 好感度: ${otherAgent.relationships.get(this.name).affinity}
                    
                    この状況で、自然な返答を生成してください。1-2文程度の短い返答にしてください。
                    `;

                    try {
                        const responseResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${apiKey}`
                            },
                            body: JSON.stringify({
                                model: "gpt-3.5-turbo",
                                messages: [
                                    {
                                        role: "system",
                                        content: "あなたは自律的なエージェントの会話システムです。与えられた状況に基づいて、自然な返答を生成してください。"
                                    },
                                    {
                                        role: "user",
                                        content: responsePrompt
                                    }
                                ],
                                temperature: 0.7,
                                max_tokens: 100
                            })
                        });

                        const responseData = await responseResponse.json();
                        if (!responseResponse.ok) {
                            throw new Error(responseData.error?.message || 'API呼び出しに失敗しました');
                        }

                        const responseMessage = responseData.choices[0].message.content;
                        otherAgent.currentThought = responseMessage;
                        addLog(`💬 ${otherAgent.name} → ${this.name}: "${responseMessage}"`, 'interaction');
                    } catch (error) {
                        console.error('OpenAI API呼び出しエラー:', error);
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
            console.error('OpenAI API呼び出しエラー:', error);
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
                const prompt = `
                あなたは${this.name}という${this.age}歳の${this.personality.description}です。
                現在${this.currentLocation.name}で${this.currentActivity}しています。
                
                あなたの性格特性:
                - 社交性: ${this.personality.traits.sociability}
                - 活動的さ: ${this.personality.traits.energy}
                - ルーチン重視: ${this.personality.traits.routine}
                - 好奇心: ${this.personality.traits.curiosity}
                - 共感性: ${this.personality.traits.empathy}
                
                この状況で、あなたが感じていることや考えていることを自然な形で表現してください。
                1-2文程度の短い思考にしてください。
                `;

                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: "gpt-3.5-turbo",
                        messages: [
                            {
                                role: "system",
                                content: "あなたは自律的なエージェントの思考システムです。与えられた状況に基づいて、自然な思考を生成してください。"
                            },
                            {
                                role: "user",
                                content: prompt
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 100
                    })
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error?.message || 'API呼び出しに失敗しました');
                }

                const thought = data.choices[0].message.content;
                this.currentThought = thought;
                addLog(`🎯 ${this.name}は${this.currentLocation.name}で${this.currentActivity}いる: "${thought}"`, 'activity', `
                    <div class="log-detail-section">
                        <h4>活動の詳細</h4>
                        <p>場所: ${this.currentLocation.name}</p>
                        <p>活動: ${this.currentActivity}</p>
                        <p>思考: ${this.currentThought}</p>
                    </div>
                `);
                this.addMemory(`${this.currentLocation.name}で${this.currentActivity}`, "activity");
            } catch (error) {
                console.error('OpenAI API呼び出しエラー:', error);
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
}




// エージェント生成関数
async function generateNewAgent() {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
        alert('OpenAI APIキーを入力してください');
        return;
    }

    if (!apiKey.startsWith('sk-')) {
        alert('無効なAPIキー形式です。sk-で始まる有効なAPIキーを入力してください。');
        return;
    }

    try {
        const prompt = `
        あなたは自律的なエージェントの性格生成システムです。
        以下の条件に基づいて、新しいエージェントの性格と特徴を生成してください。
        出力は必ず有効なJSON形式のみで、余分な説明やテキストは含めないでください。

        条件：
        1. 名前（日本語の一般的な名前）
        2. 年齢（20-70歳の範囲の整数）
        3. 性格の説明（2-3文程度）
        4. 性格特性（0-1の範囲の数値、小数点以下2桁まで）：
           - 社交性（sociability）
           - 活動的さ（energy）
           - ルーチン重視度（routine）
           - 好奇心（curiosity）
           - 共感性（empathy）
        5. 日課（各時間帯で2つまでの場所）
        6. 自宅の位置（x, z座標は-20から20の範囲の整数）

        有効な場所：
        - カフェ
        - 公園
        - 図書館
        - スポーツジム
        - 町の広場
        - 自宅

        出力形式（必ずこの形式のJSONのみを出力）：
        {
            "name": "名前",
            "age": 年齢,
            "personality": {
                "description": "性格の説明",
                "traits": {
                    "sociability": 0.00,
                    "energy": 0.00,
                    "routine": 0.00,
                    "curiosity": 0.00,
                    "empathy": 0.00
                }
            },
            "dailyRoutine": {
                "morning": ["場所1", "場所2"],
                "afternoon": ["場所1", "場所2"],
                "evening": ["場所1", "場所2"],
                "night": ["自宅"]
            },
            "home": {
                "name": "名前の家",
                "x": 整数,
                "z": 整数,
                "color": "0x" + Math.floor(Math.random()*16777215).toString(16)
            }
        }`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "あなたは自律的なエージェントの性格生成システムです。必ず有効なJSON形式のみを出力し、余分な説明やテキストは含めないでください。"
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API呼び出しに失敗しました');
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('APIからの応答が不正です');
        }

        // レスポンスからJSONを抽出
        const content = data.choices[0].message.content;
        let jsonStr = content;
        
        // JSONの開始と終了を探す
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}') + 1;
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
            jsonStr = content.substring(jsonStart, jsonEnd);
        }

        // 不完全なJSONを補完
        if (!jsonStr.endsWith('}')) {
            jsonStr += '}';
        }

        // 自宅情報が欠けている場合は追加
        if (!jsonStr.includes('"home"')) {
            const homeInfo = {
                name: JSON.parse(jsonStr).name + "の家",
                x: Math.floor(Math.random() * 41) - 20,
                z: Math.floor(Math.random() * 41) - 20,
                color: "0x" + Math.floor(Math.random()*16777215).toString(16)
            };
            jsonStr = jsonStr.slice(0, -1) + ',"home":' + JSON.stringify(homeInfo) + '}';
        }

        // JSONのパースを試みる
        let agentData;
        try {
            agentData = JSON.parse(jsonStr);
            console.log('生成されたエージェントデータ:', agentData);
        } catch (parseError) {
            console.error('JSONパースエラー:', parseError);
            console.error('パースしようとしたJSON:', jsonStr);
            throw new Error('生成されたデータの形式が不正です');
        }

        // データの検証
        if (!validateAgentData(agentData)) {
            throw new Error('生成されたデータが要件を満たしていません');
        }

        // 新しいエージェントを作成
        const agent = new Agent(agentData, agents.length);
        agents.push(agent);
        
        // 既存のエージェントとの関係を初期化
        agent.initializeRelationships();
        
        // エージェントの自宅を作成
        createAgentHome(agentData.home);
        
        // UIを更新
        updateAgentInfo();
        
        addLog(`👤 新しいエージェント「${agentData.name}」が生成されました`, 'info', `
            <div class="log-detail-section">
                <h4>エージェントの詳細</h4>
                <p>名前: ${agentData.name}</p>
                <p>年齢: ${agentData.age}歳</p>
                <p>性格: ${agentData.personality.description}</p>
                <p>性格特性:</p>
                <ul>
                    <li>社交性: ${(agentData.personality.traits.sociability * 100).toFixed(0)}%</li>
                    <li>活動的さ: ${(agentData.personality.traits.energy * 100).toFixed(0)}%</li>
                    <li>ルーチン重視: ${(agentData.personality.traits.routine * 100).toFixed(0)}%</li>
                    <li>好奇心: ${(agentData.personality.traits.curiosity * 100).toFixed(0)}%</li>
                    <li>共感性: ${(agentData.personality.traits.empathy * 100).toFixed(0)}%</li>
                </ul>
            </div>
        `);

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

