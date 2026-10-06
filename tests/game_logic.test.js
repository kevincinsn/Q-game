const test = require('node:test');
const assert = require('node:assert');
const { GameLogic, SaveCodeManager } = require('../game/game.js');

test('GameLogic - cannot pass through wall', (t) => {
    const state = GameLogic.createInitialState();
    // Move up from (1,1) -> (1,0) which is wall (tile 1)
    const result = GameLogic.tryMove(state, 0, -1);
    assert.strictEqual(result.moved, false);
    assert.strictEqual(result.reason, 'wall');
    assert.strictEqual(state.player.x, 1);
    assert.strictEqual(state.player.y, 1);
});

test('GameLogic - cannot pass through locked door without key', (t) => {
    const state = GameLogic.createInitialState();
    // Place door at (1,2) and player at (1,1)
    state.map[2][1] = 5;
    state.hasKey = false;

    const result = GameLogic.tryMove(state, 0, 1);
    assert.strictEqual(result.moved, false);
    assert.strictEqual(result.reason, 'locked_door');
    assert.strictEqual(state.player.x, 1);
    assert.strictEqual(state.player.y, 1);
});

test('GameLogic - can pass through door when key is acquired', (t) => {
    const state = GameLogic.createInitialState();
    state.map[2][1] = 5;
    state.hasKey = true;

    const result = GameLogic.tryMove(state, 0, 1);
    assert.strictEqual(result.moved, true);
    assert.strictEqual(result.triggerWin, true);
    assert.strictEqual(state.player.movingToX, 1);
    assert.strictEqual(state.player.movingToY, 2);
});

test('GameLogic - eating candy and pumpkin adds score and removes item', (t) => {
    const state = GameLogic.createInitialState();

    // Place candy at (1,2)
    state.map[2][1] = 2;
    state.player.pixelX = 1 * 40;
    state.player.pixelY = 2 * 40;
    state.player.movingToX = 1;
    state.player.movingToY = 2;

    const candyRes = GameLogic.checkCollision(state);
    assert.strictEqual(candyRes.itemCollected, 'candy');
    assert.strictEqual(state.score, 10);
    assert.strictEqual(state.map[2][1], 0);

    // Place pumpkin at (2,2)
    state.map[2][2] = 3;
    state.player.pixelX = 2 * 40;
    state.player.pixelY = 2 * 40;
    state.player.movingToX = 2;
    state.player.movingToY = 2;

    const pumpkinRes = GameLogic.checkCollision(state);
    assert.strictEqual(pumpkinRes.itemCollected, 'pumpkin');
    assert.strictEqual(state.score, 40); // 10 + 30
    assert.strictEqual(state.map[2][2], 0);
});

test('GameLogic - 3 minutes timer expiration ends game', (t) => {
    const state = GameLogic.createInitialState();
    state.isGameRunning = true;
    state.timeLeft = 1;

    const tick1 = GameLogic.tickTimer(state);
    assert.strictEqual(tick1.expired, true);
    assert.strictEqual(state.timeLeft, 0);
    assert.strictEqual(state.isGameRunning, false);
    assert.strictEqual(state.isGameOver, true);
});

test('SaveCodeManager - encoding and decoding save code', (t) => {
    const originalData = { name: '小星妹', score: 180, progress: 1 };
    const code = SaveCodeManager.generateSaveCode(originalData);

    assert.ok(code.length >= 12 && code.length <= 24, `Code length should be reasonable: ${code.length}`);

    const parseRes = SaveCodeManager.parseSaveCode(code);
    assert.strictEqual(parseRes.success, true);
    assert.strictEqual(parseRes.data.name, '小星妹');
    assert.strictEqual(parseRes.data.score, 180);
    assert.strictEqual(parseRes.data.progress, 1);
});

test('SaveCodeManager - error handling on invalid code', (t) => {
    const emptyRes = SaveCodeManager.parseSaveCode('');
    assert.strictEqual(emptyRes.success, false);
    assert.ok(emptyRes.error.includes('不能為空'));

    const invalidCharRes = SaveCodeManager.parseSaveCode('INVALID!@#$CODE');
    assert.strictEqual(invalidCharRes.success, false);
    assert.ok(invalidCharRes.error.includes('格式不正確'));

    const originalCode = SaveCodeManager.generateSaveCode({ name: '小星妹', score: 180, progress: 1 });
    const tamperedCode = originalCode.slice(0, -1) + (originalCode.slice(-1) === 'A' ? 'B' : 'A');
    const corruptedRes = SaveCodeManager.parseSaveCode(tamperedCode);
    assert.strictEqual(corruptedRes.success, false);
    assert.ok(corruptedRes.error.includes('驗證失敗'));
});
