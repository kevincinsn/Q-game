// ==========================================
// 遊戲全域變數與常數
// ==========================================
const TILE_SIZE = 40;
const ROWS = 15;
const COLS = 15;
const GAME_TIME = 180; // 3分鐘 (180秒)

let canvas, ctx;
let animationId;
let isGameRunning = false;
let score = 0;
let timeLeft = GAME_TIME;
let timerInterval;
let hasKey = false;
let playerName = "";

// 音訊上下文
let audioCtx;

// ==========================================
// 遊戲地圖 (1: 牆壁, 0: 走道, 2: 糖果, 3: 南瓜, 4: 鑰匙, 5: 門)
// ==========================================
const mapData = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,2,0,0,0,1,3,0,0,1],
    [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
    [1,2,1,0,0,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
    [1,0,0,0,0,3,1,0,0,0,0,0,0,2,1],
    [1,1,1,1,1,0,1,1,1,1,1,0,1,1,1],
    [1,0,2,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,0,1,1,1,0,1],
    [1,0,1,4,0,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,0,1,1,1,0,1,0,1],
    [1,0,0,0,0,2,1,0,1,2,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1],
    [1,3,0,0,1,0,0,0,0,0,1,5,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// 地圖陣列深拷貝（方便重新開始）
let currentMap = [];

// ==========================================
// 玩家物件 (主角：魯米)
// ==========================================
const player = {
    x: 1, // 網格座標
    y: 1,
    pixelX: 0,
    pixelY: 0,
    speed: 0.1, // 移動平滑度
    movingToX: 1,
    movingToY: 1,
    emoji: '🧙‍♀️' // 魯米代表圖示
};

// ==========================================
// 語音與音效模組
// ==========================================
const AudioManager = {
    bgmOscillator: null,
    bgmGainNode: null,
    init: function() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
    },
    // 播放稍微緊張刺激但不恐怖的配樂
    playBGM: function() {
        if (!audioCtx) return;
        this.stopBGM(); // 確保不會重複播放

        this.bgmOscillator = audioCtx.createOscillator();
        this.bgmGainNode = audioCtx.createGain();

        this.bgmOscillator.type = 'sine';
        this.bgmGainNode.gain.value = 0.05; // 音量小一點，不刺耳

        this.bgmOscillator.connect(this.bgmGainNode);
        this.bgmGainNode.connect(audioCtx.destination);

        // 簡單的兩個音符交替，製造緊張但不恐怖的氛圍
        const now = audioCtx.currentTime;
        // 使用 setInterval 動態調整頻率，但考慮到 Web Audio API 的特性，
        // 我們直接設定一個長期的頻率自動化曲線
        for (let i = 0; i < 200; i++) {
            this.bgmOscillator.frequency.setValueAtTime(300, now + i);
            this.bgmOscillator.frequency.setValueAtTime(350, now + i + 0.5);
        }

        this.bgmOscillator.start(now);
    },
    stopBGM: function() {
        if (this.bgmOscillator) {
            try {
                this.bgmOscillator.stop();
            } catch (e) {}
            this.bgmOscillator.disconnect();
            this.bgmOscillator = null;
        }
    },
    // 播放模擬魯米的語音
    speak: function(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-TW';
            utterance.pitch = 1.5; // 音調高一點，可愛風
            utterance.rate = 1.1; // 講話稍快一點點
            window.speechSynthesis.speak(utterance);
        }
    },
    // 播放簡單音效
    playSound: function(type) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === 'coin') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'key') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(800, now + 0.2);
            gainNode.gain.setValueAtTime(0.5, now);
            gainNode.gain.linearRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'win') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(600, now + 0.1);
            osc.frequency.setValueAtTime(800, now + 0.2);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.linearRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'lose') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.linearRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        }
    }
};

// ==========================================
// 存檔 API (本地 LocalStorage，方便移轉雲端)
// ==========================================
const SaveManager = {
    saveScore: function(name, finalScore) {
        let scores = JSON.parse(localStorage.getItem('rumiHalloweenScores')) || [];
        scores.push({
            name: name,
            score: finalScore,
            date: new Date().toISOString()
        });
        // 只保留前10名最高分
        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, 10);
        localStorage.setItem('rumiHalloweenScores', JSON.stringify(scores));
    }
};

