// 五子棋游戏类
class GomokuGame {
    constructor() {
        this.boardSize = 15; // 15x15棋盘
        this.cellSize = 40; // 每个格子的大小
        this.board = []; // 棋盘状态数组
        this.currentPlayer = 1; // 1为黑棋，2为白棋
        this.gameOver = false;
        this.moveHistory = []; // 下棋历史，用于悔棋
        this.stats = {
            blackWins: 0,
            whiteWins: 0,
            draws: 0
        };
        
        this.initializeBoard();
        this.setupCanvas();
        this.setupEventListeners();
        this.loadStats();
        this.updateDisplay();
    }

    // 初始化棋盘
    initializeBoard() {
        this.board = [];
        for (let i = 0; i < this.boardSize; i++) {
            this.board[i] = [];
            for (let j = 0; j < this.boardSize; j++) {
                this.board[i][j] = 0; // 0表示空位
            }
        }
        this.moveHistory = [];
        this.currentPlayer = 1;
        this.gameOver = false;
    }

    // 设置Canvas
    setupCanvas() {
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.boardSize * this.cellSize;
        this.canvas.height = this.boardSize * this.cellSize;
        this.drawBoard();
    }

    // 绘制棋盘
    drawBoard() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制背景
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格线
        ctx.strokeStyle = '#495057';
        ctx.lineWidth = 2;
        
