// 天候システム
class WeatherSystem {
    constructor() {
        this.currentWeather = 'sunny'; // 現在の天候
        this.currentTemperature = 20; // 現在の温度（摂氏）
        this.weatherChangeInterval = 300; // 天候変化間隔（秒）
        this.lastWeatherChange = 0; // 最後に天候が変化した時刻
        this.weatherTypes = {
            sunny: { name: '晴れ', tempRange: [15, 30], color: '#FFD700' },
            cloudy: { name: '曇り', tempRange: [10, 25], color: '#C0C0C0' },
            rainy: { name: '雨', tempRange: [5, 20], color: '#4682B4' },
            snowy: { name: '雪', tempRange: [-5, 10], color: '#F0F8FF' },
            stormy: { name: '雷雨', tempRange: [15, 25], color: '#2F4F4F' },
            foggy: { name: '霧', tempRange: [8, 18], color: '#D3D3D3' }
        };
        
        // 天候の遷移確率（現在の天候 -> 次の天候の確率）
        this.weatherTransitions = {
            sunny: { sunny: 0.6, cloudy: 0.3, rainy: 0.1, snowy: 0, stormy: 0, foggy: 0 },
            cloudy: { sunny: 0.4, cloudy: 0.4, rainy: 0.2, snowy: 0, stormy: 0, foggy: 0 },
            rainy: { sunny: 0.2, cloudy: 0.4, rainy: 0.3, snowy: 0.1, stormy: 0, foggy: 0 },
            snowy: { sunny: 0.1, cloudy: 0.3, rainy: 0.2, snowy: 0.4, stormy: 0, foggy: 0 },
            stormy: { sunny: 0.3, cloudy: 0.4, rainy: 0.2, snowy: 0, stormy: 0.1, foggy: 0 },
            foggy: { sunny: 0.3, cloudy: 0.5, rainy: 0.1, snowy: 0, stormy: 0, foggy: 0.1 }
        };
    }

    // 天候を更新
    update(currentTime) {
        // 天候変化のチェック
        if (currentTime - this.lastWeatherChange >= this.weatherChangeInterval) {
            this.changeWeather();
            this.lastWeatherChange = currentTime;
        }
        
        // 温度の自然変化
        this.updateTemperature();
    }

    // 天候を変更
    changeWeather() {
        const currentWeatherData = this.weatherTransitions[this.currentWeather];
        const random = Math.random();
        let cumulative = 0;
        
        for (const [weather, probability] of Object.entries(currentWeatherData)) {
            cumulative += probability;
            if (random <= cumulative) {
                this.currentWeather = weather;
                break;
            }
        }
        
        // 新しい天候に応じて温度を調整
        this.adjustTemperatureForWeather();
        
        // ログに記録
        const weatherInfo = this.weatherTypes[this.currentWeather];
        addLog(`🌤️ 天候が${weatherInfo.name}に変わりました（${this.currentTemperature}°C）`, 'weather');
    }

    // 天候に応じて温度を調整
    adjustTemperatureForWeather() {
        const weatherData = this.weatherTypes[this.currentWeather];
        const [minTemp, maxTemp] = weatherData.tempRange;
        
        // 現在の温度から新しい範囲内の温度に徐々に調整
        const targetTemp = minTemp + Math.random() * (maxTemp - minTemp);
        this.currentTemperature = Math.round(targetTemp);
    }

    // 温度の自然変化
    updateTemperature() {
        // 時間帯による温度変化
        const hour = Math.floor(currentTime / 60);
        let timeBasedChange = 0;
        
        if (hour >= 6 && hour <= 12) {
            // 朝から昼にかけて温度上昇
            timeBasedChange = 0.1;
        } else if (hour >= 13 && hour <= 18) {
            // 午後は温度維持
            timeBasedChange = 0;
        } else if (hour >= 19 || hour <= 5) {
            // 夜は温度下降
            timeBasedChange = -0.1;
        }
        
        // 天候による温度変化
        let weatherBasedChange = 0;
        switch (this.currentWeather) {
            case 'sunny':
                weatherBasedChange = 0.05;
                break;
            case 'cloudy':
                weatherBasedChange = -0.02;
                break;
            case 'rainy':
                weatherBasedChange = -0.1;
                break;
            case 'snowy':
                weatherBasedChange = -0.15;
                break;
            case 'stormy':
                weatherBasedChange = -0.05;
                break;
            case 'foggy':
                weatherBasedChange = -0.03;
                break;
        }
        
        // 温度を更新
        this.currentTemperature += timeBasedChange + weatherBasedChange;
        
        // 天候に応じた温度範囲内に制限
        const weatherData = this.weatherTypes[this.currentWeather];
        const [minTemp, maxTemp] = weatherData.tempRange;
        this.currentTemperature = Math.max(minTemp, Math.min(maxTemp, this.currentTemperature));
    }

