// 共通ユーティリティ関数
const AgentUtils = {
    // LLM呼び出しの共通化
    async callLLMWithFallback(prompt, systemPrompt, maxTokens = 100, temperature = 0.7) {
        try {
            return await callLLM({
                prompt,
                systemPrompt,
                maxTokens,
                temperature
            });
        } catch (error) {
            console.error('LLM API呼び出しエラー:', error);
            return null;
        }
    },
    
    // ログ記録の共通化
    logAgentAction(agent, actionType, message, details = '') {
        addLog(message, actionType, details);
        if (window.logAgentAction) {
            window.logAgentAction(agent, actionType, details);
        }
    },
    
    // 履歴記録の共通化
    recordHistory(historyArray, data, maxLength = 100) {
        historyArray.push({
            timestamp: new Date(),
            ...data
        });
        
        if (historyArray.length > maxLength) {
            historyArray.shift();
        }
    },
    
    // 関係性更新の共通化
    updateRelationship(agent, otherAgent, interactionType, affinityChange = 0) {
        const relationship = agent.relationships.get(otherAgent.name);
        if (!relationship) return;
        
        const oldAffinity = relationship.affinity;
        relationship.familiarity = Math.min(1, relationship.familiarity + 0.1);
        relationship.affinity = Math.min(1, Math.max(0, relationship.affinity + affinityChange));
        relationship.lastInteraction = new Date();
        relationship.interactionCount++;
        
        // 相手側の関係性も更新
        const otherRelationship = otherAgent.relationships.get(agent.name);
        if (otherRelationship) {
            otherRelationship.familiarity = relationship.familiarity;
            otherRelationship.affinity = relationship.affinity;
            otherRelationship.lastInteraction = relationship.lastInteraction;
            otherRelationship.interactionCount++;
        }
        
        // 大きな変化があった場合のみログ出力
        if (Math.abs(relationship.affinity - oldAffinity) > 0.1) {
            if (window.logRelationshipChange) {
                window.logRelationshipChange(agent, otherAgent, interactionType);
            }
        }
    },
    
    // フォールバックメッセージの生成
    getFallbackMessage(interactionType, agentName, otherAgentName) {
        const fallbackMessages = {
            "挨拶": [
                `${otherAgentName}さん、こんにちは！`,
                `やあ、${otherAgentName}さん。元気？`,
                `${otherAgentName}さん、お久しぶり！`
            ],
            "自己紹介": [
                `初めまして、${agentName}と申します。`,
                `${agentName}です。よろしくお願いします！`,
                `よろしくお願いします！`
            ],
            "天気の話": [
                "今日はいい天気ですね。",
                "最近、過ごしやすい気候ですね。",
                "こんな日は外にいると気持ちいいですね。"
            ],
            "street-interaction": [
                `${otherAgentName}さん、こんにちは！`,
                `やあ、${otherAgentName}さん。偶然ですね。`,
                `${otherAgentName}さん、お久しぶりです！`,
                "こんにちは！"
            ]
        };
        
        const messages = fallbackMessages[interactionType] || ["..."];
        return messages[Math.floor(Math.random() * messages.length)];
    },
    
    // プロンプトテーマの取得
    getTopicPrompt() {
        const topicPrompt = document.getElementById('topicPrompt') ? document.getElementById('topicPrompt').value.trim() : '';
        return topicPrompt ? `\n\n話題のテーマ: ${topicPrompt}\nこのテーマに関連する話題についても話してください。` : '';
    },
    
    // 時間帯の取得
    getTimeOfDay(currentTime) {
        const hour = Math.floor(currentTime / 60);
        if (hour < 6 || hour >= 22) return "night";
        if (hour < 12) return "morning";
        if (hour < 18) return "afternoon";
        return "evening";
    }
};

// APIプロバイダーで切り替えてLLMに問い合わせる共通関数
async function callLLM({ prompt, systemPrompt = '', maxTokens = 150, temperature = 0.7, responseFormat = null, force = false }) {
    // 一時停止中はLLM APIコールをスキップ（ただしforce指定時は許可）
    if (!force && (!simulationRunning || simulationPaused)) {
        throw new Error('シミュレーションが一時停止中のため、LLM APIコールをスキップしました');
    }
    
    const provider = window.getSelectedApiProvider ? window.getSelectedApiProvider() : 'openai';
    const apiKey = document.getElementById('apiKey') ? document.getElementById('apiKey').value.trim() : '';
    
    // ollamaの場合はAPIキーが不要
    if (provider !== 'ollama' && !apiKey) {
        throw new Error('APIキーが入力されていません');
    }

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
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
        
        // systemPromptとpromptを組み合わせてGemini用のプロンプトを作成
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
        
        const body = {
            contents: [
                { role: "user", parts: [{ text: fullPrompt }] }
            ],
            generationConfig: {
                temperature: temperature,
                maxOutputTokens: maxTokens
            }
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        if (!response.ok) {
            console.error('Gemini API エラー:', data);
            throw new Error(data.error?.message || 'Gemini API呼び出しに失敗しました');
        }
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts[0].text) {
            throw new Error('Gemini APIからの応答が不正です');
        }
        
        return data.candidates[0].content.parts[0].text;
    } else if (provider === 'ollama') {
        // Ollama API (ローカル)
        const ollamaUrl = document.getElementById('ollamaUrl') ? document.getElementById('ollamaUrl').value.trim() : 'http://localhost:11434';
        const ollamaModel = document.getElementById('ollamaModel') ? document.getElementById('ollamaModel').value.trim() : 'llama3.2';
        
        if (!ollamaUrl || !ollamaModel) {
            throw new Error('Ollama URLとモデル名を入力してください');
        }
        
        // systemPromptとpromptを組み合わせてOllama用のプロンプトを作成
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
        
        const body = {
            model: ollamaModel,
            prompt: fullPrompt,
            stream: false,
            options: {
                temperature: temperature,
                num_predict: maxTokens
            }
        };
        
        const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        if (!response.ok) {
            console.error('Ollama API エラー:', data);
            throw new Error(data.error || 'Ollama API呼び出しに失敗しました');
        }
        
        if (!data.response) {
            throw new Error('Ollama APIからの応答が不正です');
        }
        
        return data.response;
    } else {
        throw new Error('不明なAPIプロバイダーです');
    }
} 