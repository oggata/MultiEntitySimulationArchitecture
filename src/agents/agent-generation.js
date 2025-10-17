// エージェント生成関数
async function generateNewAgent() {
    // シミュレーション開始前でもエージェント生成を許可（初期エージェント作成のため）
    // ただし、APIキーは必要
    
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
        alert('APIキーを入力してください');
        return;
    }

    // 生成中のメッセージを表示
    const generationStatus = document.getElementById('generationStatus');
    const generationMessage = document.getElementById('generationMessage');
    const generationProgress = document.getElementById('generationProgress');
    const generateAgentBtn = document.getElementById('generateAgentBtn');
    const generateMultipleAgentsBtn = document.getElementById('generateMultipleAgentsBtn');
    
    generationStatus.style.display = 'block';
    generationMessage.textContent = 'エージェントを生成中...';
    generationProgress.textContent = 'LLMにリクエスト中...';
    generateAgentBtn.disabled = true;
    generateMultipleAgentsBtn.disabled = true;
    // APIプロバイダーによってバリデーションを分岐
    const provider = window.getSelectedApiProvider ? window.getSelectedApiProvider() : 'openai';
    if (provider === 'openai') {
        if (!(apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'))) {
            alert('無効なOpenAI APIキー形式です。sk-またはsk-proj-で始まる有効なAPIキーを入力してください。');
            return;
        }
    } else if (provider === 'gemini') {
        // GeminiのAPIキーは任意の形式を許可
        if (!apiKey || apiKey.trim() === '') {
            alert('Gemini APIキーを入力してください。');
            return;
        }
    } else if (provider === 'ollama') {
        // Ollamaの場合はURLとモデル名をチェック
        const ollamaUrl = document.getElementById('ollamaUrl') ? document.getElementById('ollamaUrl').value.trim() : '';
        const ollamaModel = document.getElementById('ollamaModel') ? document.getElementById('ollamaModel').value.trim() : '';
        
        if (!ollamaUrl || !ollamaModel) {
            alert('Ollama URLとモデル名を入力してください。');
            return;
        }
    }
    try {
        // ユーザーの希望条件を取得
        const customPrompt = document.getElementById('agentCustomPrompt').value.trim();
        let userRequirements = '';
        
        if (customPrompt) {
            userRequirements = `

ユーザーの希望条件：
${customPrompt}

上記の希望条件を考慮して、より適切なエージェントを生成してください。希望条件が具体的な場合は、それに合わせて調整してください。`;
        }
        
        const prompt = `あなたは自律的なエージェントの詳細なペルソナ生成システムです。
以下の条件に基づいて、新しいエージェントの詳細なペルソナと特徴を生成してください。
出力は必ず有効なJSON形式のみで、余分な説明やテキストは含めないでください。${userRequirements}

条件：
1. 名前（日本語の一般的な苗字と名前の組み合わせ、例：田中太郎、佐藤花子など）
2. 年齢（20-70歳の範囲の整数）
3. 出身地（日本の都道府県、または海外の国名）
4. 学歴（最終学歴、大学名や専門学校名など具体的に）
5. 職業経歴（過去の仕事や現在の職業、職種を具体的に）
6. 趣味・嗜好（3-5個の具体的な趣味）
7. 宗教・信仰（無宗教、仏教、キリスト教、神道など、または具体的な宗派）
8. 家族構成（配偶者の有無、子供の有無、同居家族など）
9. 性格の詳細説明（3-4文程度で詳しく）
10. 性格特性（0-1の範囲の数値、小数点以下2桁まで）：
    - 社交性（sociability）
    - 活動的さ（energy）
    - ルーチン重視度（routine）
    - 好奇心（curiosity）
    - 共感性（empathy）
    - 責任感（responsibility）
    - 創造性（creativity）
    - 論理的思考（logic）
11. 価値観・信念（人生観や大切にしている価値観）
12. 目標・夢（将来の目標や夢）
13. 日課（各時間帯で2つまでの場所）

有効な場所：
- カフェ
- 公園
- 図書館
- スポーツジム
- 町の広場
- 自宅

出力形式（必ずこの形式のJSONのみを出力）：
{
    "name": "苗字 名前",
    "age": 年齢,
    "background": {
        "birthplace": "出身地",
        "education": "学歴",
        "career": "職業経歴",
        "hobbies": ["趣味1", "趣味2", "趣味3"],
        "religion": "宗教・信仰",
        "family": "家族構成"
    },
    "personality": {
        "description": "性格の詳細説明",
        "traits": {
            "sociability": 0.00,
            "energy": 0.00,
            "routine": 0.00,
            "curiosity": 0.00,
            "empathy": 0.00,
            "responsibility": 0.00,
            "creativity": 0.00,
            "logic": 0.00
        },
        "values": "価値観・信念",
        "goals": "目標・夢"
    },
    "dailyRoutine": {
        "morning": ["場所1", "場所2"],
        "afternoon": ["場所1", "場所2"],
        "evening": ["場所1", "場所2"],
        "night": ["自宅"]
    }
}`;
        generationProgress.textContent = 'LLMにリクエスト中...';
        const content = await callLLM({
            prompt,
            systemPrompt: "あなたは自律的なエージェントの性格生成システムです。必ず有効なJSON形式のみを出力し、余分な説明やテキストは含めないでください。JSONの構文エラーを避けるため、以下の点に注意してください：1) すべての文字列はダブルクォートで囲む、2) 数値はクォートで囲まない、3) 配列の最後の要素の後にカンマを付けない、4) オブジェクトの最後のプロパティの後にカンマを付けない、5) 色コードは必ず'0x'で始まる6桁の16進数にする。",
            maxTokens: 1000,
            temperature: 0.7,
            responseFormat: provider === 'openai' ? { type: "json_object" } : null,
            force: true
        });
        generationProgress.textContent = 'JSONを解析中...';
        // レスポンスからJSONを抽出（より確実な方法）
        let jsonStr = content;
        
        console.log('=== LLMレスポンスの詳細 ===');
        console.log('元のレスポンス:', content);
        console.log('レスポンスの長さ:', content.length);
        console.log('JSONの開始位置:', content.indexOf('{'));
        console.log('JSONの終了位置:', content.lastIndexOf('}'));
        console.log('========================');
        
        // 複数の抽出方法を試行
        let extractionMethods = [
            // 方法1: マークダウンブロックを除去してから抽出
            () => {
                let str = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
                str = str.replace(/```\s*/g, '').replace(/```\s*$/g, '');
                const jsonStart = str.indexOf('{');
                const jsonEnd = str.lastIndexOf('}') + 1;
                if (jsonStart !== -1 && jsonEnd > jsonStart) {
                    return str.substring(jsonStart, jsonEnd);
                }
                return null;
            },
            // 方法2: 直接JSONの開始と終了を探す
            () => {
                const jsonStart = content.indexOf('{');
                const jsonEnd = content.lastIndexOf('}') + 1;
                if (jsonStart !== -1 && jsonEnd > jsonStart) {
                    return content.substring(jsonStart, jsonEnd);
                }
                return null;
            },
            // 方法3: 正規表現でJSONオブジェクトを抽出
            () => {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                return jsonMatch ? jsonMatch[0] : null;
            },
            // 方法4: 複数のJSONオブジェクトがある場合、最も長いものを選択
            () => {
                const jsonMatches = content.match(/\{[\s\S]*?\}/g);
                if (jsonMatches && jsonMatches.length > 0) {
                    return jsonMatches.reduce((longest, current) => 
                        current.length > longest.length ? current : longest
                    );
                }
                return null;
            }
        ];
        
        // 各抽出方法を試行
        for (let i = 0; i < extractionMethods.length; i++) {
            const extracted = extractionMethods[i]();
            if (extracted) {
                try {
                    // 簡単な検証
                    JSON.parse(extracted);
                    jsonStr = extracted;
                    console.log(`JSON抽出成功（方法${i + 1}）:`, jsonStr);
                    break;
                } catch (e) {
                    console.log(`JSON抽出方法${i + 1}でパース失敗:`, e.message);
                    if (i === extractionMethods.length - 1) {
                        // 最後の方法でも失敗した場合、最初の抽出結果を使用
                        jsonStr = extracted;
                        console.log('最後の抽出結果を使用:', jsonStr);
                    }
                }
            }
        }
        
        console.log('抽出されたJSON文字列:', jsonStr);
        
        // 基本的なJSON修正
        jsonStr = jsonStr.trim();
        
        // 末尾のカンマを除去
        jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
        
        // 不完全な色の値を修正
        jsonStr = jsonStr.replace(/"color":\s*"0x"\s*([,}])/g, '"color": "0x' + Math.floor(Math.random()*16777215).toString(16) + '"$1');
        
        // 末尾の修正
        if (!jsonStr.endsWith('}')) {
            jsonStr += '}';
        }
        
        // 複数の閉じ括弧を正規化
        jsonStr = jsonStr.replace(/\s*}\s*}\s*}\s*$/g, '}}}');
        jsonStr = jsonStr.replace(/\s*}\s*}\s*$/g, '}}');
        jsonStr = jsonStr.replace(/\s*}\s*$/g, '}');
        
        // 最終的なJSON検証と修正
        let finalJson = jsonStr;
        let parseSuccess = false;
        
        // 最大5回まで修正を試行
        for (let attempt = 1; attempt <= 5; attempt++) {
            try {
                JSON.parse(finalJson);
                parseSuccess = true;
                jsonStr = finalJson;
                console.log(`JSON修正成功（試行${attempt}回目）`);
                break;
            } catch (parseError) {
                console.log(`JSON修正試行${attempt}回目で失敗:`, parseError.message);
                
                if (attempt === 1) {
                    // 1回目の修正：基本的な修正
                    finalJson = jsonStr.replace(/"color":\s*"([^"]+)"\s*([,}])/g, '"color": "$1"$2');
                    finalJson = finalJson.replace(/\s*$/g, '');
                    if (!finalJson.endsWith('}')) finalJson += '}';
                } else if (attempt === 2) {
                    // 2回目の修正：末尾カンマの除去
                    finalJson = jsonStr.replace(/"color":\s*"([^"]+)"\s*([,}])/g, '"color": "$1"$2');
                    finalJson = finalJson.replace(/,(\s*[}\]])/g, '$1');
                    finalJson = finalJson.replace(/\s*$/g, '');
                    if (!finalJson.endsWith('}')) finalJson += '}';
                } else if (attempt === 3) {
                    // 3回目の修正：不完全な色コードの修正
                    finalJson = jsonStr.replace(/"color":\s*"([^"]+)"\s*([,}])/g, '"color": "$1"$2');
                    finalJson = finalJson.replace(/,(\s*[}\]])/g, '$1');
                    finalJson = finalJson.replace(/"color":\s*"([^"]{1,5})"/g, '"color": "0x$1"');
                    finalJson = finalJson.replace(/"color":\s*"([^"]{6})"/g, '"color": "0x$1"');
                    finalJson = finalJson.replace(/\s*$/g, '');
                    if (!finalJson.endsWith('}')) finalJson += '}';
                } else if (attempt === 4) {
                    // 4回目の修正：複数の閉じ括弧の正規化
                    finalJson = jsonStr.replace(/"color":\s*"([^"]+)"\s*([,}])/g, '"color": "$1"$2');
                    finalJson = finalJson.replace(/,(\s*[}\]])/g, '$1');
                    finalJson = finalJson.replace(/"color":\s*"([^"]{1,5})"/g, '"color": "0x$1"');
                    finalJson = finalJson.replace(/"color":\s*"([^"]{6})"/g, '"color": "0x$1"');
                    finalJson = finalJson.replace(/\s*}\s*$/g, '}');
                    finalJson = finalJson.replace(/\s*}\s*}\s*$/g, '}}');
                    finalJson = finalJson.replace(/\s*}\s*}\s*}\s*$/g, '}}}');
                    if (!finalJson.endsWith('}')) finalJson += '}';
                } else {
                    // 5回目の修正：最後の手段 - より積極的な修正
                    finalJson = jsonStr.replace(/"color":\s*"([^"]+)"\s*([,}])/g, '"color": "$1"$2');
                    finalJson = finalJson.replace(/,(\s*[}\]])/g, '$1');
                    finalJson = finalJson.replace(/"color":\s*"([^"]{1,5})"/g, '"color": "0x$1"');
                    finalJson = finalJson.replace(/"color":\s*"([^"]{6})"/g, '"color": "0x$1"');
                    finalJson = finalJson.replace(/\s*}\s*$/g, '}');
                    finalJson = finalJson.replace(/\s*}\s*}\s*$/g, '}}');
                    finalJson = finalJson.replace(/\s*}\s*}\s*}\s*$/g, '}}}');
                    // 不完全な文字列の修正
                    finalJson = finalJson.replace(/"([^"]*?)\s*$/g, '"$1"');
                    // 不完全な数値の修正
                    finalJson = finalJson.replace(/:\s*(\d+\.?\d*)\s*([,}])/g, ': $1$2');
                    // 不完全な配列の修正
                    finalJson = finalJson.replace(/\[\s*([^\]]*?)\s*$/g, '[$1]');
                    // 不完全なオブジェクトの修正
                    finalJson = finalJson.replace(/\{\s*([^}]*?)\s*$/g, '{$1}');
                    // エスケープされていない文字の修正
                    finalJson = finalJson.replace(/\\/g, '\\\\');
                    finalJson = finalJson.replace(/"/g, '\\"');
                    finalJson = finalJson.replace(/\\"/g, '"');
                    if (!finalJson.endsWith('}')) finalJson += '}';
                }
            }
        }
        
        if (!parseSuccess) {
            console.error('修正前のJSON:', jsonStr);
            console.error('修正後のJSON:', finalJson);
            console.error('元のLLMレスポンス:', content);
            throw new Error('JSONの修正に失敗しました。LLMの応答形式に問題があります。詳細はコンソールを確認してください。');
        }
        
        generationProgress.textContent = 'エージェントを作成中...';
        
        let agentData;
        try {
            agentData = JSON.parse(jsonStr);
            console.log('生成されたエージェントデータ:', agentData);
        } catch (parseError) {
            console.error('JSONパースエラー:', parseError);
            console.error('パースしようとしたJSON:', jsonStr);
            throw new Error('JSONの修正に失敗しました。LLMの応答形式に問題があります。');
        }
        
        // ランダムで自宅を割り当て
        const assignedHome = homeManager.getRandomAvailableHome();
        
        // 座標が範囲外の場合は修正
        if (assignedHome.x < -200 || assignedHome.x > 200 || 
            assignedHome.z < -200 || assignedHome.z > 200) {
            console.warn('自宅の座標が範囲外です。修正します。');
            assignedHome.x = Math.floor(Math.random() * 41) - 20;
            assignedHome.z = Math.floor(Math.random() * 41) - 20;
        }
        
        agentData.home = assignedHome;
        assignedHome.occupant = agentData.name;
        // デバッグ用：生成されたデータを詳細にログ出力
        console.log('=== 生成されたエージェントデータの詳細 ===');
        console.log('名前:', agentData.name);
        console.log('年齢:', agentData.age);
        console.log('背景:', agentData.background);
        console.log('性格:', agentData.personality);
        console.log('日課:', agentData.dailyRoutine);
        console.log('自宅:', agentData.home);
        console.log('=====================================');
        
        if (!validateAgentData(agentData)) {
            console.error('バリデーション失敗の詳細は上記のログを確認してください');
            throw new Error('生成されたデータが要件を満たしていません');
        }
        // 自宅の3Dオブジェクトは既に初期化時に作成済みのため、ここでは作成しない
        
        // エージェントを作成（自宅が確実に存在する状態で）
        const agent = new Agent(agentData, agents.length);
        agents.push(agent);
        agent.initializeRelationships();
        updateAgentInfo();
        addLog(`👤 新しいエージェント「${agentData.name}」が生成されました`, 'info', `\n            <div class="log-detail-section">\n                <h4>エージェントの詳細</h4>\n                <p>名前: ${agentData.name}</p>\n                <p>年齢: ${agentData.age}歳</p>\n                <p>性格: ${agentData.personality.description}</p>\n                <p>性格特性:</p>\n                <ul>\n                    <li>社交性: ${(agentData.personality.traits.sociability * 100).toFixed(0)}%</li>\n                    <li>活動的さ: ${(agentData.personality.traits.energy * 100).toFixed(0)}%</li>\n                    <li>ルーチン重視: ${(agentData.personality.traits.routine * 100).toFixed(0)}%</li>\n                    <li>好奇心: ${(agentData.personality.traits.curiosity * 100).toFixed(0)}%</li>\n                    <li>共感性: ${(agentData.personality.traits.empathy * 100).toFixed(0)}%</li>\n                </ul>\n            </div>\n        `);
        
        // エージェント情報をlocalStorageに保存
        agentStorage.saveAgents();
        
        // ボタンテキストを更新
        updateStorageButtonText();
        
        // 生成完了メッセージを表示
        generationMessage.textContent = `✅ エージェント「${agentData.name}」の生成が完了しました！`;
        generationProgress.textContent = '';
        
        // テキストエリアをクリア
        const agentCustomPrompt = document.getElementById('agentCustomPrompt');
        if (agentCustomPrompt) {
            agentCustomPrompt.value = '';
        }
        
        // 3秒後にメッセージを非表示
        setTimeout(() => {
            generationStatus.style.display = 'none';
            generateAgentBtn.disabled = false;
            generateMultipleAgentsBtn.disabled = false;
        }, 3000);
        
        // ボタンテキストを更新
        updateStorageButtonText();
        
        // シミュレーション開始ボタンの状態を更新
        if (typeof window.updateSimulationButton === 'function') {
            window.updateSimulationButton();
        }
    } catch (error) {
        console.error('エージェント生成エラー:', error);
        
        // エラーメッセージを表示
        generationMessage.textContent = '❌ エージェントの生成に失敗しました';
        generationProgress.textContent = error.message;
        
        // テキストエリアをクリア
        const agentCustomPrompt = document.getElementById('agentCustomPrompt');
        if (agentCustomPrompt) {
            agentCustomPrompt.value = '';
        }
        
        // 活動ログにエラーを記録
        addLog(`❌ エージェントの生成に失敗しました: ${error.message}`, 'error');
        
        // 5秒後にメッセージを非表示
        setTimeout(() => {
            generationStatus.style.display = 'none';
            generateAgentBtn.disabled = false;
            generateMultipleAgentsBtn.disabled = false;
        }, 5000);
    }
}

