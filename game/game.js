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
// 純邏輯抽離 (純函式，無 DOM / Audio 依賴)
// ==========================================
const GameLogic = {
    // 地圖與遊戲狀態初始化
    createInitialState: function(customMapData) {
        const sourceMap = customMapData || mapData;
        return {
            map: sourceMap.map(row => [...row]),
            player: {
                x: 1,
                y: 1,
                movingToX: 1,
                movingToY: 1,
                pixelX: 1 * TILE_SIZE,
                pixelY: 1 * TILE_SIZE,
                emoji: '🧙‍♀️'
            },
            score: 0,
            timeLeft: GAME_TIME,
            hasKey: false,
            isGameRunning: false,
            isWin: false,
            isGameOver: false
        };
    },

    // 嘗試移動玩家
    tryMove: function(state, dx, dy) {
        // 若尚未移動到目標格子，不接收下一次移動
        if (state.player.x !== state.player.movingToX || state.player.y !== state.player.movingToY) {
            return { moved: false, reason: 'moving' };
        }

        const newX = state.player.x + dx;
        const newY = state.player.y + dy;

        // 邊界檢查
        if (newX < 0 || newX >= COLS || newY < 0 || newY >= ROWS) {
            return { moved: false, reason: 'boundary' };
        }

        const targetTile = state.map[newY][newX];

        // 撞牆
        if (targetTile === 1) {
            return { moved: false, reason: 'wall' };
        }

        // 門
        if (targetTile === 5) {
            if (state.hasKey) {
                state.player.movingToX = newX;
                state.player.movingToY = newY;
                return { moved: true, triggerWin: true };
            } else {
                return { moved: false, reason: 'locked_door' };
            }
        }

        state.player.movingToX = newX;
        state.player.movingToY = newY;
        return { moved: true };
    },

    // 檢查與處理抵達格子的碰撞與道具收集
    checkCollision: function(state) {
        if (Math.abs(state.player.pixelX - state.player.movingToX * TILE_SIZE) < 1 &&
            Math.abs(state.player.pixelY - state.player.movingToY * TILE_SIZE) < 1) {

            state.player.x = state.player.movingToX;
            state.player.y = state.player.movingToY;
            state.player.pixelX = state.player.x * TILE_SIZE;
            state.player.pixelY = state.player.y * TILE_SIZE;

            const tile = state.map[state.player.y][state.player.x];
            let itemCollected = null;

            if (tile === 2) { // 糖果
                state.score += 10;
                state.map[state.player.y][state.player.x] = 0;
                itemCollected = 'candy';
            } else if (tile === 3) { // 南瓜
                state.score += 30;
                state.map[state.player.y][state.player.x] = 0;
                itemCollected = 'pumpkin';
            } else if (tile === 4) { // 鑰匙
                state.hasKey = true;
                state.score += 50;
                state.map[state.player.y][state.player.x] = 0;
                itemCollected = 'key';
            }

            return { itemCollected: itemCollected, tile: tile };
        }
        return { itemCollected: null };
    },

    // 推進時間 1 秒
    tickTimer: function(state) {
        if (!state.isGameRunning) return { expired: false };
        state.timeLeft--;
        if (state.timeLeft <= 0) {
            state.isGameRunning = false;
            state.isGameOver = true;
            return { expired: true, isWin: false };
        }
        return { expired: false, timeLeft: state.timeLeft };
    },

    // 計算最終分數 (獲勝加上時間獎勵)
    calculateFinalScore: function(score, timeLeft, isWin) {
        return isWin ? score + (timeLeft * 2) : score;
    }
};

