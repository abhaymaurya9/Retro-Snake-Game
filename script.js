// =======================
// DOM ELEMENT REFERENCES
// =======================
// Get references to HTML elements we'll need to manipulate
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d'); // 2D rendering context for drawing
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const gameOverElement = document.getElementById('gameOver');

// =======================
// GAME CONFIGURATION
// =======================
// Constants that define the game's basic parameters
const CELL_SIZE = 20;           // Size of each grid cell in pixels
const CELL_COUNT = 25;          // Number of cells in each direction (25x25 grid)
const OFFSET = 50;              // Offset from canvas edge to game area
const UPDATE_INTERVAL = 200;    // Base update interval in milliseconds

// =======================
// COLOR CONSTANTS
// =======================
// Define colors used throughout the game
const GREEN = '#add462';        // Light green for game background
const DARK_GREEN = '#2b331a';   // Dark green for snake body and borders
const RED = '#e74c3c';          // Red color for food

// =======================
// GAME STATE VARIABLES
// =======================
// Variables that track the current state of the game

// Snake represented as array of coordinate objects
// Starts with 2 segments: head at (6,9) and tail at (5,9)
let snake = [
    { x: 6, y: 9 },
    { x: 5, y: 9 }
];

// Current direction of snake movement
// x: 1 means moving right, y: 1 means moving down
let direction = { x: 1, y: 0 };

// Food position (will be set randomly)
let food = { x: 0, y: 0 };

// Game running state
let running = true;

// Current score
let score = 0;

// Highest score achieved in current session
let highScore = 0;

// Flag to prevent multiple moves per frame
let allowMove = false;

// Timing variables for smooth animation
let lastUpdateTime = 0;
let gameSpeed = 200; // Current game speed in milliseconds

// =======================
// AUDIO FUNCTIONS
// =======================
// Functions to generate retro-style sound effects using Web Audio API

/**
 * Plays a sound when snake eats food
 * Creates a rising tone effect
 */
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

/**
 * Plays a sound when game ends
 * Creates a falling tone effect
 */
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

// =======================
// UTILITY FUNCTIONS
// =======================
// Helper functions for game logic

/**
 * Checks if a given element exists in an array
 * Used to check if food spawns on snake body
 * @param {Object} element - The element to search for
 * @param {Array} array - The array to search in
 * @returns {boolean} - True if element exists in array
 */
function elementInArray(element, array) {
    return array.some(item => item.x === element.x && item.y === element.y);
}

/**
 * Generates a random cell position within the game grid
 * @returns {Object} - Object with x and y coordinates
 */
function generateRandomCell() {
    return {
        x: Math.floor(Math.random() * CELL_COUNT),
        y: Math.floor(Math.random() * CELL_COUNT)
    };
}

/**
 * Generates a random food position that doesn't overlap with snake
 * @returns {Object} - Object with x and y coordinates for food
 */
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

// =======================
// DRAWING FUNCTIONS
// =======================
// Functions responsible for rendering game elements

/**
 * Draws a simple rectangle on the canvas
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Width of rectangle
 * @param {number} height - Height of rectangle
 * @param {string} color - Fill color
 */
function drawRectangle(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
}

/**
 * Draws a rectangle with rounded corners
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Width of rectangle
 * @param {number} height - Height of rectangle
 * @param {number} radius - Corner radius
 * @param {string} color - Fill color
 */
function drawRoundedRectangle(x, y, width, height, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
}

/**
 * Draws the entire snake
 * Each segment is drawn as a rounded rectangle
 * The head gets eyes drawn on it
 */
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

/**
 * Draws eyes on the snake's head
 * Eye position depends on current movement direction
 * @param {number} headX - X pixel coordinate of head
 * @param {number} headY - Y pixel coordinate of head
 */
function drawSnakeEyes(headX, headY) {
    const eyeSize = 3;
    const eyeOffset = 5;
    
    // Determine eye positions based on movement direction
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

// =======================
// GAME LOGIC FUNCTIONS
// =======================
// Functions that handle game mechanics

/**
 * Updates the snake's position and handles collisions
 * This is the main game logic function
 */
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

/**
 * Handles game over state
 * Updates high score if necessary
 */
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

/**
 * Resets the game to initial state
 */
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

// =======================
// MAIN GAME LOOP
// =======================
/**
 * Main game loop that runs continuously
 * Handles timing, updates, and rendering
 * @param {number} currentTime - Current timestamp from requestAnimationFrame
 */
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

// =======================
// EVENT HANDLING
// =======================
// Handle keyboard input for snake movement and game restart
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

// =======================
// GAME INITIALIZATION
// =======================
// Initialize game and start the game loop
food = generateRandomFood();
requestAnimationFrame(gameLoop);