// 複数のエージェントを生成する関数
async function generateMultipleAgents(count) {
    // シミュレーション開始前でもエージェント生成を許可（初期エージェント作成のため）
    // ただし、APIキーは必要
    
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
        alert('APIキーを入力してください');
        return;
    }

    // 生成中のメッセージを表示
    const generationStatus = document.getElementById('generationStatus');
    const generationMessage = document.getElementById('generationMessage');
    const generationProgress = document.getElementById('generationProgress');
    const generateAgentBtn = document.getElementById('generateAgentBtn');
    const generateMultipleAgentsBtn = document.getElementById('generateMultipleAgentsBtn');
    
    generationStatus.style.display = 'block';
    generationMessage.textContent = `${count}人のエージェントを生成中...`;
    generationProgress.textContent = `進捗: 0/${count}`;
    generateAgentBtn.disabled = true;
    generateMultipleAgentsBtn.disabled = true;

    try {
        for (let i = 0; i < count; i++) {
            try {
                // 進捗を更新
                generationProgress.textContent = `進捗: ${i + 1}/${count}`;
                
                await generateNewAgent();
                
                // 少し待機してから次のエージェントを生成
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`${i + 1}番目のエージェント生成エラー:`, error);
                // エラーが発生しても続行
            }
        }
        
        addLog(`🎉 ${count}人の新しいエージェントが生成されました`, 'info', `
            <div class="log-detail-section">
                <h4>一括生成完了</h4>
                <p>生成されたエージェント数: ${count}人</p>
                <p>現在のエージェント総数: ${agents.length}人</p>
            </div>
        `);
        
        // エージェント情報をlocalStorageに保存
        agentStorage.saveAgents();
        
        // ボタンテキストを更新
        updateStorageButtonText();
        
        // 生成完了メッセージを表示
        generationMessage.textContent = `✅ ${count}人のエージェントの生成が完了しました！`;
        generationProgress.textContent = `現在のエージェント総数: ${agents.length}人`;
        
        // テキストエリアをクリア
        const agentCustomPrompt = document.getElementById('agentCustomPrompt');
        if (agentCustomPrompt) {
            agentCustomPrompt.value = '';
        }
        
        // 3秒後にメッセージを非表示
        setTimeout(() => {
            generationStatus.style.display = 'none';
            generateAgentBtn.disabled = false;
            generateMultipleAgentsBtn.disabled = false;
        }, 3000);
        
    } catch (error) {
        console.error('一括エージェント生成エラー:', error);
        
        // エラーメッセージを表示
        generationMessage.textContent = '❌ エージェントの一括生成に失敗しました';
        generationProgress.textContent = error.message;
        
        // テキストエリアをクリア
        const agentCustomPrompt = document.getElementById('agentCustomPrompt');
        if (agentCustomPrompt) {
            agentCustomPrompt.value = '';
        }
        
        // 5秒後にメッセージを非表示
        setTimeout(() => {
            generationStatus.style.display = 'none';
            generateAgentBtn.disabled = false;
            generateMultipleAgentsBtn.disabled = false;
        }, 5000);
        
        alert('エージェントの一括生成に失敗しました: ' + error.message);
    }
}

