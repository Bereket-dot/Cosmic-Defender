const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const multiplierDisplay = document.getElementById('multiplierDisplay');
const healthFill = document.getElementById('healthFill');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScore = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const powerupIndicator = document.getElementById('powerupIndicator');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let gameRunning = false;
let score = 0;
let multiplier = 1;
let multiplierTimer = 0;
let multiplierTimeout = 3000;
let health = 100;
let maxHealth = 100;
let lastTime = 0;
let enemies = [];
let bullets = [];
let particles = [];
let powerups = [];
let stars = [];
let player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 50,
    height: 70,
    speed: 8,
    color: '#00ccff',
    lastShot: 0,
    shootDelay: 300,
    powerupActive: false,
    powerupType: null,
    powerupEndTime: 0
};

const sounds = {
    shoot: new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...'),
    explosion: new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...'),
    powerup: new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...'),
    hit: new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...')
};

function createStars() {
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3,
            speed: 0.2 + Math.random() * 0.8,
            alpha: 0.1 + Math.random() * 0.9
        });
    }
}

function updateStars() {
    for (let star of stars) {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    }
}

function drawStars() {
    ctx.save();
    for (let star of stars) {
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = 'white';
        ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.restore();
}

function spawnEnemy() {
    const size = 30 + Math.random() * 30;
    const speed = 1 + Math.random() * 3;
    const health = Math.floor(size / 10);
    const x = Math.random() * (canvas.width - size);
    
    enemies.push({
        x: x,
        y: -size,
        width: size,
        height: size,
        speed: speed,
        health: health,
        maxHealth: health,
        color: `hsl(${Math.random() * 60 + 330}, 80%, 50%)`,
        lastShot: 0,
        shootDelay: 2000 + Math.random() * 3000,
        value: Math.floor(size / 5)
    });
}

function spawnPowerup(x, y) {
    if (Math.random() > 0.3) return;
    
    const types = ['health', 'rapidfire', 'shield', 'multiplier'];
    const type = types[Math.floor(Math.random() * types.length)];
    let color;
    
    switch (type) {
        case 'health': color = '#00ff00'; break;
        case 'rapidfire': color = '#ff9900'; break;
        case 'shield': color = '#0099ff'; break;
        case 'multiplier': color = '#ff00ff'; break;
    }
    
    powerups.push({
        x: x,
        y: y,
        width: 20,
        height: 20,
        speed: 2,
        color: color,
        type: type
    });
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            size: 2 + Math.random() * 4,
            color: color,
            speedX: -2 + Math.random() * 4,
            speedY: -2 + Math.random() * 4,
            life: 30 + Math.random() * 30,
            alpha: 1
        });
    }
}

function shootBullet(x, y, isPlayer) {
    bullets.push({
        x: x,
        y: y,
        width: 5,
        height: 15,
        speed: isPlayer ? -10 : 5,
        color: isPlayer ? '#00ffff' : '#ff0000',
        isPlayer: isPlayer
    });
    
    if (isPlayer) {
        try { sounds.shoot.currentTime = 0; sounds.shoot.play(); } catch(e) {}
    }
}

function updatePlayer(deltaTime) {
    const mouseX = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
    const mouseY = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y));
    
    player.x += (mouseX - player.x) * 0.1;
    player.y += (mouseY - player.y) * 0.1;
    
    if (player.powerupActive && Date.now() > player.powerupEndTime) {
        player.powerupActive = false;
        player.powerupType = null;
        powerupIndicator.style.opacity = '0';
        
        if (player.powerupType === 'rapidfire') {
            player.shootDelay = 300;
        }
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.y += bullet.speed;
        
        if (bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(i, 1);
            continue;
        }
        
        if (bullet.isPlayer) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                if (checkCollision(bullet, enemy)) {
                    enemy.health--;
                    bullets.splice(i, 1);
                    
                    createParticles(bullet.x, bullet.y, bullet.color, 5);
                    
                    if (enemy.health <= 0) {
                        score += enemy.value * multiplier;
                        multiplierTimer = Date.now() + multiplierTimeout;
                        multiplier = Math.min(multiplier + 0.2, 10);
                        
                        createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 20);
                        spawnPowerup(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                        enemies.splice(j, 1);
                        
                        try { sounds.explosion.currentTime = 0; sounds.explosion.play(); } catch(e) {}
                    } else {
                        try { sounds.hit.currentTime = 0; sounds.hit.play(); } catch(e) {}
                    }
                    break;
                }
            }
        } else {
            if (checkCollision(bullet, player) && !player.powerupActive) {
                health -= 10;
                healthFill.style.width = `${(health / maxHealth) * 100}%`;
                bullets.splice(i, 1);
                createParticles(bullet.x, bullet.y, bullet.color, 10);
                
                if (health <= 0) {
                    gameOver();
                }
                
                try { sounds.hit.currentTime = 0; sounds.hit.play(); } catch(e) {}
            }
        }
    }
}

