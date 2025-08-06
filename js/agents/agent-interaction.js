// エージェント間の相互作用機能

// 相互作用の種類を取得
function getInteractionTypes(relationship) {
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

// 相互作用を実行
async function performInteraction(agent, otherAgent, interactionType) {
    // 一時停止中はLLM APIコールをスキップ
    if (!simulationRunning || simulationPaused) return;
    
    try {
        const themeContext = AgentUtils.getTopicPrompt();
        
        const prompt = `\nあなたは${agent.name}という${agent.age}歳の${agent.personality.description}です。\n現在${agent.currentLocation.name}にいて、${otherAgent.name}さんと${interactionType}をしています。\n\nあなたの性格特性:\n- 社交性: ${agent.personality.traits.sociability}\n- 活動的さ: ${agent.personality.traits.energy}\n- ルーチン重視: ${agent.personality.traits.routine}\n- 好奇心: ${agent.personality.traits.curiosity}\n- 共感性: ${agent.personality.traits.empathy}\n\n相手との関係:\n- 親密度: ${agent.relationships.get(otherAgent.name).familiarity}\n- 好感度: ${agent.relationships.get(otherAgent.name).affinity}${themeContext}\n\nこの状況で、自然な会話を生成してください。1-2文程度の短い会話にしてください。\n`;
        
        const message = await AgentUtils.callLLMWithFallback(
            prompt,
            "あなたは自律的なエージェントの会話システムです。与えられた状況に基づいて、自然な会話を生成してください。",
            100,
            0.7
        );
        
        if (message) {
            // 行動履歴を記録
            agent.recordAction('interaction', otherAgent.name, `${interactionType}: "${message}"`);
            
            agent.currentThought = message;
            AgentUtils.logAgentAction(agent, 'interaction', `💬 ${agent.name} → ${otherAgent.name}: "${message}"`);
            agent.addMemory(`${otherAgent.name}と${interactionType}をした`, "interaction");
            
            // 相手の反応
            setTimeout(async () => {
                if (!simulationRunning || simulationPaused) return;
                
                if (otherAgent && !otherAgent.isThinking) {
                    const responsePrompt = `\nあなたは${otherAgent.name}という${otherAgent.age}歳の${otherAgent.personality.description}です。\n${agent.name}さんから「${message}」と言われました。\n\nあなたの性格特性:\n- 社交性: ${otherAgent.personality.traits.sociability}\n- 活動的さ: ${otherAgent.personality.traits.energy}\n- ルーチン重視: ${otherAgent.personality.traits.routine}\n- 好奇心: ${otherAgent.personality.traits.curiosity}\n- 共感性: ${otherAgent.personality.traits.empathy}\n\n相手との関係:\n- 親密度: ${otherAgent.relationships.get(agent.name).familiarity}\n- 好感度: ${otherAgent.relationships.get(agent.name).affinity}${themeContext}\n\nこの状況で、自然な返答を生成してください。1-2文程度の短い返答にしてください。\n`;
                    
                    const responseMessage = await AgentUtils.callLLMWithFallback(
                        responsePrompt,
                        "あなたは自律的なエージェントの会話システムです。与えられた状況に基づいて、自然な返答を生成してください。",
                        100,
                        0.7
                    );
                    
                    if (responseMessage) {
                        otherAgent.currentThought = responseMessage;
                        AgentUtils.logAgentAction(otherAgent, 'interaction', `💬 ${otherAgent.name} → ${agent.name}: "${responseMessage}"`);
                    } else {
                        const fallbackResponse = AgentUtils.getFallbackMessage('response', otherAgent.name, agent.name);
                        otherAgent.currentThought = fallbackResponse;
                        AgentUtils.logAgentAction(otherAgent, 'interaction', `💬 ${otherAgent.name} → ${agent.name}: "${fallbackResponse}"`);
                    }
                }
            }, 2000);
        } else {
            // LLM呼び出し失敗時のフォールバック
            const message = AgentUtils.getFallbackMessage(interactionType, agent.name, otherAgent.name);
            agent.currentThought = message;
            AgentUtils.logAgentAction(agent, 'interaction', `💬 ${agent.name} → ${otherAgent.name}: "${message}"`);
        }
    } catch (error) {
        console.error('LLM API呼び出しエラー:', error);
        const message = AgentUtils.getFallbackMessage(interactionType, agent.name, otherAgent.name);
        agent.currentThought = message;
        AgentUtils.logAgentAction(agent, 'interaction', `💬 ${agent.name} → ${otherAgent.name}: "${message}"`);
    }
}

// 街中での相互作用を実行
async function performStreetInteraction(agent, otherAgent) {
    // 一時停止中はLLM APIコールをスキップ
    if (!simulationRunning || simulationPaused) return;
    
    try {
        const themeContext = AgentUtils.getTopicPrompt();
        
        const prompt = `\nあなたは${agent.name}という${agent.age}歳の${agent.personality.description}です。\n街中で${otherAgent.name}さんと偶然出会いました。\n\nあなたの性格特性:\n- 社交性: ${agent.personality.traits.sociability}\n- 活動的さ: ${agent.personality.traits.energy}\n- ルーチン重視: ${agent.personality.traits.routine}\n- 好奇心: ${agent.personality.traits.curiosity}\n- 共感性: ${agent.personality.traits.empathy}\n\n相手との関係:\n- 親密度: ${agent.relationships.get(otherAgent.name).familiarity}\n- 好感度: ${agent.relationships.get(otherAgent.name).affinity}${themeContext}\n\nこの状況で、自然な挨拶や会話を生成してください。1-2文程度の短い会話にしてください。\n`;
        
        const message = await AgentUtils.callLLMWithFallback(
            prompt,
            "あなたは自律的なエージェントの会話システムです。街中での偶然の出会いで、自然な挨拶や会話を生成してください。",
            100,
            0.7
        );
        
        if (message) {
            agent.currentThought = message;
            AgentUtils.logAgentAction(agent, 'street-interaction', `💬 ${agent.name} → ${otherAgent.name}: "${message}"`);
            agent.addMemory(`街中で${otherAgent.name}と出会った`, "encounter");
            
            // 相手の反応
            setTimeout(async () => {
                if (!simulationRunning || simulationPaused) return;
                
                if (otherAgent && !otherAgent.isThinking) {
                    const responsePrompt = `\nあなたは${otherAgent.name}という${otherAgent.age}歳の${otherAgent.personality.description}です。\n街中で${agent.name}さんと偶然出会い、「${message}」と言われました。\n\nあなたの性格特性:\n- 社交性: ${otherAgent.personality.traits.sociability}\n- 活動的さ: ${otherAgent.personality.traits.energy}\n- ルーチン重視: ${otherAgent.personality.traits.routine}\n- 好奇心: ${otherAgent.personality.traits.curiosity}\n- 共感性: ${otherAgent.personality.traits.empathy}\n\n相手との関係:\n- 親密度: ${otherAgent.relationships.get(agent.name).familiarity}\n- 好感度: ${otherAgent.relationships.get(agent.name).affinity}${themeContext}\n\nこの状況で、自然な返答を生成してください。1-2文程度の短い返答にしてください。\n`;
                    
                    const responseMessage = await AgentUtils.callLLMWithFallback(
                        responsePrompt,
                        "あなたは自律的なエージェントの会話システムです。街中での偶然の出会いで、自然な返答を生成してください。",
                        100,
                        0.7
                    );
                    
                    if (responseMessage) {
                        otherAgent.currentThought = responseMessage;
                        AgentUtils.logAgentAction(otherAgent, 'street-interaction', `💬 ${otherAgent.name} → ${agent.name}: "${responseMessage}"`);
                        otherAgent.addMemory(`街中で${agent.name}と出会った`, "encounter");
                    } else {
                        const fallbackResponse = AgentUtils.getFallbackMessage('street-interaction', otherAgent.name, agent.name);
                        otherAgent.currentThought = fallbackResponse;
                        AgentUtils.logAgentAction(otherAgent, 'street-interaction', `💬 ${otherAgent.name} → ${agent.name}: "${fallbackResponse}"`);
                        otherAgent.addMemory(`街中で${agent.name}と出会った`, "encounter");
                    }
                    
                    // 会話終了後に移動を再開
                    setTimeout(() => {
                        agent.endStreetConversation();
                        otherAgent.endStreetConversation();
                    }, 3000); // 3秒後に会話終了
                }
            }, 2000);
        } else {
            // LLM呼び出し失敗時のフォールバック
            const message = AgentUtils.getFallbackMessage('street-interaction', agent.name, otherAgent.name);
            agent.currentThought = message;
            AgentUtils.logAgentAction(agent, 'street-interaction', `💬 ${agent.name} → ${otherAgent.name}: "${message}"`);
            
            // 会話終了後に移動を再開
            setTimeout(() => {
                agent.endStreetConversation();
                otherAgent.endStreetConversation();
            }, 3000);
        }
        
    } catch (error) {
        console.error('LLM API呼び出しエラー:', error);
        const message = AgentUtils.getFallbackMessage('street-interaction', agent.name, otherAgent.name);
        agent.currentThought = message;
        AgentUtils.logAgentAction(agent, 'street-interaction', `💬 ${agent.name} → ${otherAgent.name}: "${message}"`);
        
        // 会話終了後に移動を再開
        setTimeout(() => {
            agent.endStreetConversation();
            otherAgent.endStreetConversation();
        }, 3000);
    }
}

// 活動を実行
async function performActivity(agent) {
    // 一時停止中はLLM APIコールをスキップ
    if (!simulationRunning || simulationPaused) return;
    
    if (agent.currentActivity) {
        try {
            const themeContext = AgentUtils.getTopicPrompt();
            
            const prompt = `\nあなたは${agent.name}という${agent.age}歳の${agent.personality.description}です。\n現在${agent.currentLocation.name}で${agent.currentActivity}しています。\n\nあなたの性格特性:\n- 社交性: ${agent.personality.traits.sociability}\n- 活動的さ: ${agent.personality.traits.energy}\n- ルーチン重視: ${agent.personality.traits.routine}\n- 好奇心: ${agent.personality.traits.curiosity}\n- 共感性: ${agent.personality.traits.empathy}${themeContext}\n\nこの状況で、あなたが感じていることや考えていることを自然な形で表現してください。\n1-2文程度の短い思考にしてください。\n`;
            
            const thought = await AgentUtils.callLLMWithFallback(
                prompt,
                "あなたは自律的なエージェントの思考システムです。与えられた状況に基づいて、自然な思考を生成してください。",
                100,
                0.7
            );
            
            if (thought) {
                // 行動履歴を記録
                agent.recordAction('activity', agent.currentActivity, `場所: ${agent.currentLocation.name}, 思考: "${thought}"`);
                
                agent.currentThought = thought;
                AgentUtils.logAgentAction(agent, 'activity', `🎯 ${agent.name}は${agent.currentLocation.name}で${agent.currentActivity}いる: "${thought}"`, `
                    <div class="log-detail-section">
                        <h4>活動の詳細</h4>
                        <p>場所: ${agent.currentLocation.name}</p>
                        <p>活動: ${agent.currentActivity}</p>
                        <p>思考: ${agent.currentThought}</p>
                    </div>
                `);
                agent.addMemory(`${agent.currentLocation.name}で${agent.currentActivity}`, "activity");
            } else {
                // LLM呼び出し失敗時のフォールバック
                agent.currentThought = `${agent.currentActivity}いる`;
                AgentUtils.logAgentAction(agent, 'activity', `🎯 ${agent.name}は${agent.currentLocation.name}で${agent.currentActivity}いる`);
                agent.addMemory(`${agent.currentLocation.name}で${agent.currentActivity}`, "activity");
            }
        } catch (error) {
            console.error('LLM API呼び出しエラー:', error);
            agent.currentThought = `${agent.currentActivity}いる`;
            AgentUtils.logAgentAction(agent, 'activity', `🎯 ${agent.name}は${agent.currentLocation.name}で${agent.currentActivity}いる`);
            agent.addMemory(`${agent.currentLocation.name}で${agent.currentActivity}`, "activity");
        }
    }
} 