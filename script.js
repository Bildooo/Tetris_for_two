class Tetris {
    constructor(canvasId, scoreId, gameOverId, startMsgId, playerNumber) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById(scoreId);
        this.gameOverElement = document.getElementById(gameOverId);
        this.startMsgElement = document.getElementById(startMsgId);
        this.playerNumber = playerNumber;

        this.rows = 20;
        this.cols = 10;
        this.cellSize = 30;

        // Definice barev pro tetromina
        this.colors = [
            null,
            '#00f0f0', // I (Cyan)
            '#f0f000', // O (Yellow)
            '#a000f0', // T (Purple)
            '#f0a000', // L (Orange)
            '#0000f0', // J (Blue)
            '#00f000', // S (Green)
            '#f00000'  // Z (Red)
        ];

        // Zvuky
        this.sounds = {
            dotek: new Audio('data/dotek.wav'),
            droped: new Audio('data/droped.wav'),
            rotate: new Audio('data/rotate.wav'),
            destroyLine: new Audio('data/destroyLine.wav')
        };

        // Nastavení hlasitosti
        this.sounds.dotek.volume = 0.5;
        this.sounds.rotate.volume = 0.5;

        // Nastavení opakováni pro droped zvuk
        this.sounds.droped.loop = true;

        this.reset();

        // Ovládání
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    static pieceSequence = [];

    static getNextPiece(index) {
        if (!Tetris.pieceSequence[index]) {
            Tetris.pieceSequence[index] = Math.floor(Math.random() * 7) + 1;
        }
        return Tetris.pieceSequence[index];
    }

    updateQuotaDisplay() {
        for (let i = 1; i <= 4; i++) {
            const element = document.getElementById(`p${this.playerNumber}-quota${i}`);
            if (element) {
                element.textContent = this.quota[i].toString().padStart(2, '0');
            }
        }
    }

    reset() {
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.score = 0;
        this.quota = { 1: 10, 2: 10, 3: 5, 4: 3 };
        this.gameActive = false;
        this.gameOver = false;
        this.piece = null;
        this.pieceType = 0;
        this.pieceX = 0;
        this.pieceY = 0;
        this.pieceIndex = 0;
        this.fallInterval = null;
        this.updateScore();
        this.updateQuotaDisplay();
        this.gameOverElement.textContent = '';
        if (!this.gameActive && !this.gameOver) {
            this.startMsgElement.style.display = 'block';
        }
    }

    start() {
        if (this.gameActive || this.gameOver) return;

        this.gameActive = true;
        this.gameOver = false;
        this.startMsgElement.style.display = 'none';
        this.gameOverElement.textContent = '';

        // Reset hrací plochy
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.score = 0;
        this.updateScore();

        // Vytvoření první figurky
        this.spawnPiece();

        // Spuštění pádu
        this.updateSpeed(500);
    }

    updateSpeed(ms) {
        this.currentSpeed = ms;
        if (this.fallInterval) clearInterval(this.fallInterval);
        this.fallInterval = setInterval(() => this.moveDown(), this.currentSpeed);

        // Pokud se jedná o rychlý pád, přehraj zvuk (opakovaně díky loop v constructoru)
        if (ms === 50) {
            this.playSound('droped');
        } else {
            // Zastavení padacího zvuku při normální rychlosti
            this.sounds.droped.pause();
            this.sounds.droped.currentTime = 0;
        }
    }

    playSound(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log("Audio play failed:", e));
        }
    }

    stop() {
        if (this.fallInterval) {
            clearInterval(this.fallInterval);
            this.fallInterval = null;
        }
        this.gameActive = false;
    }

    gameOverHandler() {
        this.stop();
        this.gameOver = true;
        this.gameOverElement.textContent = 'KONEC HRY!';
    }

    spawnPiece() {
        const shapes = [
            null,
            [[1, 1, 1, 1]], // I
            [[1, 1], [1, 1]], // O
            [[1, 1, 1], [0, 1, 0]], // T
            [[1, 1, 1], [1, 0, 0]], // L
            [[1, 1, 1], [0, 0, 1]], // J
            [[1, 1, 0], [0, 1, 1]], // S
            [[0, 1, 1], [1, 1, 0]] // Z
        ];

        this.pieceType = Tetris.getNextPiece(this.pieceIndex++);
        this.piece = shapes[this.pieceType];
        this.pieceX = Math.floor((this.cols - this.piece[0].length) / 2);
        this.pieceY = 0;

        // Kontrola, zda se figurka vejde
        if (this.collision()) {
            this.gameOverHandler();
        }

        // Reset rychlosti pro novou figurku
        if (this.currentSpeed !== 500) {
            this.updateSpeed(500);
        }
    }

    collision() {
        for (let y = 0; y < this.piece.length; y++) {
            for (let x = 0; x < this.piece[y].length; x++) {
                if (this.piece[y][x] !== 0) {
                    const boardX = this.pieceX + x;
                    const boardY = this.pieceY + y;

                    if (boardX < 0 || boardX >= this.cols || boardY >= this.rows || boardY < 0) {
                        return true;
                    }

                    if (boardY >= 0 && this.board[boardY][boardX] !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    mergePiece() {
        for (let y = 0; y < this.piece.length; y++) {
            for (let x = 0; x < this.piece[y].length; x++) {
                if (this.piece[y][x] !== 0) {
                    const boardY = this.pieceY + y;
                    const boardX = this.pieceX + x;
                    if (boardY >= 0 && boardY < this.rows && boardX >= 0 && boardX < this.cols) {
                        this.board[boardY][boardX] = this.pieceType;
                    }
                }
            }
        }

        const lines = this.clearLines();
        if (lines === 0) {
            this.playSound('dotek');
        }
        this.spawnPiece();
    }

    clearLines() {
        let linesCleared = 0;
        for (let y = this.rows - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                // Odstranění řádku
                this.board.splice(y, 1);
                this.board.unshift(Array(this.cols).fill(0));
                y++; // Znovu zkontrolujeme stejný index

                linesCleared++;
                this.score += 100 * linesCleared;
                this.updateScore();
            }
        }

        if (linesCleared > 0) {
            this.playSound('destroyLine');
        }

        if (linesCleared > 0 && linesCleared <= 4) {
            if (this.quota[linesCleared] > 0) {
                this.quota[linesCleared]--;
                this.updateQuotaDisplay();
            }
        }
        return linesCleared;
    }

    moveDown() {
        if (!this.gameActive || !this.piece) return;

        this.pieceY++;

        if (this.collision()) {
            this.pieceY--;
            this.mergePiece();
        }

        this.draw();
    }

    moveLeft() {
        if (!this.gameActive || !this.piece) return;

        this.pieceX--;

        if (this.collision()) {
            this.pieceX++;
        }

        this.draw();
    }

    moveRight() {
        if (!this.gameActive || !this.piece) return;

        this.pieceX++;

        if (this.collision()) {
            this.pieceX--;
        }

        this.draw();
    }

    hardDrop() {
        if (!this.gameActive || !this.piece) return;

        while (!this.collision()) {
            this.pieceY++;
        }
        this.pieceY--;
        this.mergePiece();
        this.draw();
    }

    rotate() {
        if (!this.gameActive || !this.piece) return;

        const rotated = this.piece[0].map((_, i) =>
            this.piece.map(row => row[i]).reverse()
        );

        const previousPiece = this.piece;
        const prevX = this.pieceX;
        const prevY = this.pieceY;

        this.piece = rotated;

        // Speciální posun pro dlouhé tetronimo (I), aby se otáčelo podle druhého dílku
        if (this.pieceType === 1) {
            if (previousPiece[0].length === 4) { // Z vodorovného na svislý
                this.pieceX += 1;
                this.pieceY -= 1;
            } else { // Ze svislého na vodorovný
                this.pieceX -= 1;
                this.pieceY += 1;
            }
        }

        if (this.collision()) {
            this.piece = previousPiece;
            this.pieceX = prevX;
            this.pieceY = prevY;
        } else {
            this.playSound('rotate');
        }

        this.draw();
    }

    updateScore() {
        this.scoreElement.textContent = this.score;
    }

    draw() {
        // Vyčištění canvasu
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Vykreslení hrací desky
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.board[y][x] !== 0) {
                    let color = this.colors[this.board[y][x]];
                    if (this.playerNumber === 2) {
                        color = this.darkenColor(color, 30);
                    }
                    this.ctx.fillStyle = color;
                    this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize - 1, this.cellSize - 1);

                    // Přidání efektu lesklosti
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize - 1, 5);
                }
            }
        }

        // Vykreslení aktuální figurky
        if (this.piece && this.gameActive) {
            for (let y = 0; y < this.piece.length; y++) {
                for (let x = 0; x < this.piece[y].length; x++) {
                    if (this.piece[y][x] !== 0) {
                        const boardX = (this.pieceX + x) * this.cellSize;
                        const boardY = (this.pieceY + y) * this.cellSize;

                        let color = this.colors[this.pieceType];
                        if (this.playerNumber === 2) {
                            color = this.darkenColor(color, 30);
                        }
                        this.ctx.fillStyle = color;
                        this.ctx.fillRect(boardX, boardY, this.cellSize - 1, this.cellSize - 1);

                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                        this.ctx.fillRect(boardX, boardY, this.cellSize - 1, 5);
                    }
                }
            }
        }

        // Vykreslení mřížky
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= this.cols; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.cellSize, 0);
            this.ctx.lineTo(i * this.cellSize, this.canvas.height);
            this.ctx.stroke();
        }

        for (let i = 0; i <= this.rows; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.cellSize);
            this.ctx.lineTo(this.canvas.width, i * this.cellSize);
            this.ctx.stroke();
        }
    }

    darkenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
    }

    handleKeyPress(e) {
        if (!this.gameActive && !this.gameOver) {
            // Spuštění hry podle čísla hráče
            if (e.key === this.playerNumber.toString()) {
                this.start();
            }
            return;
        }

        if (!this.gameActive) return;

        // Ovládání pouze pro svého hráče (WSAD pro hráče 1, šipky pro hráče 2)
        if (this.playerNumber === 1) {
            switch (e.key) {
                case 'a':
                case 'A':
                    this.moveLeft();
                    break;
                case 'd':
                case 'D':
                    this.moveRight();
                    break;
                case 's':
                case 'S':
                    if (this.currentSpeed !== 50) {
                        this.updateSpeed(50);
                    }
                    break;
                case 'w':
                case 'W':
                    this.rotate();
                    break;
            }
        } else {
            switch (e.key) {
                case 'ArrowLeft':
                    this.moveLeft();
                    break;
                case 'ArrowRight':
                    this.moveRight();
                    break;
                case 'ArrowDown':
                    if (this.currentSpeed !== 50) {
                        this.updateSpeed(50);
                    }
                    break;
                case 'ArrowUp':
                    this.rotate();
                    break;
            }
        }
    }
}

// Inicializace her
const game1 = new Tetris('canvas1', 'score1', 'gameOver1', 'startMsg1', 1);
const game2 = new Tetris('canvas2', 'score2', 'gameOver2', 'startMsg2', 2);

// První vykreslení
game1.draw();
game2.draw();

// Zamezení scrollování stránky při použití šipek a restart levelu
window.addEventListener('keydown', (e) => {
    if (e.key.startsWith('Arrow') || ['w', 'W', 's', 'S', 'a', 'A', 'd', 'D'].includes(e.key)) {
        e.preventDefault();
    }

    if (e.key === 'p' || e.key === 'P') {
        Tetris.pieceSequence = [];
        game1.stop();
        game1.reset();
        game2.stop();
        game2.reset();
    }
});
