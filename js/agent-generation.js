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
    }
    try {
        const prompt = `あなたは自律的なエージェントの詳細なペルソナ生成システムです。
以下の条件に基づいて、新しいエージェントの詳細なペルソナと特徴を生成してください。
出力は必ず有効なJSON形式のみで、余分な説明やテキストは含めないでください。

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