        // 垂直线
        for (let i = 0; i <= this.boardSize; i++) {
            const x = i * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        
        // 水平线
        for (let i = 0; i <= this.boardSize; i++) {
            const y = i * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
        
        // 绘制天元和星位
        this.drawStarPoints();
        
        // 绘制棋子
        this.drawPieces();
    }

    // 绘制天元和星位
    drawStarPoints() {
        const ctx = this.ctx;
        const starPoints = [
            [3, 3], [3, 11], [7, 7], [11, 3], [11, 11]
        ];
        
        ctx.fillStyle = '#495057';
        starPoints.forEach(([row, col]) => {
            const x = col * this.cellSize;
            const y = row * this.cellSize;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    // 绘制棋子
    drawPieces() {
        const ctx = this.ctx;
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.board[row][col] !== 0) {
                    this.drawPiece(row, col, this.board[row][col]);
                }
            }
        }
    }

    // 绘制单个棋子
    drawPiece(row, col, player) {
        const ctx = this.ctx;
        const x = col * this.cellSize;
        const y = row * this.cellSize;
        const radius = this.cellSize * 0.4;
        
        // 创建渐变效果
        const gradient = ctx.createRadialGradient(
            x - radius * 0.3, y - radius * 0.3, 0,
            x, y, radius
        );
        
        if (player === 1) { // 黑棋
            gradient.addColorStop(0, '#888');
            gradient.addColorStop(1, '#000');
        } else { // 白棋
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(1, '#ddd');
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        // 添加阴影效果
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    // 获取鼠标点击位置对应的棋盘坐标
    getBoardPosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const col = Math.round(x / this.cellSize);
        const row = Math.round(y / this.cellSize);
        
        return { row, col };
    }

    // 下棋
    makeMove(row, col) {
        if (this.gameOver || this.board[row][col] !== 0) {
            return false;
        }
        
        // 记录移动历史
        this.moveHistory.push({ row, col, player: this.currentPlayer });
        
        // 放置棋子
        this.board[row][col] = this.currentPlayer;
        
        // 检查游戏是否结束
        if (this.checkWin(row, col)) {
            this.gameOver = true;
            this.handleWin();
            return true;
        }
        
        // 检查平局
        if (this.isBoardFull()) {
            this.gameOver = true;
            this.handleDraw();
            return true;
        }
        
        // 切换玩家
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.updateDisplay();
        return true;
    }

    // 检查胜利条件
    checkWin(row, col) {
        const directions = [
            [0, 1],   // 水平
            [1, 0],   // 垂直
            [1, 1],   // 对角线
            [1, -1]   // 反对角线
        ];
        
        for (let [dx, dy] of directions) {
            let count = 1; // 包含当前棋子
            
            // 向一个方向计数
            count += this.countDirection(row, col, dx, dy);
            // 向相反方向计数
            count += this.countDirection(row, col, -dx, -dy);
            
            if (count >= 5) {
                return true;
            }
        }
        
        return false;
    }

    // 在指定方向计数连续棋子
    countDirection(row, col, dx, dy) {
        let count = 0;
        let r = row + dx;
        let c = col + dy;
        
        while (r >= 0 && r < this.boardSize && 
               c >= 0 && c < this.boardSize && 
               this.board[r][c] === this.currentPlayer) {
            count++;
            r += dx;
            c += dy;
        }
        
        return count;
    }

    // 检查棋盘是否已满
    isBoardFull() {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.board[row][col] === 0) {
                    return false;
                }
            }
        }
        return true;
    }

    // 处理胜利
    handleWin() {
        const winner = this.currentPlayer === 1 ? '黑棋' : '白棋';
        this.showMessage(`${winner}获胜！`);
        
        // 更新统计
        if (this.currentPlayer === 1) {
            this.stats.blackWins++;
        } else {
            this.stats.whiteWins++;
        }
        this.saveStats();
        this.updateStats();
    }

    // 处理平局
    handleDraw() {
        this.showMessage('平局！');
        this.stats.draws++;
        this.saveStats();
        this.updateStats();
    }

    // 显示消息
    showMessage(message) {
        // 移除之前的消息
        const existingMessage = document.querySelector('.winner-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // 创建新消息
        const messageDiv = document.createElement('div');
        messageDiv.className = 'winner-message';
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        
        // 3秒后自动移除
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    // 悔棋
    undo() {
        if (this.moveHistory.length === 0 || this.gameOver) {
            return false;
        }
        
        const lastMove = this.moveHistory.pop();
        this.board[lastMove.row][lastMove.col] = 0;
        this.currentPlayer = lastMove.player;
        this.gameOver = false;
        
        this.drawBoard();
        this.updateDisplay();
        return true;
    }

    // 获取提示（显示最佳下棋位置）
    getHint() {
        if (this.gameOver) {
            return null;
        }
        
        // 简单的AI提示：寻找可以形成四连或阻止对方四连的位置
        let bestMove = null;
        let bestScore = -1;
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.board[row][col] === 0) {
                    const score = this.evaluatePosition(row, col);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { row, col };
                    }
                }
            }
        }
        
        return bestMove;
    }

    // 评估位置价值
    evaluatePosition(row, col) {
        let score = 0;
        
        // 临时放置棋子
        this.board[row][col] = this.currentPlayer;
        
        // 检查是否能形成五连
        if (this.checkWin(row, col)) {
            score += 10000;
        }
        
        // 检查是否能形成四连
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (let [dx, dy] of directions) {
            let count = 1 + this.countDirection(row, col, dx, dy) + 
                       this.countDirection(row, col, -dx, -dy);
            if (count >= 4) {
                score += 1000;
            } else if (count >= 3) {
                score += 100;
            }
        }
        
        // 检查对方棋子
        this.board[row][col] = this.currentPlayer === 1 ? 2 : 1;
        if (this.checkWin(row, col)) {
            score += 5000; // 阻止对方获胜
        }
        
        // 恢复空位
        this.board[row][col] = 0;
        
        return score;
    }

    // 显示提示
    showHint() {
        const hint = this.getHint();
        if (hint) {
            // 高亮提示位置
            this.highlightPosition(hint.row, hint.col);
        }
    }

    // 高亮位置
    highlightPosition(row, col) {
        const ctx = this.ctx;
        const x = col * this.cellSize;
        const y = row * this.cellSize;
        
        ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(x, y, this.cellSize * 0.2, 0, 2 * Math.PI);
        ctx.fill();
        
        // 2秒后移除高亮
        setTimeout(() => {
            this.drawBoard();
        }, 2000);
    }

    // 更新显示
    updateDisplay() {
        const playerName = this.currentPlayer === 1 ? '黑棋' : '白棋';
        const playerElement = document.getElementById('player-name');
        const statusElement = document.getElementById('game-status');
        
        if (this.gameOver) {
            playerElement.textContent = '游戏结束';
            statusElement.textContent = '游戏结束';
        } else {
            playerElement.textContent = playerName;
            statusElement.textContent = '游戏进行中';
        }
        
        this.updateStats();
    }

    // 更新统计显示
    updateStats() {
        document.getElementById('black-wins').textContent = this.stats.blackWins;
        document.getElementById('white-wins').textContent = this.stats.whiteWins;
        document.getElementById('draws').textContent = this.stats.draws;
    }

    // 保存统计到本地存储
    saveStats() {
        localStorage.setItem('gomoku-stats', JSON.stringify(this.stats));
    }

    // 从本地存储加载统计
    loadStats() {
        const saved = localStorage.getItem('gomoku-stats');
        if (saved) {
            this.stats = JSON.parse(saved);
        }
    }

    // 重新开始游戏
    restart() {
        this.initializeBoard();
        this.drawBoard();
        this.updateDisplay();
    }

    // 设置事件监听器
    setupEventListeners() {
        // 棋盘点击事件
        this.canvas.addEventListener('click', (event) => {
            const { row, col } = this.getBoardPosition(event);
            if (row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize) {
                if (this.makeMove(row, col)) {
                    this.drawBoard();
                }
            }
        });

        // 按钮事件
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restart();
        });

        document.getElementById('undo-btn').addEventListener('click', () => {
            if (this.undo()) {
                this.drawBoard();
            }
        });

        document.getElementById('hint-btn').addEventListener('click', () => {
            this.showHint();
        });

        // 键盘事件
        document.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'r':
                case 'R':
                    this.restart();
                    break;
                case 'u':
                case 'U':
                    if (this.undo()) {
                        this.drawBoard();
                    }
                    break;
                case 'h':
                case 'H':
                    this.showHint();
                    break;
            }
        });
    }
}

// 页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    const game = new GomokuGame();
    
    // 添加键盘快捷键提示
    console.log('键盘快捷键：');
    console.log('R - 重新开始');
    console.log('U - 悔棋');
    console.log('H - 提示');
});
