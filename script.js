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

        // Tetromino colors
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

        // Sounds
        this.sounds = {
            dotek: new Audio('data/dotek.wav'),
            droped: new Audio('data/droped.wav'),
            rotate: new Audio('data/rotate.wav'),
            destroyLine: new Audio('data/destroyLine.wav')
        };

        // Initialize static music if not already done
        if (!Tetris.mainMusic) {
            Tetris.playlist = [
                '01 - Bioscop Fanfare.mp3',
                '02 - Master of Magic (ZX Spectrum Remix).mp3',
                '03 - Thereza\'s Web (Featuring Hana Hlozkova).mp3',
                '05 - Choking Hazard_ Main Theme.mp3',
                '06 - Choking Hazard_ Dr. Reinis.mp3',
                '07 - Choking Hazard_ The Kitchen.mp3',
                '08 - Feud (ZX Spectrum Remix).mp3',
                '09 - Bytefest Megamix (for Rob Hubbard).mp3',
                '10 - Csardas Continuum.mp3',
                '11 - RetroVirus 255 Main Theme.mp3',
                '12 - Belegost (ZX Spectrum Remix).mp3',
                '13 - Zub (ZX Spectrum Remix).mp3',
                '14 - I Was a Teenage Intellectual (Soundtrack Mix).mp3',
                '15 - Michal David is Reborn.mp3',
                'MainTitle.mp3'
            ];
            Tetris.mainMusic = new Audio();
            Tetris.musicEnabled = true;
            Tetris.playRandomTrack();
        }

        // Volume settings
        this.sounds.dotek.volume = 0.12;
        this.sounds.rotate.volume = 0.12;
        this.sounds.droped.volume = 0.12;
        this.sounds.destroyLine.volume = 0.06;

        // Loop for dropping sound
        this.sounds.droped.loop = true;

        this.reset();

        // Controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    static mainMusic = null;
    static playlist = [];
    static musicEnabled = true;
    static currentLevel = 1;

    static getLevelQuota(level) {
        // Algorithmic quota generator
        // Each level: +1 to 1L and 2L
        // Every 3rd level: +1 to 3L
        // Every 4th level: +1 to 4L
        return {
            1: 10 + (level - 1),
            2: 0 + (level - 1),
            3: Math.floor(level / 3),
            4: Math.floor(level / 4)
        };
    }

    static playRandomTrack() {
        if (!Tetris.mainMusic) return;
        const randomTrack = Tetris.playlist[Math.floor(Math.random() * Tetris.playlist.length)];
        Tetris.mainMusic.src = `data/music/${randomTrack}`;
        Tetris.mainMusic.volume = 0.3;

        // Ensure manual play is respected by browser
        if (Tetris.musicEnabled) {
            Tetris.mainMusic.play().catch(e => console.log("Music play blocked:", e));
        }

        // When track ends, play another random one
        Tetris.mainMusic.onended = () => {
            Tetris.playRandomTrack();
        };
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
        this.quota = Tetris.getLevelQuota(Tetris.currentLevel);
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
        // Allow restart after game over (player presses their number again)
        if (this.gameOver) {
            this.gameOver = false;
            // Stop blinking and clear the game over text immediately
            if (this.blinkInterval) {
                clearInterval(this.blinkInterval);
                this.blinkInterval = null;
            }
            this.gameOverElement.textContent = '';
        }
        if (this.gameActive) return;

        this.startMsgElement.style.display = 'none';
        this.gameOverElement.textContent = '';

        // Wipe screen first, then start the game
        this.screenWipe(() => {
            this.gameActive = true;
            this.gameOver = false;

            // Reset board
            this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
            this.score = 0;
            this.updateScore();

            // Create first piece
            this.spawnPiece();

            // Start background music on first start
            if (Tetris.musicEnabled && Tetris.mainMusic.paused) {
                Tetris.mainMusic.play().catch(e => console.log("Music play blocked:", e));
            }

            // Start falling
            this.updateSpeed(500);
        });
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
        if (this.blinkInterval) {
            clearInterval(this.blinkInterval);
            this.blinkInterval = null;
        }
        this.gameActive = false;
    }

    gameOverHandler() {
        this.stop();
        this.gameOver = true;

        // Blink between GAME OVER and restart hint
        const startKey = this.playerNumber === 1 ? 'Press 1' : 'Press 2';
        let blinkState = true;
        this.gameOverElement.textContent = 'GAME OVER!';
        this.blinkInterval = setInterval(() => {
            blinkState = !blinkState;
            this.gameOverElement.textContent = blinkState
                ? 'GAME OVER!'
                : `${startKey} TO START`;
        }, 1000);
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

        // Check if piece fits
        if (this.collision()) {
            this.gameOverHandler();
        }

        // Reset speed for new piece
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
                this.board.splice(y, 1);
                this.board.unshift(Array(this.cols).fill(0));
                y++;
                linesCleared++;
                this.score += 100 * linesCleared;
                this.updateScore();
            }
        }

        if (linesCleared > 0) {
            this.playSound('destroyLine');

            let remainingLines = linesCleared;
            while (remainingLines > 0) {
                let decremented = false;
                for (let i = Math.min(remainingLines, 4); i >= 1; i--) {
                    if (this.quota[i] > 0) {
                        this.quota[i]--;
                        remainingLines -= i;
                        decremented = true;
                        break;
                    }
                }
                if (!decremented) break;
            }
            this.updateQuotaDisplay();
            this.checkWin();
        }
        return linesCleared;
    }

    checkWin() {
        if (Object.values(this.quota).every(q => q === 0)) {
            Tetris.announceWin(this.playerNumber);
        }
    }

    static announceWin(playerNum) {
        // Stop both games immediately
        if (window.game1) window.game1.stop();
        if (window.game2) window.game2.stop();

        // Immediately wipe both canvases and display win message
        Tetris.currentLevel++;
        Tetris.updateLevelDisplay();
        Tetris.playRandomTrack();

        let wipeDone = 0;
        const afterWipe = (game) => {
            const ctx = game.ctx;
            const w = game.canvas.width;
            const h = game.canvas.height;

            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, w, h);

            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 22px Courier New';
            ctx.fillText(`PLAYER ${playerNum}`, w / 2, h / 2 - 30);
            ctx.fillStyle = '#00f0f0';
            ctx.font = 'bold 18px Courier New';
            ctx.fillText(`WON LEVEL ${Tetris.currentLevel - 1}!`, w / 2, h / 2 + 5);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '14px Courier New';
            ctx.fillText('Next level starting...', w / 2, h / 2 + 40);

            wipeDone++;
            if (wipeDone === 2) {
                setTimeout(() => {
                    if (window.game1) window.game1.startDirect();
                    if (window.game2) window.game2.startDirect();
                }, 2500);
            }
        };

        if (window.game1) window.game1.screenWipe(() => afterWipe(window.game1));
        if (window.game2) window.game2.screenWipe(() => afterWipe(window.game2));
    }

    static updateLevelDisplay() {
        const levelElem = document.getElementById('level-display');
        if (levelElem) {
            levelElem.textContent = `LEVEL ${Tetris.currentLevel}`;
        }
    }

    // Start without screen wipe – used after automatic level transition
    startDirect() {
        this.gameOver = false;
        this.gameActive = true;
        this.startMsgElement.style.display = 'none';
        this.gameOverElement.textContent = '';

        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.score = 0;
        this.quota = Tetris.getLevelQuota(Tetris.currentLevel);
        this.updateScore();
        this.updateQuotaDisplay();
        this.spawnPiece();
        this.updateSpeed(500);
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


    screenWipe(onComplete) {
        const totalRows = this.rows;
        const cellSize = this.cellSize;
        const ctx = this.ctx;
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;

        // Sweeper position = row index of the WHITE (leading) band
        // Starts below the canvas and moves upward (decrements each step)
        let sweeper = totalRows - 1; // start at bottom row
        const msPerStep = 70; // 2x slower for dramatic effect

        const interval = setInterval(() => {
            // Draw 3 bands at sweeper, sweeper+1, sweeper+2
            // White is at sweeper (leading/top), gray at +1, black at +2 (trailing)
            const bands = [
                { row: sweeper, color: '#ffffff' },  // white – leads upward
                { row: sweeper + 1, color: '#555555' },  // gray  – middle
                { row: sweeper + 2, color: '#000000' },  // black – trailing
            ];

            for (const band of bands) {
                if (band.row >= 0 && band.row < totalRows) {
                    ctx.fillStyle = band.color;
                    ctx.fillRect(0, band.row * cellSize, canvasWidth, cellSize);
                }
            }

            sweeper--;

            // Done when black band (sweeper+2) has also left the top (sweeper+2 < 0 → sweeper < -2)
            if (sweeper < -2) {
                clearInterval(interval);
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                if (onComplete) onComplete();
            }
        }, msPerStep);
    }

    draw() {
        // Vyčištění canvasu
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Vykreslení hrací desky
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.board[y][x] !== 0) {
                    this.drawBlock(x, y, this.board[y][x]);
                }
            }
        }

        // Vykreslení aktuální figurky
        if (this.piece && this.gameActive) {
            for (let y = 0; y < this.piece.length; y++) {
                for (let x = 0; x < this.piece[y].length; x++) {
                    if (this.piece[y][x] !== 0) {
                        this.drawBlock(this.pieceX + x, this.pieceY + y, this.pieceType);
                    }
                }
            }
        }

        // Vykreslení mřížky (jemnější)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
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

    drawBlock(x, y, type) {
        let color = this.colors[type];
        if (this.playerNumber === 2) {
            color = this.darkenColor(color, 25);
        }

        const bx = x * this.cellSize;
        const by = y * this.cellSize;
        const size = this.cellSize - 2;

        // Hlavní čtverec
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.roundRect(bx + 1, by + 1, size, size, 4);
        this.ctx.fill();

        // Lesk (horní část)
        const gradient = this.ctx.createLinearGradient(bx, by, bx, by + size);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.roundRect(bx + 1, by + 1, size, size / 2, 4);
        this.ctx.fill();

        // Okraj
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
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
        // Allow starting or restarting by pressing player's number key (or Czech equiv)
        if (!this.gameActive) {
            const p1Keys = ['1', '+'];
            const p2Keys = ['2', 'ě'];
            const myKeys = this.playerNumber === 1 ? p1Keys : p2Keys;
            if (myKeys.includes(e.key)) {
                this.start();
            }
            return;
        }

        // Player controls (WSAD for Player 1, Arrows for Player 2)
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

    handleKeyUp(e) {
        if (!this.gameActive) return;

        // Reset speed to normal (500ms) when releasing fast fall key
        if (this.playerNumber === 1) {
            if (e.key === 's' || e.key === 'S') {
                if (this.currentSpeed === 50) {
                    this.updateSpeed(500);
                }
            }
        } else {
            if (e.key === 'ArrowDown') {
                if (this.currentSpeed === 50) {
                    this.updateSpeed(500);
                }
            }
        }
    }
}

// Game initialization
window.game1 = new Tetris('canvas1', 'score1', 'gameOver1', 'startMsg1', 1);
window.game2 = new Tetris('canvas2', 'score2', 'gameOver2', 'startMsg2', 2);
const { game1, game2 } = window;

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
        Tetris.currentLevel = 1;
        Tetris.updateLevelDisplay();
        game1.stop();
        game2.stop();

        // Wipe both screens then reset
        let wipeDone = 0;
        const afterWipe = () => {
            wipeDone++;
            if (wipeDone === 2) {
                game1.reset();
                game2.reset();
            }
        };
        game1.screenWipe(afterWipe);
        game2.screenWipe(afterWipe);
    }

    if (e.key === 'm' || e.key === 'M') {
        Tetris.musicEnabled = !Tetris.musicEnabled;
        const statusElement = document.getElementById('music-status');
        if (Tetris.musicEnabled) {
            Tetris.mainMusic.play().catch(e => console.log("Music play blocked:", e));
            if (statusElement) statusElement.textContent = 'ON';
        } else {
            Tetris.mainMusic.pause();
            if (statusElement) statusElement.textContent = 'OFF';
        }
    }

    if (e.key === 'b' || e.key === 'B') {
        Tetris.playRandomTrack();
    }
});