function updateEnemies(deltaTime) {
    if (Math.random() < 0.02 && enemies.length < 15) {
        spawnEnemy();
    }
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.y += enemy.speed;
        
        if (enemy.y > canvas.height + enemy.height) {
            enemies.splice(i, 1);
            continue;
        }
        
        if (Date.now() - enemy.lastShot > enemy.shootDelay) {
            shootBullet(enemy.x + enemy.width / 2, enemy.y + enemy.height, false);
            enemy.lastShot = Date.now();
        }
        
        if (checkCollision(enemy, player)) {
            health -= 20;
            healthFill.style.width = `${(health / maxHealth) * 100}%`;
            enemies.splice(i, 1);
            createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 30);
            
            if (health <= 0) {
                gameOver();
            }
            
            try { sounds.explosion.currentTime = 0; sounds.explosion.play(); } catch(e) {}
        }
    }
}

function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        powerup.y += powerup.speed;
        
        if (powerup.y > canvas.height + powerup.height) {
            powerups.splice(i, 1);
            continue;
        }
        
        if (checkCollision(powerup, player)) {
            applyPowerup(powerup);
            powerups.splice(i, 1);
            createParticles(powerup.x + powerup.width / 2, powerup.y + powerup.height / 2, powerup.color, 15);
            
            try { sounds.powerup.currentTime = 0; sounds.powerup.play(); } catch(e) {}
        }
    }
}

function applyPowerup(powerup) {
    player.powerupActive = true;
    player.powerupType = powerup.type;
    player.powerupEndTime = Date.now() + 10000;
    powerupIndicator.style.opacity = '1';
    powerupIndicator.textContent = `${powerup.type.toUpperCase()} ACTIVE!`;
    
    switch (powerup.type) {
        case 'health':
            health = Math.min(health + 30, maxHealth);
            healthFill.style.width = `${(health / maxHealth) * 100}%`;
            break;
        case 'rapidfire':
            player.shootDelay = 100;
            break;
        case 'shield':
            break;
        case 'multiplier':
            multiplier = Math.min(multiplier + 1, 10);
            multiplierTimer = Date.now() + multiplierTimeout;
            break;
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.life--;
        particle.alpha = particle.life / 60;
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

function updateMultiplier() {
    if (Date.now() > multiplierTimer && multiplier > 1) {
        multiplier = Math.max(1, multiplier - 0.05);
        multiplierTimer = Date.now() + multiplierTimeout;
    }
}

function drawPlayer() {
    ctx.save();
    
    if (player.powerupActive && player.powerupType === 'shield') {
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width + 10, 0, Math.PI * 2);
        ctx.strokeStyle = '#0099ff';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
    }
    
    ctx.fillStyle = player.color;
    
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y + player.height / 3);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
    
    ctx.restore();
}

function drawBullets() {
    for (const bullet of bullets) {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
        
        ctx.beginPath();
        ctx.moveTo(bullet.x, bullet.y - bullet.height / 2);
        ctx.lineTo(bullet.x - bullet.width / 2, bullet.y - bullet.height);
        ctx.lineTo(bullet.x + bullet.width / 2, bullet.y - bullet.height);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
    }
}

function drawEnemies() {
    for (const enemy of enemies) {
        ctx.save();
        ctx.fillStyle = enemy.color;
        
        ctx.beginPath();
        ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();
        
        ctx.restore();
        
        const healthWidth = (enemy.health / enemy.maxHealth) * enemy.width;
        ctx.fillStyle = 'red';
        ctx.fillRect(enemy.x, enemy.y - 10, enemy.width, 5);
        ctx.fillStyle = 'lime';
        ctx.fillRect(enemy.x, enemy.y - 10, healthWidth, 5);
    }
}

function drawPowerups() {
    for (const powerup of powerups) {
        ctx.save();
        ctx.fillStyle = powerup.color;
        ctx.shadowColor = powerup.color;
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.arc(powerup.x + powerup.width / 2, powerup.y + powerup.height / 2, powerup.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

function drawParticles() {
    for (const particle of particles) {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        ctx.restore();
    }
}

function updateUI() {
    scoreDisplay.textContent = `SCORE: ${Math.floor(score)}`;
    multiplierDisplay.textContent = `MULTIPLIER: ${multiplier.toFixed(1)}x`;
}

function gameOver() {
    gameRunning = false;
    finalScore.textContent = `FINAL SCORE: ${Math.floor(score)}`;
    gameOverScreen.classList.add('show');
}

function resetGame() {
    score = 0;
    multiplier = 1;
    health = 100;
    healthFill.style.width = '100%';
    enemies = [];
    bullets = [];
    particles = [];
    powerups = [];
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    player.powerupActive = false;
    player.powerupType = null;
    multiplierTimer = 0;
    gameOverScreen.classList.remove('show');
    gameRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function startGame() {
    startScreen.classList.add('hidden');
    gameRunning = true;
    resetGame();
}

function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    updateStars();
    drawStars();
    
    updatePlayer(deltaTime);
    updateBullets();
    updateEnemies(deltaTime);
    updatePowerups();
    updateParticles();
    updateMultiplier();
    updateUI();
    
    drawParticles();
    drawEnemies();
    drawBullets();
    drawPowerups();
    drawPlayer();
    
    if (Date.now() - player.lastShot > player.shootDelay) {
        shootBullet(player.x + player.width / 2, player.y, true);
        player.lastShot = Date.now();
    }
    
    requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

canvas.addEventListener('mousemove', (e) => {
    player.x = e.clientX;
    player.y = e.clientY;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    player.x = e.touches[0].clientX;
    player.y = e.touches[0].clientY;
}, { passive: false });

restartButton.addEventListener('click', resetGame);
startButton.addEventListener('click', startGame);

createStars();