// ==========================================
// 遊戲核心邏輯
// ==========================================
function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // 設定 Canvas 大小為響應式，但內部繪圖比例固定
    const containerWidth = document.getElementById('game-screen').clientWidth;
    // 假設螢幕較小，找出適合的大小，但不超過 TILE_SIZE * COLS
    const size = Math.min(containerWidth, window.innerHeight * 0.6, TILE_SIZE * COLS);
    canvas.width = TILE_SIZE * COLS;
    canvas.height = TILE_SIZE * ROWS;
    // 使用 CSS 縮放 canvas 以符合畫面
    canvas.style.width = '100%';
    canvas.style.maxWidth = (TILE_SIZE * COLS) + 'px';

    // 綁定事件
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', resetGame);

    // 鍵盤控制
    window.addEventListener('keydown', handleKeyDown);

    // 手機虛擬按鍵
    document.getElementById('btn-up').addEventListener('touchstart', (e) => { e.preventDefault(); tryMove(0, -1); });
    document.getElementById('btn-down').addEventListener('touchstart', (e) => { e.preventDefault(); tryMove(0, 1); });
    document.getElementById('btn-left').addEventListener('touchstart', (e) => { e.preventDefault(); tryMove(-1, 0); });
    document.getElementById('btn-right').addEventListener('touchstart', (e) => { e.preventDefault(); tryMove(1, 0); });

    // 電腦滑鼠點擊移動支援
    canvas.addEventListener('mousedown', handleMouseClick);
}

function handleMouseClick(e) {
    if (!isGameRunning) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // 取得點擊的像素座標並轉換為對應的內部 canvas 座標
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // 轉換為網格座標
    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);

    // 判斷點擊位置與玩家目前位置的相對方向，決定移動方向 (一次只能移動一步)
    if (gridX > player.x) tryMove(1, 0);
    else if (gridX < player.x) tryMove(-1, 0);
    else if (gridY > player.y) tryMove(0, 1);
    else if (gridY < player.y) tryMove(0, -1);
}

function startGame() {
    AudioManager.init();
    AudioManager.playBGM();

    const nameInput = document.getElementById('player-name').value.trim();
    playerName = nameInput !== "" ? nameInput : "小英雄";
    document.getElementById('display-name').innerText = playerName;

    // UI 切換
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');

    resetGameData();
    AudioManager.speak(`你好 ${playerName}！我是魯米，準備好一起逃脫了嗎？GO！`);

    isGameRunning = true;
    startTimer();
    gameLoop();
}

function resetGameData() {
    score = 0;
    timeLeft = GAME_TIME;
    hasKey = false;
    player.x = 1;
    player.y = 1;
    player.movingToX = 1;
    player.movingToY = 1;
    player.pixelX = player.x * TILE_SIZE;
    player.pixelY = player.y * TILE_SIZE;

    // 複製地圖
    currentMap = mapData.map(row => [...row]);

    updateHUD();
}

function resetGame() {
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    resetGameData();
    AudioManager.playBGM();
    isGameRunning = true;
    startTimer();
    gameLoop();
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!isGameRunning) return;
        timeLeft--;
        updateHUD();
        if (timeLeft <= 0) {
            endGame(false);
        } else if (timeLeft === 60) {
            AudioManager.speak("加油！只剩下一分鐘囉！");
        }
    }, 1000);
}

function updateHUD() {
    document.getElementById('score').innerText = score;
    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const seconds = (timeLeft % 60).toString().padStart(2, '0');
    document.getElementById('timer').innerText = `${minutes}:${seconds}`;
    document.getElementById('key-status').innerText = hasKey ? "✅" : "❌";
}

function handleKeyDown(e) {
    if (!isGameRunning) return;
    switch(e.key) {
        case 'ArrowUp': tryMove(0, -1); break;
        case 'ArrowDown': tryMove(0, 1); break;
        case 'ArrowLeft': tryMove(-1, 0); break;
        case 'ArrowRight': tryMove(1, 0); break;
    }
}

function tryMove(dx, dy) {
    // 確保前一次移動已完成才允許下一次指令 (簡單格子移動)
    if (player.x !== player.movingToX || player.y !== player.movingToY) return;

    const newX = player.x + dx;
    const newY = player.y + dy;

    // 邊界檢查
    if (newX < 0 || newX >= COLS || newY < 0 || newY >= ROWS) return;

    const targetTile = currentMap[newY][newX];

    // 撞牆
    if (targetTile === 1) return;

    // 檢查門
    if (targetTile === 5) {
        if (hasKey) {
            player.movingToX = newX;
            player.movingToY = newY;
            setTimeout(() => endGame(true), 300); // 延遲一下讓玩家走進去
        } else {
            AudioManager.speak("哎呀，門鎖住了，需要找鑰匙喔！");
            return; // 沒鑰匙不能走
        }
    } else {
        // 可以走
        player.movingToX = newX;
        player.movingToY = newY;
    }
}

