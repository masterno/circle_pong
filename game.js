// Constants
const CANVAS_SIZE = 600;
const CIRCLE_RADIUS = 250;
const PADDLE_HEIGHT = 60;
const PADDLE_WIDTH = 10;
const BALL_RADIUS = 10;

// Level system constants
const LEVEL_UP_SCORE = 5; // Score needed to level up
const SPEED_INCREASE = 0.5; // Speed increase per level
const MAX_SPEED = 10; // Maximum ball speed

// Game variables
let canvas, ctx;
let paddleAngle = 0;
let ball = { x: 0, y: 0, dx: 3, dy: 3 };
let score = 0;
let gameRunning = false;
let gameOver = false;
let level = 1;
let levelProgress = 0;

// Audio variables
let paddleHitSound, gameStartSound, gameOverSound, backgroundMusic;
let sfxEnabled = true;
let musicEnabled = true;

function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    // Initialize ball position
    resetBall();

    // Set up event listeners
    document.addEventListener('mousemove', movePaddle);
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('playAgainButton').addEventListener('click', startGame);

    // Initialize audio
    paddleHitSound = document.getElementById('paddleHitSound');
    gameStartSound = document.getElementById('gameStartSound');
    gameOverSound = document.getElementById('gameOverSound');
    backgroundMusic = document.getElementById('backgroundMusic');

    // Set up audio control event listeners
    document.getElementById('toggleSfx').addEventListener('click', toggleSfx);
    document.getElementById('toggleMusic').addEventListener('click', toggleMusic);

    // Draw initial game state
    draw();
}

function startGame() {
    gameRunning = true;
    gameOver = false;
    score = 0;
    level = 1;
    levelProgress = 0;
    resetBall();
    document.getElementById('startButton').style.display = 'none';
    document.getElementById('playAgainButton').style.display = 'none';
    playSound(gameStartSound);
    playMusic();
    gameLoop();
}

function gameLoop() {
    if (gameRunning) {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
}

function update() {
    // Move the ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Ball collision with walls
    if (ball.x < BALL_RADIUS || ball.x > CANVAS_SIZE - BALL_RADIUS) {
        ball.dx = -ball.dx;
    }
    if (ball.y < BALL_RADIUS || ball.y > CANVAS_SIZE - BALL_RADIUS) {
        ball.dy = -ball.dy;
    }

    // Ball collision with paddle
    const ballAngle = Math.atan2(ball.y - CANVAS_SIZE / 2, ball.x - CANVAS_SIZE / 2);
    const ballDistance = Math.sqrt((ball.x - CANVAS_SIZE / 2) ** 2 + (ball.y - CANVAS_SIZE / 2) ** 2);

    if (ballDistance > CIRCLE_RADIUS - BALL_RADIUS) {
        if (Math.abs(ballAngle - paddleAngle) < Math.PI / 8) {
            // Ball hit the paddle
            const hitAngle = ballAngle - paddleAngle;
            const normalizedHitAngle = hitAngle / (Math.PI / 8); // Range: -1 to 1
            
            // Calculate reflection vector
            const normal = [Math.cos(ballAngle), Math.sin(ballAngle)];
            const dot = ball.dx * normal[0] + ball.dy * normal[1];
            let reflectX = ball.dx - 2 * dot * normal[0];
            let reflectY = ball.dy - 2 * dot * normal[1];
            
            // Add deflection based on hit position
            const deflectionFactor = 0.4; // Adjust this value to control deflection strength
            reflectX += normalizedHitAngle * deflectionFactor * Math.abs(reflectY);
            reflectY -= normalizedHitAngle * deflectionFactor * Math.abs(reflectX);
            
            // Normalize and set new velocity
            const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            const newSpeed = Math.sqrt(reflectX * reflectX + reflectY * reflectY);
            ball.dx = (reflectX / newSpeed) * speed;
            ball.dy = (reflectY / newSpeed) * speed;

            score++;
            levelProgress++;
            checkLevelUp();
            playSound(paddleHitSound);
        } else {
            // Game over
            endGame();
        }
    }
}

function checkLevelUp() {
    if (levelProgress >= LEVEL_UP_SCORE) {
        level++;
        levelProgress = 0;
        increaseBallSpeed();
    }
}

function increaseBallSpeed() {
    const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    if (currentSpeed < MAX_SPEED) {
        const speedMultiplier = (currentSpeed + SPEED_INCREASE) / currentSpeed;
        ball.dx *= speedMultiplier;
        ball.dy *= speedMultiplier;
    }
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw circle
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = 'white';
    ctx.stroke();

    if (!gameOver) {
        // Draw paddle
        ctx.save();
        ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
        ctx.rotate(paddleAngle);
        ctx.fillStyle = 'white';
        ctx.fillRect(CIRCLE_RADIUS - PADDLE_WIDTH / 2, -PADDLE_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT);
        ctx.restore();

        // Draw ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();

        // Draw score and level
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText('Score: ' + score, 10, 30);
        ctx.fillText('Level: ' + level, 10, 60);
    } else {
        // Draw game over screen
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over!', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 70);
        ctx.font = '36px Arial';
        ctx.fillText('Final Score: ' + score, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
        ctx.fillText('Highest Level: ' + level, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 50);
        ctx.textAlign = 'start';
    }
}

function movePaddle(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left - CANVAS_SIZE / 2;
    const mouseY = event.clientY - rect.top - CANVAS_SIZE / 2;
    paddleAngle = Math.atan2(mouseY, mouseX);
}

function resetBall() {
    ball.x = CANVAS_SIZE / 2;
    ball.y = CANVAS_SIZE / 2;
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * 3;
    ball.dy = (Math.random() > 0.5 ? 1 : -1) * 3;
}

function endGame() {
    gameRunning = false;
    gameOver = true;
    document.getElementById('playAgainButton').style.display = 'block';
    playSound(gameOverSound);
    stopMusic();
    draw(); // Redraw to show the game over screen
}

// Audio control functions
function toggleSfx() {
    sfxEnabled = !sfxEnabled;
    updateButtonText('toggleSfx', sfxEnabled ? 'SFX: ON' : 'SFX: OFF');
}

function toggleMusic() {
    musicEnabled = !musicEnabled;
    updateButtonText('toggleMusic', musicEnabled ? 'Music: ON' : 'Music: OFF');
    if (musicEnabled) {
        playMusic();
    } else {
        stopMusic();
    }
}

function playSound(sound) {
    if (sfxEnabled && sound) {
        sound.currentTime = 0;
        sound.play();
    }
}

function playMusic() {
    if (musicEnabled && backgroundMusic) {
        backgroundMusic.loop = true;
        backgroundMusic.play();
    }
}

function stopMusic() {
    if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
    }
}

function updateButtonText(buttonId, text) {
    document.getElementById(buttonId).textContent = text;
}

window.onload = init;