// ==========================================
// 跨裝置存檔碼編解碼 (Base32 + Checksum)
// ==========================================
const SaveCodeManager = {
    ALPHABET: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",

    bytesToBase32: function(bytes) {
        let bits = 0;
        let value = 0;
        let output = "";
        for (let i = 0; i < bytes.length; i++) {
            value = (value << 8) | bytes[i];
            bits += 8;
            while (bits >= 5) {
                output += this.ALPHABET[(value >>> (bits - 5)) & 31];
                bits -= 5;
            }
        }
        if (bits > 0) {
            output += this.ALPHABET[(value << (5 - bits)) & 31];
        }
        return output;
    },

    base32ToBytes: function(str) {
        str = str.toUpperCase().replace(/[^A-Z2-7]/g, "");
        let bits = 0;
        let value = 0;
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
            const idx = this.ALPHABET.indexOf(str[i]);
            if (idx === -1) continue;
            value = (value << 5) | idx;
            bits += 5;
            if (bits >= 8) {
                bytes.push((value >>> (bits - 8)) & 255);
                bits -= 8;
            }
        }
        return new Uint8Array(bytes);
    },

    calculateChecksum: function(bytes) {
        let sum1 = 0;
        let sum2 = 0;
        for (let i = 0; i < bytes.length; i++) {
            sum1 = (sum1 + bytes[i]) % 255;
            sum2 = (sum2 + sum1) % 255;
        }
        return (sum2 << 8) | sum1;
    },

    generateSaveCode: function({ name, score, progress }) {
        const safeName = name || "小英雄";
        let nameBytes;
        if (typeof TextEncoder !== 'undefined') {
            nameBytes = new TextEncoder().encode(safeName);
        } else {
            nameBytes = Buffer.from(safeName, 'utf8');
        }
        const trimmedNameBytes = nameBytes.subarray(0, 10);

        const headerByte = (1 << 4) | (progress & 0x0F);
        const scoreByte1 = (score >> 8) & 0xFF;
        const scoreByte2 = score & 0xFF;
        const nameLenByte = trimmedNameBytes.length & 0xFF;

        const payload = new Uint8Array(1 + 2 + 1 + trimmedNameBytes.length);
        payload[0] = headerByte;
        payload[1] = scoreByte1;
        payload[2] = scoreByte2;
        payload[3] = nameLenByte;
        payload.set(trimmedNameBytes, 4);

        const checksum = this.calculateChecksum(payload);
        const fullBuffer = new Uint8Array(payload.length + 2);
        fullBuffer.set(payload, 0);
        fullBuffer[payload.length] = (checksum >> 8) & 0xFF;
        fullBuffer[payload.length + 1] = checksum & 0xFF;

        return this.bytesToBase32(fullBuffer);
    },

    parseSaveCode: function(code) {
        if (!code || typeof code !== "string" || code.trim() === "") {
            return { success: false, error: "存檔碼不能為空喔！" };
        }
        const cleanCode = code.trim().toUpperCase().replace(/[\s-]/g, "");
        if (!/^[A-Z2-7]+$/.test(cleanCode)) {
            return { success: false, error: "存檔碼格式不正確，請檢查是否有打錯字喔！" };
        }
        const bytes = this.base32ToBytes(cleanCode);
        if (bytes.length < 7) {
            return { success: false, error: "存檔碼長度不足，請確認是否複製完整喔！" };
        }

        const payload = bytes.subarray(0, bytes.length - 2);
        const checksumInCode = (bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1];
        const expectedChecksum = this.calculateChecksum(payload);

        if (checksumInCode !== expectedChecksum) {
            return { success: false, error: "存檔碼驗證失敗，請確認存檔碼是否正確！" };
        }

        const headerByte = payload[0];
        const version = (headerByte >> 4) & 0x0F;
        if (version !== 1) {
            return { success: false, error: "存檔碼版本不相容！" };
        }
        const progress = headerByte & 0x0F;
        const score = (payload[1] << 8) | payload[2];
        const nameLen = payload[3];

        if (payload.length < 4 + nameLen) {
            return { success: false, error: "存檔碼資料損壞，無法讀取！" };
        }

        const nameBytes = payload.subarray(4, 4 + nameLen);
        let name;
        if (typeof TextDecoder !== 'undefined') {
            name = new TextDecoder().decode(nameBytes);
        } else {
            name = Buffer.from(nameBytes).toString('utf8');
        }

        return {
            success: true,
            data: { name, score, progress }
        };
    }
};