function checkCollision() {
    // 當玩家抵達新格子時檢查
    if (Math.abs(player.pixelX - player.movingToX * TILE_SIZE) < 1 &&
        Math.abs(player.pixelY - player.movingToY * TILE_SIZE) < 1) {

        player.x = player.movingToX;
        player.y = player.movingToY;
        player.pixelX = player.x * TILE_SIZE;
        player.pixelY = player.y * TILE_SIZE;

        const tile = currentMap[player.y][player.x];

        if (tile === 2) { // 糖果
            score += 10;
            currentMap[player.y][player.x] = 0;
            AudioManager.playSound('coin');
            updateHUD();
        } else if (tile === 3) { // 南瓜
            score += 30;
            currentMap[player.y][player.x] = 0;
            AudioManager.playSound('coin');
            updateHUD();
        } else if (tile === 4) { // 鑰匙
            hasKey = true;
            score += 50;
            currentMap[player.y][player.x] = 0;
            AudioManager.playSound('key');
            AudioManager.speak("太棒了！找到鑰匙了，快去開門吧！");
            updateHUD();
        }
    }
}

function update() {
    // 平滑移動邏輯
    const targetPixelX = player.movingToX * TILE_SIZE;
    const targetPixelY = player.movingToY * TILE_SIZE;

    const speed = TILE_SIZE * 0.15; // 移動速度

    if (player.pixelX < targetPixelX) player.pixelX = Math.min(player.pixelX + speed, targetPixelX);
    if (player.pixelX > targetPixelX) player.pixelX = Math.max(player.pixelX - speed, targetPixelX);
    if (player.pixelY < targetPixelY) player.pixelY = Math.min(player.pixelY + speed, targetPixelY);
    if (player.pixelY > targetPixelY) player.pixelY = Math.max(player.pixelY - speed, targetPixelY);

    checkCollision();
}

function draw() {
    // 清除畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 繪製地圖
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const tile = currentMap[r][c];
            const px = c * TILE_SIZE;
            const py = r * TILE_SIZE;

            if (tile === 1) {
                // 牆壁 (暗紫色磚塊風格)
                ctx.fillStyle = '#4a2e6b';
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#2b1b3d';
                ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
            } else if (tile === 2) {
                ctx.font = `${TILE_SIZE * 0.6}px Arial`;
                ctx.fillText('🍬', px + TILE_SIZE*0.1, py + TILE_SIZE*0.7);
            } else if (tile === 3) {
                ctx.font = `${TILE_SIZE * 0.6}px Arial`;
                ctx.fillText('🎃', px + TILE_SIZE*0.1, py + TILE_SIZE*0.7);
            } else if (tile === 4) {
                ctx.font = `${TILE_SIZE * 0.6}px Arial`;
                ctx.fillText('🗝️', px + TILE_SIZE*0.1, py + TILE_SIZE*0.7);
            } else if (tile === 5) {
                ctx.font = `${TILE_SIZE * 0.7}px Arial`;
                ctx.fillText('🚪', px + TILE_SIZE*0.05, py + TILE_SIZE*0.8);
            }
        }
    }

    // 繪製玩家 (魯米)
    ctx.font = `${TILE_SIZE * 0.7}px Arial`;
    // emoji 微調置中
    ctx.fillText(player.emoji, player.pixelX + TILE_SIZE*0.05, player.pixelY + TILE_SIZE*0.8);
}

function gameLoop() {
    if (!isGameRunning) return;
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

function endGame(isWin) {
    isGameRunning = false;
    cancelAnimationFrame(animationId);
    clearInterval(timerInterval);
    AudioManager.stopBGM();

    // 結算畫面 UI
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('end-screen').classList.remove('hidden');

    // 時間獎勵
    let finalScore = score;
    if (isWin) {
        finalScore += timeLeft * 2; // 剩餘每秒加2分
    }
    document.getElementById('final-score').innerText = finalScore;

    SaveManager.saveScore(playerName, finalScore);

    const titleEl = document.getElementById('end-title');
    const msgEl = document.getElementById('end-message');

    if (isWin) {
        titleEl.innerText = "🎉 逃脫成功！ 🎉";
        msgEl.innerText = `太厲害了 ${playerName}！你成功幫魯米逃出去了！`;
        AudioManager.playSound('win');
        AudioManager.speak(`太厲害了！謝謝你幫我逃出來，你拿到了 ${finalScore} 分喔！`);
    } else {
        titleEl.innerText = "⏰ 時間到！";
        msgEl.innerText = `哎呀，時間到了。沒關係，我們再試一次！`;
        AudioManager.playSound('lose');
        AudioManager.speak(`時間到了，沒關係，魯米相信你下次一定可以的！`);
    }
}

// 初始化
window.onload = initGame;
