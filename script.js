
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d'); // 2D rendering context for drawing
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const gameOverElement = document.getElementById('gameOver');

const CELL_SIZE = 20;           // Size of each grid cell in pixels
const CELL_COUNT = 25;          // Number of cells in each direction (25x25 grid)
const OFFSET = 50;              // Offset from canvas edge to game area
const UPDATE_INTERVAL = 200;    // Base update interval in milliseconds


const GREEN = '#add462';        // Light green for game background
const DARK_GREEN = '#2b331a';   // Dark green for snake body and borders
const RED = '#e74c3c';          // Red color for food

let snake = [
    { x: 6, y: 9 },
    { x: 5, y: 9 }
];


let direction = { x: 1, y: 0 };

let food = { x: 0, y: 0 };

let running = true;

let score = 0;

let highScore = 0;

let allowMove = false;

let lastUpdateTime = 0;
let gameSpeed = 200; // Current game speed in milliseconds

function playEatSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect audio nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Create rising frequency effect (800Hz to 1200Hz)
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
    
    // Create fade-out effect
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    // Play the sound for 0.1 seconds
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}


function playGameOverSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect audio nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Create falling frequency effect (400Hz to 200Hz)
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);
    
    // Create fade-out effect
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    // Play the sound for 0.3 seconds
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

function elementInArray(element, array) {
    return array.some(item => item.x === element.x && item.y === element.y);
}


function generateRandomCell() {
    return {
        x: Math.floor(Math.random() * CELL_COUNT),
        y: Math.floor(Math.random() * CELL_COUNT)
    };
}

function generateRandomFood() {
    let newFood = generateRandomCell();
    let attempts = 0;
    const maxAttempts = CELL_COUNT * CELL_COUNT;
    
    // Keep generating new positions until we find one not on the snake
    while (elementInArray(newFood, snake) && attempts < maxAttempts) {
        newFood = generateRandomCell();
        attempts++;
    }
    
    return newFood;
}

function drawRectangle(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
}

function drawRoundedRectangle(x, y, width, height, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
}

function drawSnake() {
    snake.forEach((segment, index) => {
        // Calculate pixel position from grid coordinates
        const x = OFFSET + segment.x * CELL_SIZE;
        const y = OFFSET + segment.y * CELL_SIZE;
        
        // Draw segment as rounded rectangle
        drawRoundedRectangle(x, y, CELL_SIZE, CELL_SIZE, 8, DARK_GREEN);
        
        // Draw eyes on the head (first segment)
        if (index === 0) {
            drawSnakeEyes(x, y);
        }
    });
}