    // 天候表示を更新
    updateWeatherDisplay() {
        const weatherDisplay = document.getElementById('weather-display');
        if (!weatherDisplay) return;
        
        const weatherInfo = this.weatherTypes[this.currentWeather];
        const weatherIcon = this.getWeatherIcon(this.currentWeather);
        
            weatherDisplay.innerHTML = `
        <span class="weather-icon">${weatherIcon}</span>
        <span class="weather-text">${weatherInfo.name}</span>
        <span class="temperature">${Math.round(this.currentTemperature)}°C</span>
    `;
    
    // 天候に応じてアイコンの色を変更
    const iconElement = weatherDisplay.querySelector('.weather-icon');
    if (iconElement) {
        iconElement.style.color = weatherInfo.color;
    }
    }

    // 天候アイコンを取得
    getWeatherIcon(weather) {
        const icons = {
            sunny: '☀️',
            cloudy: '☁️',
            rainy: '🌧️',
            snowy: '❄️',
            stormy: '⛈️',
            foggy: '🌫️'
        };
        return icons[weather] || '🌤️';
    }

    // 現在の天候情報を取得
    getCurrentWeather() {
        return {
            type: this.currentWeather,
            name: this.weatherTypes[this.currentWeather].name,
            temperature: Math.round(this.currentTemperature),
            icon: this.getWeatherIcon(this.currentWeather)
        };
    }

    // 天候による環境効果を適用
    applyWeatherEffects() {
        const weatherInfo = this.weatherTypes[this.currentWeather];
        
        // シーンの背景色を天候に応じて調整
        if (scene) {
            let skyColor;
            let ambientIntensity;
            let directionalIntensity;
            
            switch (this.currentWeather) {
                case 'sunny':
                    skyColor = new THREE.Color(0x87CEEB);
                    ambientIntensity = 0.6;
                    directionalIntensity = 0.8;
                    break;
                case 'cloudy':
                    skyColor = new THREE.Color(0x708090);
                    ambientIntensity = 0.4;
                    directionalIntensity = 0.5;
                    break;
                case 'rainy':
                    skyColor = new THREE.Color(0x2F4F4F);
                    ambientIntensity = 0.3;
                    directionalIntensity = 0.3;
                    break;
                case 'snowy':
                    skyColor = new THREE.Color(0xF0F8FF);
                    ambientIntensity = 0.5;
                    directionalIntensity = 0.4;
                    break;
                case 'stormy':
                    skyColor = new THREE.Color(0x191970);
                    ambientIntensity = 0.2;
                    directionalIntensity = 0.2;
                    break;
                case 'foggy':
                    skyColor = new THREE.Color(0xD3D3D3);
                    ambientIntensity = 0.4;
                    directionalIntensity = 0.3;
                    break;
                default:
                    skyColor = new THREE.Color(0x87CEEB);
                    ambientIntensity = 0.6;
                    directionalIntensity = 0.8;
            }
            
            scene.background = skyColor;
            
            // ライトの強度を更新
            scene.children.forEach(child => {
                if (child instanceof THREE.AmbientLight) {
                    child.intensity = ambientIntensity;
                } else if (child instanceof THREE.DirectionalLight) {
                    child.intensity = directionalIntensity;
                }
            });
        }
    }
}

// グローバルな天候システムインスタンス
let weatherSystem;

// 天候システムの初期化
function initWeatherSystem() {
    weatherSystem = new WeatherSystem();
    console.log('天候システムを初期化しました');
}

// 天候表示要素を作成
function createWeatherDisplay() {
    // HTMLに直接追加されているため、初期化のみ行う
    const weatherDisplay = document.getElementById('weather-display');
    if (weatherDisplay) {
        console.log('天候表示要素を初期化しました');
    } else {
        console.error('天候表示要素が見つかりません');
    }
}

// 天候システムの更新
function updateWeather() {
    if (!weatherSystem) return;
    
    const currentElapsedTime = clock.getElapsedTime();
    weatherSystem.update(currentElapsedTime);
    weatherSystem.updateWeatherDisplay();
    weatherSystem.applyWeatherEffects();
}

// グローバルスコープに公開
window.weatherSystem = weatherSystem;
window.initWeatherSystem = initWeatherSystem;
window.updateWeather = updateWeather;
window.createWeatherDisplay = createWeatherDisplay; 