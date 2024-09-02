// Constants
const CANVAS_SIZE = 600;
const CIRCLE_RADIUS = 250;
const PADDLE_HEIGHT = 80; // Increased from 70 to 80
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

// Powerup constants
const POWERUP_SIZE = 40; // Increased size for better visibility
const POWERUP_DURATION = 15000; // 15 seconds
const POWERUP_TYPES = ['speedBoost', 'sizeIncrease', 'slowMotion'];

// Modify game variables
let activePowerups = [];
let activePowerupTypes = new Set();
let powerupSpawnInterval;

// Add new Star class
class Star {
    constructor() {
        this.x = Math.random() * CANVAS_SIZE;
        this.y = Math.random() * CANVAS_SIZE;
        this.size = Math.random() * 1.5 + 0.5;
        this.opacity = Math.random();
        this.fadeDirection = Math.random() < 0.5 ? -1 : 1;
    }

    update() {
        this.opacity += this.fadeDirection * 0.01;
        if (this.opacity <= 0 || this.opacity >= 1) {
            this.fadeDirection *= -1;
        }
    }

    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Create stars array
const stars = Array(200).fill().map(() => new Star());

// Add these variables to the game variables section
let ballSpeedMultiplier = 1;
let paddleSizeMultiplier = 1;

// Add this variable at the top of your file with other game constants
const maxBallSpeed = 8; // Adjust this value as needed

// Add these variables at the top of your file
let canvasScale = 1;
let canvasOffsetX = 0;
let canvasOffsetY = 0;

// Add this constant at the top of your file
const MOBILE_SCREEN_THRESHOLD = 600;

// Add these variables to the game variables section
let isMobileDevice = false;
let mobileBallSpeedMultiplier = 0.55; // Changed from 0.7 to 0.55 (about 21% slower)
let mobilePaddleSizeMultiplier = 1.2;

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
    
    // Modify the event listeners for the Play Again button
    const playAgainButton = document.getElementById('playAgainButton');
    playAgainButton.addEventListener('click', handlePlayAgain);
    playAgainButton.addEventListener('touchstart', handlePlayAgain);
    console.log('Play Again button listeners added');
    
    // Initialize audio
    paddleHitSound = document.getElementById('paddleHitSound');
    gameStartSound = document.getElementById('gameStartSound');
    gameOverSound = document.getElementById('gameOverSound');
    backgroundMusic = document.getElementById('backgroundMusic');

    // Set up audio control event listeners
    document.getElementById('toggleSfx').addEventListener('click', toggleSfx);
    document.getElementById('toggleMusic').addEventListener('click', toggleMusic);

    // Check if icons are loaded
    POWERUP_TYPES.forEach(type => {
        const icon = document.getElementById(`${type}Icon`);
        console.log(`${type} icon loaded:`, icon.complete);
    });

    // Draw initial game state
    draw();

    // Add this after setting up the canvas
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Add touch event listeners for mobile
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);

    // Check if it's a mobile device
    isMobileDevice = window.innerWidth <= MOBILE_SCREEN_THRESHOLD;
}

// Update the handlePlayAgain function
function handlePlayAgain(event) {
    event.preventDefault(); // Prevent default touch behavior
    event.stopPropagation(); // Stop the event from bubbling up
    console.log('Play Again button pressed'); // Add this line for debugging
    startGame();
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
    
    resetPowerups();
    
    initPowerups();
    gameLoop();

    // Adjust initial ball speed and paddle size for mobile devices
    if (isMobileDevice) {
        ball.dx *= mobileBallSpeedMultiplier;
        ball.dy *= mobileBallSpeedMultiplier;
        paddleSizeMultiplier = mobilePaddleSizeMultiplier;
    }
}

