const test = require('node:test');
const assert = require('node:assert');
const { MiniGames } = require('../game/minigames.js');

test('角色數獨:產生的解答每排、每行、每個小區塊都不重複', () => {
    for (const n of [4, 6]) {
        for (let k = 0; k < 200; k++) {
            const { grid, br, bc } = MiniGames.makeSudoku(n);
            assert.strictEqual(grid.length, n);
            grid.forEach(row => assert.deepStrictEqual([...row].sort(), [...Array(n).keys()]));
            assert.strictEqual(MiniGames.sudokuConflicts(grid, n, br, bc).size, 0);
        }
    }
});

test('角色數獨:重複的格子會被標出來', () => {
    const { grid, br, bc } = MiniGames.makeSudoku(4);
    const board = grid.map(r => r.slice());
    board[0][1] = board[0][0];
    assert.ok(MiniGames.sudokuConflicts(board, 4, br, bc).has(0));
});