// ==========================================
// 語音與音效模組
// ==========================================
const AudioManager = {
    bgmOscillator: null,
    bgmGainNode: null,
    init: function() {
        if (typeof window !== 'undefined' && !audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
    },

    playBGM: function() {
        if (!audioCtx) return;
        this.stopBGM();

        this.bgmOscillator = audioCtx.createOscillator();
        this.bgmGainNode = audioCtx.createGain();

        this.bgmOscillator.type = 'sine';
        this.bgmGainNode.gain.value = 0.05;

        this.bgmOscillator.connect(this.bgmGainNode);
        this.bgmGainNode.connect(audioCtx.destination);

        const now = audioCtx.currentTime;
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

    // 挑裝置上最自然的中文女聲(iPhone:美佳;Windows:曉臻;Android/Chrome:Google 國語)
    voice: null,
    pickVoice: function() {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
        const voices = window.speechSynthesis.getVoices() || [];
        const zh = voices.filter(v => /zh[-_](TW|Hant)/i.test(v.lang));
        const pool = zh.length ? zh : voices.filter(v => /^zh/i.test(v.lang));
        const preferred = [/Mei-?Jia|美佳/i, /Premium|Enhanced|Natural|Neural|增強/i, /HsiaoChen|曉臻|HsiaoYu|曉雨/i, /Google/i];
        for (const re of preferred) {
            const v = pool.find(x => re.test(x.name));
            if (v) return v;
        }
        return pool[0] || null;
    },

    speak: function(text) {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        if (!this.voice) this.voice = this.pickVoice();
        window.speechSynthesis.cancel(); // 不要一句疊一句
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-TW';
        if (this.voice) utterance.voice = this.voice;
        // 音調稍高、速度稍慢:聽起來像活潑的大姊姊,而不是尖銳的機器聲
        utterance.pitch = 1.2;
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
    },

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
// 存檔 API (本地 LocalStorage，支援跨裝置存檔碼)
// ==========================================
const SaveManager = {
    saveScore: function(name, finalScore) {
        if (typeof localStorage === 'undefined') return;
        let scores = [];
        try {
            scores = JSON.parse(localStorage.getItem('rumiHalloweenScores')) || [];
        } catch (e) {
            scores = [];
        }
        scores.push({
            name: name,
            score: finalScore,
            date: new Date().toISOString()
        });
        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, 10);
        localStorage.setItem('rumiHalloweenScores', JSON.stringify(scores));
    },

    getHighScore: function(name) {
        if (typeof localStorage === 'undefined') return 0;
        try {
            const scores = JSON.parse(localStorage.getItem('rumiHalloweenScores')) || [];
            if (name) {
                const userScores = scores.filter(s => s.name === name);
                return userScores.length > 0 ? Math.max(...userScores.map(s => s.score)) : 0;
            }
            return scores.length > 0 ? Math.max(...scores.map(s => s.score)) : 0;
        } catch (e) {
            return 0;
        }
    }
};

// ==========================================
// 遊戲 UI / Event Handlers
// ==========================================
function initGame() {
    if (typeof document === 'undefined') return;

    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    canvas.width = TILE_SIZE * COLS;
    canvas.height = TILE_SIZE * ROWS;
    canvas.style.width = '100%';
    canvas.style.maxWidth = (TILE_SIZE * COLS) + 'px';

    // 按鈕綁定
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', resetGame);

    // 存檔碼按鈕綁定
    const copyBtnStart = document.getElementById('copy-code-start-btn');
    const loadBtnStart = document.getElementById('load-code-start-btn');
    const copyBtnEnd = document.getElementById('copy-code-end-btn');

    if (copyBtnStart) copyBtnStart.addEventListener('click', handleCopySaveCode);
    if (loadBtnStart) loadBtnStart.addEventListener('click', handleLoadSaveCode);
    if (copyBtnEnd) copyBtnEnd.addEventListener('click', handleCopySaveCode);

    // 有觸控螢幕(手機/iPad)就顯示方向鍵;純電腦才隱藏
    if (!(navigator.maxTouchPoints > 0 || 'ontouchstart' in window)) {
        document.documentElement.classList.add('no-touch');
    }

    // 鍵盤控制
    window.addEventListener('keydown', handleKeyDown);

    // 手機方向鍵:按一下走一格,按住會一直走
    const bindHold = (id, dx, dy) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        let holdTimer = null;
        const stop = () => {
            clearInterval(holdTimer);
            holdTimer = null;
            btn.classList.remove('pressed');
        };
        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            stop();
            btn.classList.add('pressed');
            tryMove(dx, dy);
            holdTimer = setInterval(() => tryMove(dx, dy), 140);
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => btn.addEventListener(ev, stop));
        btn.addEventListener('contextmenu', (e) => e.preventDefault());
    };
    bindHold('btn-up', 0, -1);
    bindHold('btn-down', 0, 1);
    bindHold('btn-left', -1, 0);
    bindHold('btn-right', 1, 0);

    // 迷宮上滑動手指移動(拖著不放可以連續轉彎),輕點則朝點的方向走一格
    const wrap = document.getElementById('canvas-wrap') || canvas;
    const SWIPE_STEP = 26; // 手指移動多少像素算走一格
    let swipe = null;
    wrap.addEventListener('pointerdown', (e) => {
        if (!isGameRunning) return;
        e.preventDefault();
        swipe = { x: e.clientX, y: e.clientY, moved: false };
    });
    wrap.addEventListener('pointermove', (e) => {
        if (!swipe) return;
        const dx = e.clientX - swipe.x;
        const dy = e.clientY - swipe.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_STEP) return;
        if (Math.abs(dx) > Math.abs(dy)) tryMove(dx > 0 ? 1 : -1, 0);
        else tryMove(0, dy > 0 ? 1 : -1);
        swipe.x = e.clientX;
        swipe.y = e.clientY;
        swipe.moved = true;
    });
    const endSwipe = (e) => {
        if (swipe && !swipe.moved && e.type === 'pointerup') handleMouseClick(e);
        swipe = null;
    };
    wrap.addEventListener('pointerup', endSwipe);
    wrap.addEventListener('pointercancel', endSwipe);

    window.addEventListener('resize', resizeCanvas);
    loadSprites();
    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => { AudioManager.voice = AudioManager.pickVoice(); };
    }
}