// エージェントデータの検証関数
function validateAgentData(data) {
    const requiredFields = [
        'name', 'age', 'background', 'personality', 'dailyRoutine', 'home'
    ];
    
    const requiredBackgroundFields = [
        'birthplace', 'education', 'career', 'hobbies', 'religion', 'family'
    ];
    
    const requiredTraits = [
        'sociability', 'energy', 'routine', 'curiosity', 'empathy'
    ];
    
    const requiredPersonalityFields = [
        'description', 'traits', 'values', 'goals'
    ];
    
    const requiredRoutines = [
        'morning', 'afternoon', 'evening', 'night'
    ];
    
    const requiredHomeFields = [
        'name', 'x', 'z', 'color'
    ];
    
    // 基本的な場所リスト（必須）
    const basicLocations = [
        'カフェ', '公園', '図書館', 'スポーツジム', '町の広場', '自宅', '会社', 'オフィス', '学校', '大学', '病院', 'クリニック', 'スーパーマーケット', 'コンビニ', 'レストラン', '居酒屋', '美容院', '理容室', '銀行', '郵便局', '駅', 'バス停', '映画館', 'ゲームセンター', 'カラオケ', '温泉', '銭湯', '神社', '寺院', '教会', 'モール', 'ショッピングセンター', 'デパート', '書店', '花屋', 'パン屋', '肉屋', '魚屋', '八百屋', '薬局', 'ドラッグストア', 'ホームセンター', 'ガソリンスタンド', '洗車場', '駐車場', '駐輪場', 'ゴルフ場', 'テニスコート', 'プール', 'ジム', 'ヨガスタジオ', 'ダンススタジオ', '音楽教室', '英会話教室', '塾', '保育園', '幼稚園', '老人ホーム', 'デイサービス', '介護施設', 'リハビリセンター', '歯科医院', '眼科', '耳鼻科', '皮膚科', '内科', '外科', '小児科', '産婦人科', '精神科', '心療内科', '整形外科', '形成外科', '美容外科', '皮膚科', '泌尿器科', '循環器科', '呼吸器科', '消化器科', '神経内科', '脳外科', '心臓血管外科', '胸部外科', '乳腺外科', '甲状腺外科', '内分泌外科', '肝臓外科', '膵臓外科', '大腸外科', '肛門外科', '血管外科', '移植外科', '小児外科', '新生児外科', '胎児外科', '小児泌尿器科', '小児整形外科', '小児形成外科', '小児皮膚科', '小児眼科', '小児耳鼻科', '小児歯科', '小児精神科', '小児心療内科', '小児神経科', '小児循環器科', '小児呼吸器科', '小児消化器科', '小児内分泌科', '小児血液科', '小児腫瘍科', '小児感染症科', '小児アレルギー科', '小児免疫科', '小児腎臓科', '小児肝臓科', '小児膵臓科', '小児大腸科', '小児肛門科', '小児血管科', '小児移植科', '小児新生児科', '小児胎児科',
        // 活動名も場所として許可
        'ジョギング', 'ランニング', 'ウォーキング', '散歩', '料理教室', '料理', '読書', '勉強', '仕事場', '職場', 'オフィス', '会議室', '打ち合わせ', 'ミーティング', 'プレゼンテーション', '研修', 'トレーニング', '練習', '稽古', 'レッスン', '授業', '講義', 'セミナー', 'ワークショップ', 'イベント', 'パーティー', '宴会', '飲み会', '食事会', 'ランチ', 'ディナー', '朝食', '昼食', '夕食', 'お茶', 'コーヒー', 'ティータイム', '休憩', 'リラックス', '瞑想', 'ヨガ', 'ストレッチ', '筋トレ', 'エクササイズ', 'スポーツ', 'テニス', 'ゴルフ', '野球', 'サッカー', 'バスケットボール', 'バレーボール', '卓球', 'バドミントン', 'スイミング', '水泳', 'マラソン', 'トライアスロン', 'サイクリング', '登山', 'ハイキング', 'キャンプ', '釣り', '狩猟', 'ガーデニング', '園芸', '家庭菜園', 'DIY', '手芸', '編み物', '刺繍', '陶芸', '絵画', '写真', 'カメラ', '映画鑑賞', 'テレビ', 'ラジオ', '音楽', '楽器', 'ピアノ', 'ギター', 'バイオリン', 'ドラム', '歌', 'カラオケ', 'ダンス', 'バレエ', 'ジャズダンス', 'ヒップホップ', '社交ダンス', 'ボールルームダンス', 'ラテンダンス', 'ベリーダンス', 'フラメンコ', 'タップダンス', 'コンテンポラリーダンス', 'モダンダンス', 'クラシックバレエ', 'ネオクラシックバレエ', 'ロマンティックバレエ', 'バロックダンス', 'ルネサンスダンス', '中世ダンス', '古代ダンス', '民族舞踊', 'アフリカンダンス', 'アジアンダンス', 'ヨーロッパンダンス', 'アメリカンダンス', '南米ダンス', 'オセアニアダンス', '北極圏ダンス', '砂漠ダンス', '山岳ダンス', '海洋ダンス', '森林ダンス', '草原ダンス', '都市ダンス', '農村ダンス', '漁村ダンス', '鉱山ダンス', '工場ダンス', 'オフィスダンス', '学校ダンス', '病院ダンス', '教会ダンス', '寺院ダンス', '神社ダンス', 'モスクダンス', 'シナゴーグダンス', '教会ダンス', '寺院ダンス', '神社ダンス', 'モスクダンス', 'シナゴーグダンス', '教会ダンス', '寺院ダンス', '神社ダンス', 'モスクダンス', 'シナゴーグダンス'
    ];
    
    // 場所の妥当性をチェックする関数（柔軟なバリデーション）
    function isValidLocation(location) {
        // 基本的な場所リストに含まれている場合はOK
        if (basicLocations.includes(location)) {
            return true;
        }
        
        // 既知の場所パターンにマッチする場合はOK
        const knownPatterns = [
            /.*カフェ.*/, /.*レストラン.*/, /.*店.*/, /.*屋.*/, /.*センター.*/, /.*ジム.*/, /.*教室.*/, /.*学校.*/, /.*大学.*/, /.*病院.*/, /.*クリニック.*/, /.*オフィス.*/, /.*会社.*/, /.*公園.*/, /.*図書館.*/, /.*駅.*/, /.*バス.*/, /.*映画館.*/, /.*ゲーム.*/, /.*カラオケ.*/, /.*温泉.*/, /.*神社.*/, /.*寺院.*/, /.*教会.*/, /.*モール.*/, /.*デパート.*/, /.*スーパー.*/, /.*コンビニ.*/, /.*銀行.*/, /.*郵便局.*/, /.*美容院.*/, /.*理容室.*/, /.*薬局.*/, /.*書店.*/, /.*花屋.*/, /.*パン屋.*/, /.*肉屋.*/, /.*魚屋.*/, /.*八百屋.*/, /.*喫茶店.*/, /.*ラーメン屋.*/, /.*寿司屋.*/, /.*居酒屋.*/, /.*銭湯.*/, /.*ボーリング場.*/, /.*プール.*/, /.*テニス.*/, /.*ゴルフ.*/, /.*野球.*/, /.*サッカー.*/, /.*バスケット.*/, /.*バレーボール.*/, /.*卓球.*/, /.*バドミントン.*/, /.*スイミング.*/, /.*水泳.*/, /.*マラソン.*/, /.*サイクリング.*/, /.*登山.*/, /.*ハイキング.*/, /.*キャンプ.*/, /.*釣り.*/, /.*ガーデニング.*/, /.*園芸.*/, /.*DIY.*/, /.*手芸.*/, /.*編み物.*/, /.*刺繍.*/, /.*陶芸.*/, /.*絵画.*/, /.*写真.*/, /.*カメラ.*/, /.*音楽.*/, /.*楽器.*/, /.*ピアノ.*/, /.*ギター.*/, /.*バイオリン.*/, /.*ドラム.*/, /.*歌.*/, /.*ダンス.*/, /.*バレエ.*/, /.*ヨガ.*/, /.*ストレッチ.*/, /.*筋トレ.*/, /.*エクササイズ.*/, /.*スポーツ.*/, /.*トレーニング.*/, /.*練習.*/, /.*稽古.*/, /.*レッスン.*/, /.*授業.*/, /.*講義.*/, /.*セミナー.*/, /.*ワークショップ.*/, /.*イベント.*/, /.*パーティー.*/, /.*宴会.*/, /.*飲み会.*/, /.*食事会.*/, /.*ランチ.*/, /.*ディナー.*/, /.*朝食.*/, /.*昼食.*/, /.*夕食.*/, /.*お茶.*/, /.*コーヒー.*/, /.*ティータイム.*/, /.*休憩.*/, /.*リラックス.*/, /.*瞑想.*/, /.*読書.*/, /.*勉強.*/, /.*仕事場.*/, /.*職場.*/, /.*会議室.*/, /.*打ち合わせ.*/, /.*ミーティング.*/, /.*プレゼンテーション.*/, /.*研修.*/, /.*料理.*/, /.*料理教室.*/, /.*ジョギング.*/, /.*ランニング.*/, /.*ウォーキング.*/, /.*散歩.*/
        ];
        
        for (const pattern of knownPatterns) {
            if (pattern.test(location)) {
                return true;
            }
        }
        
        // その他の場所も許可（柔軟性を重視）
        console.log(`新しい場所「${location}」を自動的に許可しました`);
        return true;
    }

    // 必須フィールドのチェック
    for (const field of requiredFields) {
        if (!data[field]) {
            console.error(`必須フィールドが不足しています: ${field}`);
            console.error('データ全体:', data);
            return false;
        }
    }

    // 年齢のチェック
    if (typeof data.age !== 'number' || data.age < 20 || data.age > 70) {
        console.error('年齢が不正です');
        return false;
    }

    // 背景情報のチェック（新しい構造に対応）
    if (data.background) {
        for (const field of requiredBackgroundFields) {
            if (!data.background[field]) {
                console.error(`背景情報が不足しています: ${field}`);
                return false;
            }
        }

        // 趣味の配列チェック
        if (!Array.isArray(data.background.hobbies) || data.background.hobbies.length < 3) {
            console.error('趣味が3つ以上必要です');
            return false;
        }
    }

    // 性格情報のチェック（新しい構造に対応）
    if (data.personality) {
        for (const field of requiredPersonalityFields) {
            if (!data.personality[field]) {
                console.error(`性格情報が不足しています: ${field}`);
                return false;
            }
        }
    }

    // 性格特性のチェック（新しい構造に対応）
    if (data.personality.traits) {
        for (const trait of requiredTraits) {
            const value = data.personality.traits[trait];
            if (typeof value !== 'number' || value < 0 || value > 1) {
                console.error(`性格特性が不正です: ${trait}`);
                return false;
            }
        }
    }

    // 日課のチェック（新しい構造に対応）
    if (data.dailyRoutine) {
        for (const routine of requiredRoutines) {
            if (!Array.isArray(data.dailyRoutine[routine])) {
                console.error(`日課が不正です: ${routine}`);
                return false;
            }
            
            // 場所の妥当性チェック（柔軟なバリデーション）
            for (const location of data.dailyRoutine[routine]) {
                if (!isValidLocation(location)) {
                    console.error(`不正な場所が指定されています: ${location}`);
                    return false;
                }
            }
        }
    }

    // 自宅情報のチェック（新しい構造に対応）
    if (data.home) {
        for (const field of requiredHomeFields) {
            if (!data.home[field]) {
                console.error(`自宅情報が不足しています: ${field}`);
                return false;
            }
        }

        // 座標の範囲チェック（より広い範囲を許可）
        if (typeof data.home.x !== 'number' || typeof data.home.z !== 'number' ||
            data.home.x < -200 || data.home.x > 200 ||
            data.home.z < -200 || data.home.z > 200) {
            console.error('自宅の座標が不正です');
            console.error('座標値:', { x: data.home.x, z: data.home.z });
            return false;
        }
    }

    return true;
}

