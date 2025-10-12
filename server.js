// 简单的WebSocket服务器示例
// 需要安装: npm install ws

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    // 提供静态文件服务
    if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(fs.readFileSync(path.join(__dirname, 'simple.html')));
    } else if (req.url === '/simple.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(fs.readFileSync(path.join(__dirname, 'simple.html')));
    } else if (req.url.endsWith('.css')) {
        res.writeHead(200, { 'Content-Type': 'text/css' });
        res.end(fs.readFileSync(path.join(__dirname, req.url)));
    } else if (req.url.endsWith('.js')) {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(fs.readFileSync(path.join(__dirname, req.url)));
    } else if (req.url.endsWith('.png')) {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(fs.readFileSync(path.join(__dirname, req.url)));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 存储房间和玩家
const rooms = new Map();
const players = new Map();

// WebSocket连接处理
wss.on('connection', (ws) => {
    console.log('新的玩家连接');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data);
        } catch (error) {
            console.error('消息解析错误:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('玩家断开连接');
        // 清理玩家数据
        for (const [roomId, room] of rooms.entries()) {
            room.players = room.players.filter(p => p.ws !== ws);
            if (room.players.length === 0) {
                rooms.delete(roomId);
            } else {
                broadcastToRoom(roomId, {
                    type: 'player_left',
                    playerId: getPlayerId(ws)
                });
            }
        }
    });
});

// 处理消息
function handleMessage(ws, data) {
    switch (data.type) {
        case 'join':
            handleJoin(ws, data);
            break;
        case 'create_room':
            handleCreateRoom(ws, data);
            break;
        case 'join_room':
            handleJoinRoom(ws, data);
            break;
        case 'move':
            handleMove(ws, data);
            break;
        case 'chat':
            handleChat(ws, data);
            break;
        case 'restart':
            handleRestart(ws, data);
            break;
    }
}

// 处理玩家加入
function handleJoin(ws, data) {
    const player = {
        id: data.playerId,
        name: data.playerName,
        ws: ws
    };
    
    players.set(ws, player);
    
    ws.send(JSON.stringify({
        type: 'join_success',
        playerId: player.id,
        playerName: player.name
    }));
}

// 处理创建房间
function handleCreateRoom(ws, data) {
    const roomId = generateRoomId();
    const room = {
        id: roomId,
        players: [{
            id: data.playerId,
            name: data.playerName,
            ws: ws,
            isReady: true
        }],
        gameState: {
            board: Array(15).fill().map(() => Array(15).fill(0)),
            currentPlayer: 1,
            gameOver: false
        }
    };
    
    rooms.set(roomId, room);
    
    ws.send(JSON.stringify({
        type: 'room_created',
        roomId: roomId
    }));
}

// 处理加入房间
function handleJoinRoom(ws, data) {
    const roomId = data.roomId;
    const room = rooms.get(roomId);
    
    if (!room) {
        ws.send(JSON.stringify({
            type: 'error',
            message: '房间不存在'
        }));
        return;
    }
    
    if (room.players.length >= 2) {
        ws.send(JSON.stringify({
            type: 'error',
            message: '房间已满'
        }));
        return;
    }
    
    const player = {
        id: data.playerId,
        name: data.playerName,
        ws: ws,
        isReady: true
    };
    
    room.players.push(player);
    
    // 通知房间内所有玩家
    broadcastToRoom(roomId, {
        type: 'player_joined',
        player: player
    });
    
    // 如果房间有2个玩家，开始游戏
    if (room.players.length === 2) {
        broadcastToRoom(roomId, {
            type: 'game_start',
            gameState: room.gameState
        });
    }
}

// 处理下棋
function handleMove(ws, data) {
    const roomId = data.roomId;
    const room = rooms.get(roomId);
    
    if (!room) return;
    
    const player = room.players.find(p => p.ws === ws);
    if (!player) return;
    
    // 验证移动是否有效
    const { row, col } = data;
    if (room.gameState.board[row][col] !== 0) return;
    
    // 更新棋盘
    room.gameState.board[row][col] = data.player;
    
    // 检查游戏是否结束
    if (checkWin(room.gameState.board, row, col, data.player)) {
        room.gameState.gameOver = true;
        broadcastToRoom(roomId, {
            type: 'game_over',
            winner: data.player,
            gameState: room.gameState
        });
    } else {
        // 切换玩家
        room.gameState.currentPlayer = room.gameState.currentPlayer === 1 ? 2 : 1;
        broadcastToRoom(roomId, {
            type: 'move',
            row: row,
            col: col,
            player: data.player,
            gameState: room.gameState
        });
    }
}

// 处理聊天
function handleChat(ws, data) {
    const roomId = data.roomId;
    const room = rooms.get(roomId);
    
    if (!room) return;
    
    const player = room.players.find(p => p.ws === ws);
    if (!player) return;
    
    broadcastToRoom(roomId, {
        type: 'chat',
        sender: player.name,
        message: data.message
    });
}

// 处理重新开始
function handleRestart(ws, data) {
    const roomId = data.roomId;
    const room = rooms.get(roomId);
    
    if (!room) return;
    
    // 重置游戏状态
    room.gameState = {
        board: Array(15).fill().map(() => Array(15).fill(0)),
        currentPlayer: 1,
        gameOver: false
    };
    
    broadcastToRoom(roomId, {
        type: 'restart',
        gameState: room.gameState
    });
}

// 广播消息到房间内所有玩家
function broadcastToRoom(roomId, message) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    room.players.forEach(player => {
        if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(message));
        }
    });
}

// 获取玩家ID
function getPlayerId(ws) {
    const player = players.get(ws);
    return player ? player.id : null;
}

// 生成房间ID
function generateRoomId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// 检查胜利条件
function checkWin(board, row, col, player) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    
    for (const [dx, dy] of directions) {
        let count = 1;
        count += countDirection(board, row, col, dx, dy, player);
        count += countDirection(board, row, col, -dx, -dy, player);
        
        if (count >= 5) {
            return true;
        }
    }
    
    return false;
}

// 计算方向上的连续棋子数
function countDirection(board, row, col, dx, dy, player) {
    let count = 0;
    let r = row + dx;
    let c = col + dy;
    
    while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === player) {
        count++;
        r += dx;
        c += dy;
    }
    
    return count;
}

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`五子棋服务器运行在 http://localhost:${PORT}`);
    console.log(`WebSocket服务器运行在 ws://localhost:${PORT}`);
});

// 导出服务器（用于测试）
module.exports = { server, wss };