function handleCopySaveCode() {
    const inputName = document.getElementById('player-name') ? document.getElementById('player-name').value.trim() : "";
    const name = playerName || inputName || "小英雄";
    const highScore = Math.max(score, SaveManager.getHighScore(name));
    const code = SaveCodeManager.generateSaveCode({ name: name, score: highScore, progress: 1 });

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
            alert(`已複製存檔碼！\n存檔碼：${code}\n可以保存在文字檔或傳到其他裝置還原喔！`);
        }).catch(() => {
            prompt("請複製以下存檔碼：", code);
        });
    } else {
        prompt("請複製以下存檔碼：", code);
    }
}

function handleLoadSaveCode() {
    const inputCode = prompt("請輸入您的 12~20 位存檔碼：");
    if (inputCode === null) return; // 使用者取消

    const result = SaveCodeManager.parseSaveCode(inputCode);
    if (!result.success) {
        alert(result.error);
        return;
    }

    const { name, score: loadedScore } = result.data;
    if (document.getElementById('player-name')) {
        document.getElementById('player-name').value = name;
    }
    playerName = name;
    SaveManager.saveScore(name, loadedScore);

    alert(`🎉 成功讀取存檔！\n玩家：${name}\n最高分記錄：${loadedScore} 分\n直接點擊「開始遊戲」即可開玩！`);
}

function handleMouseClick(e) {
    if (!isGameRunning) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);

    if (gridX > player.x) tryMove(1, 0);
    else if (gridX < player.x) tryMove(-1, 0);
    else if (gridY > player.y) tryMove(0, 1);
    else if (gridY < player.y) tryMove(0, -1);
}

function resizeCanvas() {
    if (!canvas) return;
    const wrap = document.getElementById('canvas-wrap');
    if (!wrap) return;
    const side = Math.floor(Math.min(wrap.clientWidth, wrap.clientHeight));
    if (side > 0) {
        canvas.style.width = side + 'px';
        canvas.style.height = side + 'px';
    }
}

// 角色圖片(魯米、老虎朋友、小鳥朋友);圖片沒載入時退回 emoji
const sprites = {};
function loadSprites() {
    ['rumi', 'tiger', 'bird'].forEach(name => {
        const img = new Image();
        img.onload = () => { sprites[name] = img; };
        img.src = 'assets/' + name + '.png';
    });
}

function drawSprite(name, fallbackEmoji, px, py, scale) {
    const size = TILE_SIZE * (scale || 0.9);
    const off = (TILE_SIZE - size) / 2;
    if (sprites[name]) {
        ctx.drawImage(sprites[name], px + off, py + off, size, size);
    } else {
        ctx.font = `${TILE_SIZE * 0.7}px Arial`;
        ctx.fillText(fallbackEmoji, px + TILE_SIZE*0.05, py + TILE_SIZE*0.8);
    }
}