function gameLoop() {
    if (gameRunning) {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
}

function update() {
    // Update stars
    stars.forEach(star => star.update());

    // Move the ball
    ball.x += ball.dx * ballSpeedMultiplier;
    ball.y += ball.dy * ballSpeedMultiplier;

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
        const paddleLeftAngle = paddleAngle - Math.atan(PADDLE_HEIGHT * paddleSizeMultiplier / (2 * CIRCLE_RADIUS));
        const paddleRightAngle = paddleAngle + Math.atan(PADDLE_HEIGHT * paddleSizeMultiplier / (2 * CIRCLE_RADIUS));
        
        if (ballAngle >= paddleLeftAngle && ballAngle <= paddleRightAngle) {
            // Ball hit the paddle
            const hitAngle = ballAngle - paddleAngle;
            const normalizedHitAngle = hitAngle / (Math.atan(PADDLE_HEIGHT * paddleSizeMultiplier / (2 * CIRCLE_RADIUS))); // Range: -1 to 1
            
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

            // Move the ball just outside the circle to prevent multiple collisions
            const newBallDistance = CIRCLE_RADIUS - BALL_RADIUS - 1;
            ball.x = CANVAS_SIZE / 2 + Math.cos(ballAngle) * newBallDistance;
            ball.y = CANVAS_SIZE / 2 + Math.sin(ballAngle) * newBallDistance;

            score++;
            levelProgress++;
            checkLevelUp();
            playSound(paddleHitSound);

            // Add flash effect
            addPaddleFlashEffect();
        } else {
            // Game over
            endGame();
        }
    }

    updatePowerups();

    // Ensure minimum ball speed
    const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy) * ballSpeedMultiplier;
    if (currentSpeed < 1) {
        const minSpeed = 3;
        const speedUpFactor = minSpeed / currentSpeed;
        ball.dx *= speedUpFactor;
        ball.dy *= speedUpFactor;
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

        // Limit maximum speed on mobile devices
        if (isMobileDevice) {
            const mobileMaxSpeed = MAX_SPEED * mobileBallSpeedMultiplier;
            if (currentSpeed > mobileMaxSpeed) {
                const scaleFactor = mobileMaxSpeed / currentSpeed;
                ball.dx *= scaleFactor;
                ball.dy *= scaleFactor;
            }
        }
    }
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw stars
    stars.forEach(star => {
        star.update();
        star.draw();
    });

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
        const paddleHeight = PADDLE_HEIGHT * paddleSizeMultiplier * (isMobileDevice ? mobilePaddleSizeMultiplier : 1);
        ctx.fillRect(CIRCLE_RADIUS - PADDLE_WIDTH / 2, -paddleHeight / 2, PADDLE_WIDTH, paddleHeight);
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

    drawPowerups();

    // Draw active powerups UI
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    activePowerups.forEach((powerup, index) => {
        if (powerup.active) {
            const timeLeft = Math.max(0, POWERUP_DURATION - (Date.now() - powerup.activatedAt));
            ctx.fillText(`${powerup.type}: ${Math.ceil(timeLeft / 1000)}s`, 10, 90 + index * 25);
        }
    });
}

function movePaddle(event) {
    updatePaddlePosition(event);
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
    const playAgainButton = document.getElementById('playAgainButton');
    playAgainButton.style.display = 'block';
    playAgainButton.style.zIndex = '1000'; // Ensure it's on top
    console.log('Game over, Play Again button should be visible'); // Add this line for debugging
    playSound(gameOverSound);
    stopMusic();
    clearInterval(powerupSpawnInterval);
    
    resetPowerups();
    
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

function initPowerups() {
    clearInterval(powerupSpawnInterval);
    const spawnInterval = window.innerWidth <= MOBILE_SCREEN_THRESHOLD ? 15000 : 10000;
    powerupSpawnInterval = setInterval(spawnPowerup, spawnInterval);
}

function spawnPowerup() {
    if (!gameRunning) return;

    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * (CIRCLE_RADIUS - POWERUP_SIZE);
    const x = CANVAS_SIZE / 2 + Math.cos(angle) * distance;
    const y = CANVAS_SIZE / 2 + Math.sin(angle) * distance;

    activePowerups.push({
        type,
        x,
        y,
        active: false,
        activatedAt: null,
        spawnTime: Date.now()
    });
}

const POWERUP_LIFETIME = 15000; // 15 seconds in milliseconds

function updatePowerups() {
    const currentTime = Date.now();

    activePowerups = activePowerups.filter(powerup => {
        if (!powerup.active) {
            // Check if the powerup has been on the field for too long
            if (currentTime - powerup.spawnTime > POWERUP_LIFETIME) {
                return false; // Remove the powerup
            }

            const dx = ball.x - powerup.x;
            const dy = ball.y - powerup.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < BALL_RADIUS + POWERUP_SIZE / 2) {
                activatePowerup(powerup);
                return true;
            }
        } else if (currentTime - powerup.activatedAt > POWERUP_DURATION) {
            deactivatePowerup(powerup);
            return false;
        }
        return true;
    });
}

function activatePowerup(powerup) {
    if (activePowerupTypes.has(powerup.type)) {
        // If powerup of the same type is already active, just reset its duration
        const existingPowerup = activePowerups.find(p => p.type === powerup.type && p.active);
        if (existingPowerup) {
            existingPowerup.activatedAt = Date.now();
        }
    } else {
        powerup.active = true;
        powerup.activatedAt = Date.now();
        activePowerupTypes.add(powerup.type);

        switch (powerup.type) {
            case 'speedBoost':
                ballSpeedMultiplier *= isMobileDevice ? 1.1 : 1.25;
                break;
            case 'sizeIncrease':
                paddleSizeMultiplier *= isMobileDevice ? 1.3 : 1.5;
                break;
            case 'slowMotion':
                ballSpeedMultiplier *= isMobileDevice ? 0.7 : 0.5;
                break;
        }
    }
}

function deactivatePowerup(powerup) {
    activePowerupTypes.delete(powerup.type);

    switch (powerup.type) {
        case 'speedBoost':
            ballSpeedMultiplier /= isMobileDevice ? 1.1 : 1.25;
            break;
        case 'sizeIncrease':
            paddleSizeMultiplier /= isMobileDevice ? 1.3 : 1.5;
            break;
        case 'slowMotion':
            ballSpeedMultiplier /= isMobileDevice ? 0.7 : 0.5;
            break;
    }
}