// デバッグ用エージェントを一括読み込み
async function loadDebugAgents() {
    if (!confirm('デバッグ用エージェント30人を作成します。\n既存のエージェントは削除されます。\nよろしいですか？')) {
        return;
    }

    // 既存のエージェントをクリア
    clearAllAgents();

    const generationStatus = document.getElementById('generationStatus');
    const generationMessage = document.getElementById('generationMessage');
    const generationProgress = document.getElementById('generationProgress');
    const loadDebugAgentsBtn = document.getElementById('loadDebugAgentsBtn');
    
    generationStatus.style.display = 'block';
    generationMessage.textContent = 'デバッグ用エージェントを読み込み中...';
    generationProgress.textContent = '';
    loadDebugAgentsBtn.disabled = true;

    try {
        // JSONファイルを読み込み
        const response = await fetch('./debug-agents.json');
        if (!response.ok) {
            throw new Error('debug-agents.jsonの読み込みに失敗しました');
        }
        const debugAgents = await response.json();

        // 各エージェントを生成
        for (let i = 0; i < debugAgents.length; i++) {
            const agentData = debugAgents[i];
            generationProgress.textContent = `${i + 1} / ${debugAgents.length} 人目を作成中...`;

            // 自宅を割り当て
            const assignedHome = homeManager.getRandomAvailableHome();
            if (!assignedHome) {
                console.error(`エージェント「${agentData.name}」に自宅を割り当てできませんでした。`);
                continue;
            }
            
            assignedHome.occupant = agentData.name;

            // エージェントデータを構築
            const fullAgentData = {
                name: agentData.name,
                age: agentData.age,
                background: {
                    birthplace: "日本",
                    education: generateEducation(agentData.age, agentData.occupation),
                    career: agentData.occupation,
                    hobbies: agentData.interests,
                    religion: "特になし",
                    family: generateFamilyInfo(agentData.age)
                },
                personality: {
                    description: agentData.personality,
                    traits: generatePersonalityTraits(agentData.personality, agentData.occupation),
                    values: generateValues(agentData.personality),
                    goals: generateGoals(agentData.occupation, agentData.age)
                },
                dailyRoutine: generateDefaultDailyRoutine(agentData.occupation),
                home: assignedHome,
                color: Math.random() * 0xffffff  // ランダムな色
            };

            // エージェントを作成
            const agent = new Agent(fullAgentData, agents.length);
            agents.push(agent);

            // 少し待機（アニメーション効果）
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // エージェント情報を更新
        updateAgentInfo();

        generationMessage.textContent = `✅ ${debugAgents.length}人のデバッグ用エージェントを作成しました！`;
        generationProgress.textContent = 'シミュレーションを開始してください';
        
        // 3秒後にメッセージを消す
        setTimeout(() => {
            generationStatus.style.display = 'none';
        }, 3000);

        addLog(`🐛 デバッグ用エージェント${debugAgents.length}人を作成しました`, 'system');

    } catch (error) {
        console.error('デバッグエージェントの読み込みエラー:', error);
        generationMessage.textContent = '❌ エラーが発生しました';
        generationProgress.textContent = error.message;
        
        setTimeout(() => {
            generationStatus.style.display = 'none';
        }, 5000);
    } finally {
        loadDebugAgentsBtn.disabled = false;
    }
}

// 年齢と職業から学歴を生成
function generateEducation(age, occupation) {
    const educationMap = {
        '医師': '医学部卒業',
        '看護師': '看護専門学校卒業',
        '教師': '教育学部卒業',
        '建築士': '工学部建築学科卒業',
        '薬剤師': '薬学部卒業',
        '会計士': '商学部卒業、公認会計士資格取得',
        '税理士': '商学部卒業、税理士資格取得',
        '警察官': '警察学校卒業',
        '消防士': '消防学校卒業',
        'エンジニア': '工学部卒業',
        'システムエンジニア': '情報工学部卒業',
        'デザイナー': '芸術大学卒業',
        'イラストレーター': '美術大学卒業',
        '大学生': '大学在学中',
        'フリーター': '高校卒業'
    };
    
    return educationMap[occupation] || (age >= 22 ? '大学卒業' : '高校卒業');
}

// 年齢から家族構成を生成
function generateFamilyInfo(age) {
    if (age < 25) {
        return '両親と同居または一人暮らし';
    } else if (age < 35) {
        return Math.random() > 0.5 ? '独身' : '配偶者と二人暮らし';
    } else if (age < 50) {
        return Math.random() > 0.3 ? '配偶者と子供' : '配偶者と二人暮らし';
    } else {
        return Math.random() > 0.4 ? '配偶者と子供（独立した子供もいる）' : '配偶者と二人暮らし';
    }
}

// 性格から価値観を生成
function generateValues(personalityDescription) {
    const desc = personalityDescription.toLowerCase();
    const values = [];
    
    if (desc.includes('真面目') || desc.includes('責任感')) {
        values.push('誠実さ');
        values.push('責任');
    }
    if (desc.includes('社交') || desc.includes('明るい')) {
        values.push('人間関係');
        values.push('コミュニケーション');
    }
    if (desc.includes('創造') || desc.includes('芸術')) {
        values.push('創造性');
        values.push('自己表現');
    }
    if (desc.includes('優し') || desc.includes('思いやり')) {
        values.push('思いやり');
        values.push('他者への配慮');
    }
    if (desc.includes('挑戦') || desc.includes('好奇心')) {
        values.push('成長');
        values.push('チャレンジ精神');
    }
    
    // 最低2つの価値観を保証
    if (values.length < 2) {
        values.push('家族');
        values.push('健康');
    }
    
    return values.slice(0, 3).join('、');
}

// 職業と年齢から目標を生成
function generateGoals(occupation, age) {
    const goalMap = {
        '会社員': '昇進してマネージャーになる',
        '看護師': '患者に寄り添える看護師になる',
        '教師': '生徒たちの成長を支える',
        '医師': '多くの患者を救う名医になる',
        'エンジニア': '革新的なシステムを開発する',
        'デザイナー': '人々の心に残る作品を創る',
        '料理人': '自分の店を持つ',
        '営業': 'トップセールスになる',
        'スポーツインストラクター': '多くの人に健康を届ける',
        'ピアノ教師': '生徒を一流の演奏家に育てる',
        '大学生': '将来の夢を見つける',
        'フリーター': '自分の道を見つける'
    };
    
    let goal = goalMap[occupation] || '充実した人生を送る';
    
    // 年齢による目標の調整
    if (age > 50) {
        goal = '経験を活かして後進を育てる';
    }
    
    return goal;
}

// 性格と職業から性格特性を生成
function generatePersonalityTraits(personalityDescription, occupation) {
    // 性格説明から特性値を推定
    const traits = {
        sociability: 0.5,  // デフォルト値
        energy: 0.5,
        routine: 0.5,
        curiosity: 0.5,
        empathy: 0.5
    };
    
    // 性格説明のキーワードから特性を調整
    const desc = personalityDescription.toLowerCase();
    
    // 社交性
    if (desc.includes('社交的') || desc.includes('明るい') || desc.includes('おしゃべり')) {
        traits.sociability = 0.7 + Math.random() * 0.2;
    } else if (desc.includes('内向') || desc.includes('物静か') || desc.includes('静か')) {
        traits.sociability = 0.2 + Math.random() * 0.2;
    }
    
    // 活動的さ
    if (desc.includes('活発') || desc.includes('元気') || desc.includes('活動的') || desc.includes('行動力')) {
        traits.energy = 0.7 + Math.random() * 0.2;
    } else if (desc.includes('穏やか') || desc.includes('落ち着') || desc.includes('ゆったり')) {
        traits.energy = 0.2 + Math.random() * 0.2;
    }
    
    // ルーチン重視
    if (desc.includes('几帳面') || desc.includes('真面目') || desc.includes('計画的') || desc.includes('責任感')) {
        traits.routine = 0.7 + Math.random() * 0.2;
    } else if (desc.includes('自由') || desc.includes('楽観') || desc.includes('奔放')) {
        traits.routine = 0.2 + Math.random() * 0.2;
    }
    
    // 好奇心
    if (desc.includes('好奇心') || desc.includes('挑戦') || desc.includes('創造') || desc.includes('知的')) {
        traits.curiosity = 0.7 + Math.random() * 0.2;
    } else if (desc.includes('保守') || desc.includes('慎重')) {
        traits.curiosity = 0.2 + Math.random() * 0.2;
    }
    
    // 共感性
    if (desc.includes('優しい') || desc.includes('思いやり') || desc.includes('共感') || desc.includes('面倒見')) {
        traits.empathy = 0.7 + Math.random() * 0.2;
    } else if (desc.includes('冷静') || desc.includes('論理')) {
        traits.empathy = 0.3 + Math.random() * 0.2;
    }
    
    // 職業による調整
    const occupationTraits = {
        '看護師': { empathy: 0.8, sociability: 0.7 },
        '教師': { empathy: 0.7, sociability: 0.7, routine: 0.7 },
        '保育士': { empathy: 0.9, sociability: 0.8, energy: 0.8 },
        '医師': { routine: 0.8, curiosity: 0.7 },
        '警察官': { routine: 0.8, energy: 0.7 },
        '消防士': { energy: 0.9, routine: 0.8 },
        'エンジニア': { curiosity: 0.8, routine: 0.7 },
        'デザイナー': { curiosity: 0.9, empathy: 0.6 },
        'イラストレーター': { curiosity: 0.8, empathy: 0.7 },
        'カフェ店員': { sociability: 0.7, empathy: 0.6 },
        '営業': { sociability: 0.9, energy: 0.7 },
        'スポーツインストラクター': { energy: 0.9, sociability: 0.8 },
        'ピアノ教師': { empathy: 0.7, routine: 0.7 }
    };
    
    if (occupationTraits[occupation]) {
        Object.assign(traits, occupationTraits[occupation]);
    }
    
    // 値を0-1の範囲に制限
    for (const key in traits) {
        traits[key] = Math.max(0, Math.min(1, traits[key]));
    }
    
    return traits;
}

// 職業に応じたデフォルトの日課を生成
function generateDefaultDailyRoutine(occupation) {
    const routines = {
        '会社員': '朝7時に起床し、8時に出勤。午前中はデスクワーク、昼休みはカフェでランチ。午後は会議や資料作成。18時に退社し、帰宅後は夕食を取り、趣味の時間を過ごす。23時に就寝。',
        '看護師': '朝6時に起床し、病院へ出勤。午前中は患者のケアや薬の準備。昼休みは病院内の食堂で食事。午後も引き続き患者のケア。17時に退勤し、帰宅後はリラックスタイム。22時に就寝。',
        '大学生': '朝8時に起床し、大学へ。午前中は講義を受け、昼休みは学食で友人と食事。午後も講義や図書館で勉強。夕方はサークル活動やアルバイト。帰宅後は夕食を取り、深夜まで勉強や趣味。1時に就寝。',
        '主婦': '朝6時に起床し、朝食の準備と家事。午前中は買い物や洗濯、掃除。昼は自宅で軽く食事。午後は地域のボランティアや趣味の時間。夕方は夕食の準備。家族と食事後、片付けを済ませて22時に就寝。',
        '教師': '朝6時30分に起床し、学校へ出勤。午前中は授業や生徒指導。昼休みは職員室で昼食。午後も授業や部活動の指導。17時に退勤し、帰宅後は授業の準備や採点。22時30分に就寝。',
        'デザイナー': '朝8時に起床し、出勤。午前中はクライアントとの打ち合わせやデザイン作業。昼はおしゃれなカフェでランチ。午後も引き続きデザイン作業。19時に退社し、帰宅後は趣味の時間。24時に就寝。',
        '自営業': '朝7時に起床し、店舗へ。午前中は仕入れや店の準備。昼休みは軽く食事。午後は接客や経理作業。18時に閉店し、帰宅後は夕食と家族との時間。23時に就寝。',
        'カフェ店員': '朝8時に起床し、カフェへ出勤。午前中は開店準備と接客。昼は交代で休憩。午後も接客とコーヒーの提供。17時に退勤し、帰宅後は趣味の時間。23時に就寝。',
        'エンジニア': '朝9時に起床し、出勤またはリモートワーク。午前中はコーディングや設計。昼は自宅やオフィスで食事。午後も開発作業や会議。19時に業務終了。夕食後は技術書を読んだり、個人プロジェクト。1時に就寝。',
        '保育士': '朝6時30分に起床し、保育園へ出勤。午前中は子供たちと遊びや学習。昼は子供たちと一緒に給食。午後も活動や昼寝の時間。17時に退勤し、帰宅後はゆっくり夕食。22時に就寝。',
        '医師': '朝6時に起床し、病院へ。午前中は診察や手術。昼は短い休憩で軽食。午後も診察や患者の回診。19時に退勤（緊急時は夜勤も）。帰宅後は医学文献を読んだり、家族との時間。23時30分に就寝。',
        'アパレル店員': '朝9時30分に起床し、店舗へ出勤。午前中は開店準備と接客。昼は交代で休憩。午後も接客やディスプレイの変更。19時に退勤し、帰宅後はSNSチェックや友人との交流。24時に就寝。',
        '消防士': '朝5時30分に起床し、消防署へ。午前中は訓練や装備の点検。昼は署内で食事。午後も訓練や出動準備。17時に退勤（24時間勤務の日も）。帰宅後は筋トレや家族との時間。22時に就寝。',
        'ライター': '朝8時に起床し、自宅やカフェで執筆。午前中は取材や資料収集。昼はカフェでランチ。午後も執筆作業。18時頃に作業終了。夕食後は読書や情報収集。24時に就寝。',
        '料理人': '朝9時に起床し、レストランへ。午前中は仕込みや食材の準備。昼は軽く食事。午後も調理や接客準備。夜は営業で調理。22時に退勤し、帰宅後は軽く夕食。1時に就寝。',
        '美容師': '朝8時30分に起床し、美容室へ出勤。午前中は予約客の施術。昼は交代で休憩。午後も施術や接客。18時に退勤し、帰宅後は趣味の時間。23時30分に就寝。',
        '建築士': '朝8時に起床し、事務所へ出勤。午前中は設計図の作成や打ち合わせ。昼は近くのレストランで食事。午後も設計作業や現場視察。18時に退勤し、帰宅後は建築雑誌を読んだり、趣味の時間。23時に就寝。',
        '薬剤師': '朝8時に起床し、薬局へ出勤。午前中は処方箋の調剤や接客。昼は休憩室で食事。午後も調剤や在庫管理。17時30分に退勤し、帰宅後はヨガや読書。22時30分に就寝。',
        '警察官': '朝6時に起床し、警察署へ出勤。午前中はパトロールや事務作業。昼は署内で食事。午後もパトロールや事件対応。18時に退勤（夜勤もあり）。帰宅後は武道の練習や家族との時間。22時に就寝。',
        '受付': '朝8時に起床し、オフィスへ出勤。午前中は来客対応や電話応対。昼は近くのカフェで食事。午後も受付業務や事務作業。17時に退勤し、帰宅後は趣味の時間。23時に就寝。',
        '運送業': '朝5時に起床し、配送センターへ。午前中は荷物の積み込みと配達。昼は車内で簡単に食事。午後も配達業務。17時に業務終了し、帰宅後は疲れを癒す。21時に就寝。',
        '会計士': '朝8時に起床し、事務所へ出勤。午前中は帳簿の確認や税務処理。昼は近くのレストランで食事。午後も会計業務や顧客との打ち合わせ。18時に退勤し、帰宅後は資格勉強や趣味の時間。23時に就寝。',
        'フリーター': '朝10時に起床し、アルバイト先へ。午前中は接客や作業。昼は休憩で軽食。午後も業務。17時に退勤し、帰宅後はバンド練習や友人と遊ぶ。深夜1時に就寝。',
        '営業': '朝7時30分に起床し、出勤。午前中は顧客訪問や商談。昼は外出先で食事。午後も営業活動や資料作成。18時30分に退勤し、帰宅後は軽く運動や夕食。23時に就寝。',
        '税理士': '朝8時に起床し、事務所へ出勤。午前中は税務申告書の作成や相談業務。昼は近くのレストランで食事。午後も税務業務や顧客対応。18時に退勤し、帰宅後は囲碁や園芸。22時30分に就寝。',
        '図書館司書': '朝8時30分に起床し、図書館へ出勤。午前中は本の整理や貸出業務。昼は休憩室で食事。午後も業務や読書会の準備。17時に退勤し、帰宅後は読書や音楽鑑賞。22時に就寝。',
        'システムエンジニア': '朝9時に起床し、リモートワークまたは出勤。午前中はシステム開発や設計。昼は自宅やオフィスで食事。午後も開発作業や会議。19時に業務終了。夕食後は趣味のゲーム開発。1時に就寝。',
        'イラストレーター': '朝9時に起床し、自宅のスタジオで作業。午前中はイラスト制作や打ち合わせ。昼はカフェでランチ。午後も制作作業。18時頃に作業終了。夕食後は漫画を読んだり、カフェ巡り。24時に就寝。',
        'スポーツインストラクター': '朝6時に起床し、ジムへ出勤。午前中はトレーニング指導や自主トレ。昼は健康的な食事。午後もレッスンやカウンセリング。18時に退勤し、帰宅後は栄養学の勉強。22時に就寝。',
        'ピアノ教師': '朝8時に起床し、自宅または教室へ。午前中はレッスンや練習。昼は軽く食事。午後もレッスンや発表会の準備。17時に終了し、帰宅後はコンサート鑑賞や読書。22時30分に就寝。'
    };

    return routines[occupation] || '朝8時に起床し、仕事へ。午前中は業務をこなし、昼休みは食事。午後も業務を続け、18時に退勤。帰宅後は夕食を取り、趣味の時間を過ごす。23時に就寝。';
} 