function startGame() {
    AudioManager.init();
    AudioManager.playBGM();

    const nameInput = document.getElementById('player-name').value.trim();
    playerName = nameInput !== "" ? nameInput : "小英雄";
    document.getElementById('display-name').innerText = playerName;

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    resizeCanvas();

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

    currentMap = mapData.map(row => [...row]);

    updateHUD();
}

function resetGame() {
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    resizeCanvas();
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

        const state = { isGameRunning, timeLeft };
        const result = GameLogic.tickTimer(state);
        timeLeft = state.timeLeft;

        updateHUD();

        if (result.expired) {
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
    const tempState = {
        map: currentMap,
        player: player,
        hasKey: hasKey
    };

    const res = GameLogic.tryMove(tempState, dx, dy);
    if (!res.moved) {
        if (res.reason === 'locked_door') {
            AudioManager.speak("哎呀，門鎖住了，需要找鑰匙喔！");
        }
        return;
    }

    if (res.triggerWin) {
        setTimeout(() => endGame(true), 300);
    }
}

function checkCollision() {
    const tempState = {
        map: currentMap,
        player: player,
        score: score,
        hasKey: hasKey
    };

    const res = GameLogic.checkCollision(tempState);
    score = tempState.score;
    hasKey = tempState.hasKey;

    if (res.itemCollected === 'candy' || res.itemCollected === 'pumpkin') {
        AudioManager.playSound('coin');
        updateHUD();
    } else if (res.itemCollected === 'key') {
        AudioManager.playSound('key');
        AudioManager.speak("太棒了！老虎朋友把鑰匙給你了，快去找小鳥朋友守著的門吧！");
        updateHUD();
    }
}

function update() {
    const targetPixelX = player.movingToX * TILE_SIZE;
    const targetPixelY = player.movingToY * TILE_SIZE;

    const speed = TILE_SIZE * 0.15;

    if (player.pixelX < targetPixelX) player.pixelX = Math.min(player.pixelX + speed, targetPixelX);
    if (player.pixelX > targetPixelX) player.pixelX = Math.max(player.pixelX - speed, targetPixelX);
    if (player.pixelY < targetPixelY) player.pixelY = Math.min(player.pixelY + speed, targetPixelY);
    if (player.pixelY > targetPixelY) player.pixelY = Math.max(player.pixelY - speed, targetPixelY);

    checkCollision();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const tile = currentMap[r][c];
            const px = c * TILE_SIZE;
            const py = r * TILE_SIZE;

            if (tile === 1) {
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
                // 老虎朋友拿著鑰匙
                drawSprite('tiger', '🗝️', px, py, 0.95);
                ctx.font = `${TILE_SIZE * 0.4}px Arial`;
                ctx.fillText('🗝️', px + TILE_SIZE*0.55, py + TILE_SIZE*0.98);
            } else if (tile === 5) {
                ctx.font = `${TILE_SIZE * 0.7}px Arial`;
                ctx.fillText('🚪', px + TILE_SIZE*0.05, py + TILE_SIZE*0.8);
                // 小鳥朋友守在門邊
                if (sprites.bird) ctx.drawImage(sprites.bird, px + TILE_SIZE*0.5, py - TILE_SIZE*0.05, TILE_SIZE*0.5, TILE_SIZE*0.5);
            }
        }
    }

    drawSprite('rumi', player.emoji, player.pixelX, player.pixelY, 0.95);
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

    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('end-screen').classList.remove('hidden');

    const finalScore = GameLogic.calculateFinalScore(score, timeLeft, isWin);
    document.getElementById('final-score').innerText = finalScore;

    SaveManager.saveScore(playerName, finalScore);
    if (typeof QRoom !== 'undefined') QRoom.report(isWin ? 'mazeWin' : 'maze', finalScore);

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

if (typeof window !== 'undefined') {
    window.onload = initGame;
}

// 供 Node.js 單元測試匯出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GameLogic,
        SaveCodeManager,
        SaveManager,
        mapData,
        TILE_SIZE,
        ROWS,
        COLS,
        GAME_TIME
    };
}