function drawSnakeEyes(headX, headY) {
    const eyeSize = 3;
    const eyeOffset = 5;

    let leftEyeX, leftEyeY, rightEyeX, rightEyeY;
    
    if (direction.x === 1) { // Moving right
        leftEyeX = headX + CELL_SIZE - eyeOffset;
        leftEyeY = headY + eyeOffset;
        rightEyeX = headX + CELL_SIZE - eyeOffset;
        rightEyeY = headY + CELL_SIZE - eyeOffset;
    } else if (direction.x === -1) { // Moving left
        leftEyeX = headX + eyeOffset;
        leftEyeY = headY + eyeOffset;
        rightEyeX = headX + eyeOffset;
        rightEyeY = headY + CELL_SIZE - eyeOffset;
    } else if (direction.y === -1) { // Moving up
        leftEyeX = headX + eyeOffset;
        leftEyeY = headY + eyeOffset;
        rightEyeX = headX + CELL_SIZE - eyeOffset;
        rightEyeY = headY + eyeOffset;
    } else { // Moving down
        leftEyeX = headX + eyeOffset;
        leftEyeY = headY + CELL_SIZE - eyeOffset;
        rightEyeX = headX + CELL_SIZE - eyeOffset;
        rightEyeY = headY + CELL_SIZE - eyeOffset;
    }
    
    // Draw white eye background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw black pupils
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(leftEyeX, leftEyeY, eyeSize - 1, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(rightEyeX, rightEyeY, eyeSize - 1, 0, 2 * Math.PI);
    ctx.fill();
}

/**
 * Draws the food as a red square
 */
function drawFood() {
    // Calculate pixel position from grid coordinates
    const x = OFFSET + food.x * CELL_SIZE;
    const y = OFFSET + food.y * CELL_SIZE;
    drawRectangle(x, y, CELL_SIZE, CELL_SIZE, RED);
}

function updateSnake() {
    // Create new head position based on current direction
    const head = { ...snake[0] };
    head.x += direction.x;
    head.y += direction.y;
    
    // Check wall collision BEFORE moving
    if (head.x < 0 || head.x >= CELL_COUNT || head.y < 0 || head.y >= CELL_COUNT) {
        gameOver();
        return;
    }
    
    // Check self collision BEFORE moving
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }
    
    // If no collision, proceed with movement
    // Add new head to front of snake
    snake.unshift(head);
    
    // Check if snake ate food
    if (head.x === food.x && head.y === food.y) {
        // Generate new food position
        food = generateRandomFood();
        
        // Increase score
        score++;
        scoreElement.textContent = score;
        
        // Play eat sound
        playEatSound();
        
        // Increase speed every 2 balls eaten
        if (score % 2 === 0) {
            // Decrease interval by 10ms, minimum 60ms for smooth animation
            gameSpeed = Math.max(60, gameSpeed - 10);
        }
    } else {
        // Remove tail segment (snake doesn't grow)
        snake.pop();
    }
}

function gameOver() {
    running = false;
    
    // Update high score if current score is higher
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = `High Score: ${highScore}`;
    }
    
    // Show game over message
    gameOverElement.style.display = 'block';
    
    // Play game over sound
    playGameOverSound();
}


function resetGame() {
    // Reset snake to initial position
    snake = [
        { x: 6, y: 9 },
        { x: 5, y: 9 }
    ];
    
    // Reset direction to moving right
    direction = { x: 1, y: 0 };
    
    // Generate new food position
    food = generateRandomFood();
    
    // Reset game state
    running = true;
    score = 0;
    gameSpeed = 200; // Reset to initial speed
    
    // Update UI
    scoreElement.textContent = score;
    gameOverElement.style.display = 'none';
    
    // Reset movement flag
    allowMove = false;
}


function gameLoop(currentTime) {
    // Check if enough time has passed for next update
    if (currentTime - lastUpdateTime >= gameSpeed) {
        allowMove = true;
        
        // Update game state if running
        if (running) {
            updateSnake();
        }
        
        // Update last update time
        lastUpdateTime = currentTime;
    }
    
    // Clear canvas with background color
    ctx.fillStyle = GREEN;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw game border
    ctx.strokeStyle = DARK_GREEN;
    ctx.lineWidth = 5;
    ctx.strokeRect(OFFSET - 5, OFFSET - 5, CELL_SIZE * CELL_COUNT + 10, CELL_SIZE * CELL_COUNT + 10);
    
    // Draw game elements
    drawFood();
    drawSnake();
    
    // Schedule next frame
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
    // Prevent multiple moves per frame
    if (!allowMove && running) return;
    
    switch(e.key) {
        case 'ArrowUp':
            // Prevent moving directly opposite to current direction
            if (direction.y !== 1) {
                direction = { x: 0, y: -1 };
                allowMove = false;
            }
            break;
        case 'ArrowDown':
            if (direction.y !== -1) {
                direction = { x: 0, y: 1 };
                allowMove = false;
            }
            break;
        case 'ArrowLeft':
            if (direction.x !== 1) {
                direction = { x: -1, y: 0 };
                allowMove = false;
            }
            break;
        case 'ArrowRight':
            if (direction.x !== -1) {
                direction = { x: 1, y: 0 };
                allowMove = false;
            }
            break;
        case ' ':
            // Restart game if it's over
            if (!running) {
                resetGame();
            }
            break;
    }
});

food = generateRandomFood();
requestAnimationFrame(gameLoop);