function drawPowerups() {
    activePowerups.forEach(powerup => {
        if (!powerup.active) {
            // Set unique background colors for each powerup type
            let backgroundColor;
            switch (powerup.type) {
                case 'speedBoost':
                    backgroundColor = 'rgba(100, 200, 100, 0.7)'; // Light green
                    break;
                case 'sizeIncrease':
                    backgroundColor = 'rgba(200, 100, 100, 0.7)'; // Light red
                    break;
                case 'slowMotion':
                    backgroundColor = 'rgba(100, 100, 200, 0.7)'; // Light blue
                    break;
                default:
                    backgroundColor = 'rgba(200, 200, 200, 0.7)'; // Default light gray
            }

            // Draw circular background
            ctx.beginPath();
            ctx.arc(powerup.x, powerup.y, POWERUP_SIZE / 2, 0, Math.PI * 2);
            ctx.fillStyle = backgroundColor; // Use the unique background color
            ctx.fill();
            
            // Add white border
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw powerup icon
            const icon = document.getElementById(`${powerup.type}Icon`);
            const iconSize = POWERUP_SIZE * 0.7; // Slightly larger icon
            ctx.drawImage(
                icon,
                powerup.x - iconSize / 2,
                powerup.y - iconSize / 2,
                iconSize,
                iconSize
            );
        }
    });
}

function resetPowerups() {
    activePowerups = [];
    activePowerupTypes.clear();
    ballSpeedMultiplier = isMobileDevice ? mobileBallSpeedMultiplier : 1;
    paddleSizeMultiplier = isMobileDevice ? mobilePaddleSizeMultiplier : 1;
}

function addPaddleFlashEffect() {
    const paddle = document.createElement('div');
    paddle.style.position = 'absolute';
    
    // Calculate scaled dimensions
    const scaledWidth = PADDLE_WIDTH * canvasScale;
    const scaledHeight = PADDLE_HEIGHT * paddleSizeMultiplier * canvasScale;
    
    paddle.style.width = `${scaledWidth}px`;
    paddle.style.height = `${scaledHeight}px`;
    
    // Calculate scaled position
    const scaledCenterX = CANVAS_SIZE / 2 * canvasScale;
    const scaledCenterY = CANVAS_SIZE / 2 * canvasScale;
    const scaledRadius = CIRCLE_RADIUS * canvasScale;
    
    const left = scaledCenterX + Math.cos(paddleAngle) * scaledRadius - scaledWidth / 2 + canvasOffsetX;
    const top = scaledCenterY + Math.sin(paddleAngle) * scaledRadius - scaledHeight / 2 + canvasOffsetY;
    
    paddle.style.left = `${left}px`;
    paddle.style.top = `${top}px`;
    paddle.style.transform = `rotate(${paddleAngle}rad)`;
    paddle.classList.add('paddle-flash');

    document.getElementById('gameContainer').appendChild(paddle);

    setTimeout(() => {
        paddle.remove();
    }, 300); // Remove after animation completes
}

function resizeCanvas() {
    const container = document.getElementById('gameContainer');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Determine the size while maintaining aspect ratio
    const aspectRatio = CANVAS_SIZE / CANVAS_SIZE; // This is 1 for a square canvas
    let newWidth, newHeight;

    if (containerWidth / containerHeight > aspectRatio) {
        // Container is wider than needed
        newHeight = containerHeight;
        newWidth = newHeight * aspectRatio;
    } else {
        // Container is taller than needed
        newWidth = containerWidth;
        newHeight = newWidth / aspectRatio;
    }
    
    canvasScale = newWidth / CANVAS_SIZE;
    
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
    
    canvasOffsetX = (containerWidth - newWidth) / 2;
    canvasOffsetY = (containerHeight - newHeight) / 2;
    
    canvas.style.position = 'absolute';
    canvas.style.left = `${canvasOffsetX}px`;
    canvas.style.top = `${canvasOffsetY}px`;

    updateButtonPositions();
}

function updateButtonPositions() {
    const audioControls = document.getElementById('audioControls');
    audioControls.style.bottom = `${canvasOffsetY + 20}px`;
    audioControls.style.left = `${canvasOffsetX + 20}px`;
    audioControls.style.width = `${canvas.offsetWidth - 40}px`;
}

function handleTouchStart(event) {
    event.preventDefault();
    updatePaddlePosition(event.touches[0]);
}

function handleTouchMove(event) {
    event.preventDefault();
    updatePaddlePosition(event.touches[0]);
}

function updatePaddlePosition(touch) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    
    const canvasX = (touch.clientX - rect.left) * scaleX;
    const canvasY = (touch.clientY - rect.top) * scaleY;
    
    const mouseX = canvasX - CANVAS_SIZE / 2;
    const mouseY = canvasY - CANVAS_SIZE / 2;
    paddleAngle = Math.atan2(mouseY, mouseX);
}

window.onload = init;

