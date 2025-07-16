// Game canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas to fullscreen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Initialize canvas size
resizeCanvas();

// Handle window resize
window.addEventListener('resize', resizeCanvas);

// Game state
let gameRunning = true;
let bullets = [];
let tanks = [];
let powerUps = [];
let gameOverMessage = '';
let gameOverTimer = 0;

// Lives system
let player1Lives = 7;
let player2Lives = 7;
let roundNumber = 1;

// Countdown system
let countdownActive = false;
let countdownValue = 4;
let countdownTimer = 0;

// Add meteors array to game state
let meteors = [];

// Add effects array to game state
let effects = [];

// Add global miniTanks array
let miniTanks = [];

// Boom effect class
class BoomEffect {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = 60;
        this.alpha = 1;
        this.color = color;
        this.done = false;
    }
    update() {
        this.radius += 6;
        this.alpha -= 0.08;
        if (this.radius > this.maxRadius || this.alpha <= 0) {
            this.done = true;
        }
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 30;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// Tank class
class Tank {
    constructor(x, y, color, controls) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.color = color;
        this.angle = 0;
        this.speed = 3;
        this.health = 2400;
        this.maxHealth = 2400;
        this.controls = controls;
        this.lastShot = 0;
        this.shootCooldown = 200; // milliseconds
        this.baseShootCooldown = this.shootCooldown;
        this.bulletSpeed = 12; // Increased from 8 to 12
        
        // Power-up states
        this.speedBoost = 0;
        this.rapidFire = 0;
        this.shield = 0;
        this.multishot = 0;
        this.baseSpeed = this.speed;
        this.baseShootCooldown = this.shootCooldown;
        
        // Health regeneration
        this.healthRegenTimer = 0;
        this.healthRegenCooldown = 240; // Regenerate every 4 seconds
        this.flashTimer = 0;
    }

    update() {
        // Update power-up timers
        if (this.speedBoost > 0) {
            this.speedBoost--;
            this.speed = this.baseSpeed * 2;
        } else {
            this.speed = this.baseSpeed;
        }
        
        if (this.rapidFire > 0) {
            this.rapidFire--;
            this.shootCooldown = 120; // Rapid fire: 120ms cooldown
        } else {
            this.shootCooldown = this.baseShootCooldown;
        }
        
        if (this.shield > 0) {
            this.shield--;
        }
        
        if (this.multishot > 0) {
            this.multishot--;
        }
        
        // Health regeneration
        this.healthRegenTimer++;
        if (this.healthRegenTimer >= this.healthRegenCooldown && this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + 20); // Regenerate 20 health
            this.healthRegenTimer = 0;
        }
        
        // Handle movement
        if (this.controls.up()) this.y -= this.speed;
        if (this.controls.down()) this.y += this.speed;
        if (this.controls.left()) this.x -= this.speed;
        if (this.controls.right()) this.x += this.speed;

        // Keep tank within bounds
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        // Handle rotation (aiming)
        if (this.controls.aimLeft()) this.angle -= 0.1;
        if (this.controls.aimRight()) this.angle += 0.1;
        
        // Auto-shoot
        this.autoShoot();
        if (this.flashTimer > 0) this.flashTimer--;
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot > this.shootCooldown) {
            if (this.multishot > 0) {
                // Shoot 3 bullets in a spread pattern
                for (let i = -1; i <= 1; i++) {
                    const spreadAngle = this.angle + (i * 0.15); // 0.15 radian spread
                    const bulletX = this.x + Math.cos(spreadAngle) * (this.radius + 10);
                    const bulletY = this.y + Math.sin(spreadAngle) * (this.radius + 10);
                    const bulletVX = Math.cos(spreadAngle) * this.bulletSpeed;
                    const bulletVY = Math.sin(spreadAngle) * this.bulletSpeed;
                    
                    bullets.push(new Bullet(bulletX, bulletY, bulletVX, bulletVY, this.color));
                }
            } else {
                // Single bullet
                const bulletX = this.x + Math.cos(this.angle) * (this.radius + 10);
                const bulletY = this.y + Math.sin(this.angle) * (this.radius + 10);
                const bulletVX = Math.cos(this.angle) * this.bulletSpeed;
                const bulletVY = Math.sin(this.angle) * this.bulletSpeed;
                
                bullets.push(new Bullet(bulletX, bulletY, bulletVX, bulletVY, this.color));
            }
            this.lastShot = now;
        }
    }
    
    autoShoot() {
        const now = Date.now();
        if (now - this.lastShot > this.shootCooldown) {
            this.shoot();
        }
    }

    draw() {
        // Draw tank body
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        // Tank body (circle)
        // White rim for visibility
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 5;
        ctx.stroke();
        // Main body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        // Tank outline
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Tank cannon (barrel)
        ctx.fillStyle = '#333';
        ctx.fillRect(0, -3, this.radius + 10, 6);
        // Red flash effect (if hit)
        if (this.flashTimer > 0) {
            ctx.globalAlpha = 0.5 * (this.flashTimer / 10);
            ctx.fillStyle = '#ffffff'; // White flash
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.restore();

        // Draw shield effect
        if (this.shield > 0) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw health bar
        this.drawHealthBar();
        
        // Draw health number
        this.drawHealthNumber();
        
        // Draw power-up indicators
        this.drawPowerUpIndicators();
    }

    drawHealthBar() {
        const barWidth = 40;
        const barHeight = 6;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.radius - 15;
        
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // Regeneration indicator (pulsing green dots when regenerating)
        if (this.health < this.maxHealth && this.healthRegenTimer > this.healthRegenCooldown * 0.8) {
            ctx.fillStyle = '#00ff00';
            ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.01); // Pulsing effect
            ctx.fillRect(barX + barWidth + 5, barY, 3, barHeight);
            ctx.globalAlpha = 1;
        }
        
        // Border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    takeDamage(damage) {
        // Shield blocks all damage
        if (this.shield > 0) {
            return false;
        }
        playHitSound();
        this.flashTimer = 10; // 10 frames of white flash
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
            return true; // Tank destroyed
        }
        return false;
    }
    
    drawPowerUpIndicators() {
        const barY = this.y - this.radius - 25;
        let offset = 0;
        
        if (this.speedBoost > 0) {
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - 20 + offset, barY, 8, 4);
            offset += 10;
        }
        
        if (this.rapidFire > 0) {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x - 20 + offset, barY, 8, 4);
            offset += 10;
        }
        
        if (this.shield > 0) {
            ctx.fillStyle = '#0000ff';
            ctx.fillRect(this.x - 20 + offset, barY, 8, 4);
            offset += 10;
        }
        
        if (this.multishot > 0) {
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(this.x - 20 + offset, barY, 8, 4);
        }
    }
    
    drawHealthNumber() {
        const textY = this.y - this.radius - 35;
        
        // Background for better readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.x - 25, textY - 8, 50, 16);
        
        // Health number in white
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.health}/${this.maxHealth}`, this.x, textY);
    }
}

// PowerUp class
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.type = type; // 'speed', 'rapid', 'shield', 'multishot', 'minitank'
        this.life = 780; // 13 seconds at 60fps
        this.rotation = 0;
    }

    update() {
        this.life--;
        return this.life > 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Draw power-up based on type
        switch(this.type) {
            case 'speed':
                ctx.fillStyle = '#00ff00';
                break;
            case 'rapid':
                ctx.fillStyle = '#ff0000';
                break;
            case 'shield':
                ctx.fillStyle = '#0000ff';
                break;
            case 'multishot':
                ctx.fillStyle = '#ff00ff';
                break;
        }
        
        // Draw diamond shape
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius, 0);
        ctx.lineTo(0, this.radius);
        ctx.lineTo(-this.radius, 0);
        ctx.closePath();
        ctx.fill();
        
        // Draw outline
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw type indicator
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        if (this.type === 'shield') {
            ctx.fillText('🛡️', 0, 4);
        } else if (this.type === 'speed') {
            ctx.fillText('👢', 0, 4);
        } else if (this.type === 'multishot') {
            ctx.fillText('💥💥💥', 0, 4);
        } else if (this.type === 'rapid') {
            ctx.fillText('⚡', 0, 4);
        } else if (this.type === 'minitank') {
            ctx.fillText('🤖', 0, 4);
        } else {
            ctx.fillText(this.type.charAt(0).toUpperCase(), 0, 4);
        }
        
        ctx.restore();
    }
}

// Meteor class
class Meteor {
    constructor(x, y, speed, radius, damage) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.radius = radius;
        this.damage = damage;
        this.active = true;
        this.vx = Math.random() * 1.2 + 0.6; // Add rightward velocity (0.6 to 1.8)
    }

    update() {
        this.y += this.speed;
        this.x += this.vx; // Move rightward
        // Meteor is active as long as it's on screen
        if (this.y - this.radius > canvas.height || this.x - this.radius > canvas.width) {
            this.active = false;
        }
    }

    draw() {
        ctx.save();
        // Draw tail leaning to the right
        const tailLength = this.radius * 2.5;
        const tailOffset = this.radius * 0.8; // rightward offset
        const tailGradient = ctx.createLinearGradient(this.x + tailOffset * 0.5, this.y - tailLength, this.x + tailOffset, this.y);
        tailGradient.addColorStop(0, 'rgba(255, 140, 0, 0.0)');
        tailGradient.addColorStop(1, 'rgba(255, 140, 0, 0.5)');
        ctx.beginPath();
        ctx.moveTo(this.x + tailOffset, this.y - tailLength);
        ctx.lineTo(this.x - this.radius * 0.2 + tailOffset, this.y);
        ctx.lineTo(this.x + this.radius * 0.8 + tailOffset, this.y);
        ctx.closePath();
        ctx.fillStyle = tailGradient;
        ctx.fill();

        // Draw meteor body with fiery gradient
        const grad = ctx.createRadialGradient(this.x, this.y, this.radius * 0.3, this.x, this.y, this.radius);
        grad.addColorStop(0, '#fff6a0');
        grad.addColorStop(0.4, '#ff9933');
        grad.addColorStop(1, '#ff3300');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 25;
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ff3300';
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw highlight
        ctx.beginPath();
        ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fill();

        ctx.restore();
    }
}

// Bullet class
class Bullet {
    constructor(x, y, vx, vy, color, damage = 25) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = 8; // Increased from 4 to 8
        this.color = color;
        // this.life = 100; // Remove bullet lifetime limit
        this.trail = []; // Store previous positions for trail effect
        this.damage = damage;
    }

    update() {
        // Add current position to trail
        this.trail.push({x: this.x, y: this.y});
        if (this.trail.length > 5) {
            this.trail.shift(); // Keep only last 5 positions
        }
        
        this.x += this.vx;
        this.y += this.vy;
        // Remove this.life--;
        
        // Remove if out of bounds only
        return this.x > 0 && this.x < canvas.width && 
               this.y > 0 && this.y < canvas.height;
    }

    draw() {
        // Draw trail effect
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = (i + 1) / this.trail.length;
            const radius = this.radius * (0.3 + 0.7 * alpha);
            
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(this.trail[i].x, this.trail[i].y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Outer glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        
        // Main bullet body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner bright core
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Bullet outline
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowBlur = 0;
    }
}

// Input handling
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (!gameRunning && gameOverMessage && player1Lives > 0 && player2Lives > 0) {
        startCountdown();
        gameOverMessage = ''; // Clear message only when countdown starts
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Initialize tanks
function initTanks() {
    tanks = [
        new Tank(canvas.width * 0.25, canvas.height * 0.5, '#e74c3c', {
            up: () => keys['w'],
            down: () => keys['s'],
            left: () => keys['a'],
            right: () => keys['d'],
            aimLeft: () => keys['q'],
            aimRight: () => keys['e'],
            shoot: () => keys[' ']
        }),
        new Tank(canvas.width * 0.75, canvas.height * 0.5, '#3498db', {
            up: () => keys['arrowup'],
            down: () => keys['arrowdown'],
            left: () => keys['arrowleft'],
            right: () => keys['arrowright'],
            aimLeft: () => keys['shift'],
            aimRight: () => keys['.'],
            shoot: () => keys['enter']
        })
    ];
    
    // Set initial angles to face away from each other
    tanks[0].angle = Math.PI; // Red tank faces left (away from blue tank)
    tanks[1].angle = 0; // Blue tank faces right (away from red tank)
}

// Update game state
function update() {
    // Spawn power-ups randomly
    if (Math.random() < 0.015 && powerUps.length < 5) { // 1.5% chance per frame, max 5 power-ups
        const types = ['speed', 'rapid', 'shield', 'multishot', 'minitank'];
        const type = types[Math.floor(Math.random() * types.length)];
        const x = Math.random() * (canvas.width - 100) + 50;
        const y = Math.random() * (canvas.height - 100) + 50;
        powerUps.push(new PowerUp(x, y, type));
    }
    
    // Update power-ups
    powerUps = powerUps.filter(powerUp => powerUp.update());
    
    // Update tanks
    tanks.forEach(tank => {
        tank.update();
    });

    // Update bullets
    bullets = bullets.filter(bullet => bullet.update());

    // Check bullet-tank collisions
    bullets.forEach((bullet, bulletIndex) => {
        tanks.forEach((tank, tankIndex) => {
            const dx = bullet.x - tank.x;
            const dy = bullet.y - tank.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < tank.radius + bullet.radius) {
                // Check if bullet is from different tank
                if (bullet.color !== tank.color) {
                    const destroyed = tank.takeDamage(bullet.damage);
                    bullets.splice(bulletIndex, 1);
                    
                    if (destroyed) {
                        // Tank destroyed - handle lives system
                        if (tankIndex === 0) {
                            player1Lives--; // Red tank lost, decrease red lives
                        } else {
                            player2Lives--; // Blue tank lost, decrease blue lives
                        }
                        // Add boom effect at tank position
                        effects.push(new BoomEffect(tank.x, tank.y, '#ff6600'));
                        playBoomSound(); // Add boom sound
                        // Check if someone lost all lives
                        if (player1Lives <= 0 || player2Lives <= 0) {
                            gameRunning = false;
                            const winner = player1Lives <= 0 ? 'Blue' : 'Red';
                            gameOverMessage = `${winner} win`;
                            gameOverTimer = 180; // Show for 3 seconds
                            setTimeout(() => {
                                alert(`${winner} win`);
                                resetFullGame();
                            }, 500);
                        } else {
                            // Round over, show message, then start countdown after 1 second
                            gameRunning = false;
                            const roundWinner = tankIndex === 0 ? 'Blue' : 'Red';
                            gameOverMessage = `${roundWinner} win`;
                            gameOverTimer = 120; // Show for 2 seconds
                            roundNumber++;
                            // No setTimeout for startCountdown
                        }
                    }
                }
            }
        });
    });
    
    // Check tank-power-up collisions
    tanks.forEach((tank, tankIndex) => {
        powerUps.forEach((powerUp, powerUpIndex) => {
            const dx = tank.x - powerUp.x;
            const dy = tank.y - powerUp.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < tank.radius + powerUp.radius) {
                // Apply power-up effect
                switch(powerUp.type) {
                    case 'speed':
                        tank.speedBoost = 720; // 12 seconds
                        break;
                    case 'rapid':
                        tank.rapidFire = 720; // 12 seconds
                        break;
                    case 'shield':
                        tank.shield = 720; // 12 seconds
                        break;
                    case 'multishot':
                        tank.multishot = 720; // 12 seconds
                        break;
                    case 'minitank':
                        // Spawn 3 MiniTanks targeting the opponent, offset so they don't overlap
                        const opponent = tanks[1 - tankIndex];
                        const offsets = [-40, 0, 40];
                        for (let i = 0; i < 3; i++) {
                            miniTanks.push(new MiniTank({ ...tank, x: tank.x + offsets[i], y: tank.y }, opponent));
                        }
                        break;
                }
                
                // Remove power-up
                powerUps.splice(powerUpIndex, 1);
                playPowerupSound(); // Play power-up sound
            }
        });
    });

    // Spawn meteors randomly
    if (Math.random() < 0.02) { // 2% chance per frame
        const x = Math.random() * (canvas.width - 40) + 20;
        const y = -20;
        const speed = Math.random() * 3 + 3; // 3 to 6 px/frame
        const radius = Math.random() * 15 + 15; // 15 to 30 px
        const damage = Math.floor(radius * 1.5); // Damage scales with size
        meteors.push(new Meteor(x, y, speed, radius, damage));
    }
    // Update meteors
    meteors.forEach(meteor => meteor.update());
    meteors = meteors.filter(meteor => meteor.active);

    // Meteor-tank collisions
    meteors.forEach((meteor) => {
        tanks.forEach((tank, tankIndex) => {
            const dx = meteor.x - tank.x;
            const dy = meteor.y - tank.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < meteor.radius + tank.radius) {
                // Deal damage to tank and remove meteor
                const destroyed = tank.takeDamage(meteor.damage);
                meteor.active = false;
                // Add boom effect
                effects.push(new BoomEffect(meteor.x, meteor.y, '#ff6600'));
                playBoomSound(); // Add boom sound
                if (destroyed) {
                    // Tank destroyed - handle lives system
                    if (tankIndex === 0) {
                        player1Lives--; // Red tank lost, decrease red lives
                    } else {
                        player2Lives--; // Blue tank lost, decrease blue lives
                    }
                    // Add boom effect at tank position
                    effects.push(new BoomEffect(tank.x, tank.y, '#ff6600'));
                    playBoomSound(); // Add boom sound
                    // Check if someone lost all lives
                    if (player1Lives <= 0 || player2Lives <= 0) {
                        gameRunning = false;
                        const winner = player1Lives <= 0 ? 'Blue' : 'Red';
                        gameOverMessage = `${winner} win`;
                        gameOverTimer = 180; // Show for 3 seconds
                        setTimeout(() => {
                            alert(`${winner} win`);
                            resetFullGame();
                        }, 500);
                    } else {
                        // Round over, show message, then start countdown after 1 second
                        gameRunning = false;
                        const roundWinner = tankIndex === 0 ? 'Blue' : 'Red';
                        gameOverMessage = `${roundWinner} win`;
                        gameOverTimer = 120; // Show for 2 seconds
                        roundNumber++;
                        // No setTimeout for startCountdown
                    }
                }
            }
        });
    });
    // Meteor-bullet collisions
    // (No longer destroy meteors when hit by bullets)
    // meteors.forEach((meteor) => {
    //     bullets.forEach((bullet) => {
    //         const dx = meteor.x - bullet.x;
    //         const dy = meteor.y - bullet.y;
    //         const dist = Math.sqrt(dx * dx + dy * dy);
    //         if (dist < meteor.radius + bullet.radius) {
    //             meteor.active = false;
    //             bullet.life = 0; // Remove bullet
    //         }
    //     });
    // });

    // Update and filter effects
    effects.forEach(effect => effect.update());
    effects = effects.filter(effect => !effect.done);

    // Update MiniTanks
    miniTanks.forEach(miniTank => miniTank.update());
    miniTanks = miniTanks.filter(miniTank => !miniTank.isExpired());

    // Bullet-MiniTank collisions
    for (let i = miniTanks.length - 1; i >= 0; i--) {
        const miniTank = miniTanks[i];
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            // Ignore bullets from the same color as the miniTank's owner
            if (bullet.color === miniTank.owner.color) continue;
            const dx = bullet.x - miniTank.x;
            const dy = bullet.y - miniTank.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < miniTank.radius + bullet.radius) {
                miniTank.health -= bullet.damage;
                playHitSound(); // Play hit sound for MiniTank
                bullets.splice(j, 1);
                if (miniTank.health <= 0) {
                    playBoomSound(); // Play destroyed sound for MiniTank
                }
            }
        }
    }
    // Only remove MiniTanks with health <= 0 or expired
    miniTanks = miniTanks.filter(miniTank => miniTank.health > 0 && !miniTank.isExpired());
}

// Draw everything
function draw() {
    // Clear canvas
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid pattern
    ctx.strokeStyle = '#2d5a2d';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Draw tanks
    tanks.forEach(tank => tank.draw());
    
    // Draw power-ups
    powerUps.forEach(powerUp => powerUp.draw());
    
    // Draw bullets
    bullets.forEach(bullet => bullet.draw());

    // Draw meteors
    meteors.forEach(meteor => meteor.draw());

    // Draw effects
    effects.forEach(effect => effect.draw());
    
    // Draw lives display
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'right';
    
    // Red lives with hearts
    ctx.fillStyle = '#ff6b6b';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.textAlign = 'left';
    ctx.strokeText(`Red Lives: `, canvas.width - 300, 30);
    ctx.fillText(`Red Lives: `, canvas.width - 300, 30);
    
    // Draw red hearts with white outline
    const redHeartsX = canvas.width - 300 + ctx.measureText('Red Lives: ').width;
    for (let i = 0; i < player1Lives; i++) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('❤️', redHeartsX + (i * 20), 30);
        ctx.fillStyle = '#e74c3c';
        ctx.fillText('❤️', redHeartsX + (i * 20), 30);
    }
    
    // Blue lives with hearts
    ctx.fillStyle = '#74b9ff';
    ctx.strokeText(`Blue Lives: `, canvas.width - 300, 60);
    ctx.fillText(`Blue Lives: `, canvas.width - 300, 60);
    
    // Draw blue hearts with white outline
    const blueHeartsX = canvas.width - 300 + ctx.measureText('Blue Lives: ').width;
    for (let i = 0; i < player2Lives; i++) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('💙', blueHeartsX + (i * 20), 60);
        ctx.fillStyle = '#3498db';
        ctx.fillText('💙', blueHeartsX + (i * 20), 60);
    }
    

    
    // Debug: Show pressed keys
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.fillText('Debug - Pressed keys: ' + Object.keys(keys).filter(k => keys[k]).join(', '), 10, 120);
    
    // Draw game over message
    if (gameOverMessage) { // Always draw if gameOverMessage is set
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(gameOverMessage, canvas.width / 2, canvas.height / 2);
        
        ctx.font = '24px Arial';
        ctx.fillText('Press any key to continue...', canvas.width / 2, canvas.height / 2 + 50);
    }
    
    // Draw countdown
    if (countdownActive) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(countdownValue.toString(), canvas.width / 2, canvas.height / 2);
        
        ctx.font = '32px Arial';
        ctx.fillText('Next Round Starting...', canvas.width / 2, canvas.height / 2 + 80);
    }

    // Draw MiniTanks
    miniTanks.forEach(miniTank => miniTank.draw());
}

// Game loop
function gameLoop() {
    if (gameRunning) {
        update();
    } else if (countdownActive) {
        // During countdown, only update countdown and draw
        updateCountdown();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// Reset round (keep lives, reset tanks)
function resetRound() {
    // Clear all bullets and power-ups
    bullets = [];
    powerUps = [];
    
    // Reset game state
    gameRunning = true;
    gameOverMessage = '';
    gameOverTimer = 0;
    
    // Reset tank positions and health
    tanks[0].x = canvas.width * 0.25;
    tanks[0].y = canvas.height * 0.5;
    tanks[0].health = tanks[0].maxHealth;
    tanks[0].angle = Math.PI; // Red tank faces left
    tanks[0].lastShot = 0;
    tanks[0].speedBoost = 0;
    tanks[0].rapidFire = 0;
    tanks[0].shield = 0;
    tanks[0].multishot = 0;
    tanks[0].healthRegenTimer = 0;
    tanks[0].flashTimer = 0;
    
    tanks[1].x = canvas.width * 0.75;
    tanks[1].y = canvas.height * 0.5;
    tanks[1].health = tanks[1].maxHealth;
    tanks[1].angle = 0; // Blue tank faces right
    tanks[1].lastShot = 0;
    tanks[1].speedBoost = 0;
    tanks[1].rapidFire = 0;
    tanks[1].shield = 0;
    tanks[1].multishot = 0;
    tanks[1].healthRegenTimer = 0;
    tanks[1].flashTimer = 0;

    miniTanks = [];
}

// Start countdown for new round
function startCountdown() {
    countdownActive = true;
    countdownValue = 4;
    countdownTimer = 0;
    gameOverMessage = ''; // Clear message only when countdown starts
    gameOverTimer = 0;
}

// Update countdown
function updateCountdown() {
    if (countdownActive) {
        countdownTimer++;
        if (countdownTimer >= 60) { // 1 second at 60fps
            countdownValue--;
            countdownTimer = 0;
            
            if (countdownValue <= 0) {
                countdownActive = false;
                gameRunning = true; // Re-enable game
                resetRound();
            }
        }
    }
}

// Reset full game (reset lives)
function resetFullGame() {
    // Reset lives
    player1Lives = 7;
    player2Lives = 7;
    roundNumber = 1;
    
    // Reset countdown
    countdownActive = false;
    countdownValue = 4;
    countdownTimer = 0;
    
    // Reset round
    resetRound();

    miniTanks = [];
}

// MiniTank class
class MiniTank {
    constructor(owner, target) {
        this.owner = owner; // The player who spawned it
        this.target = target; // The opponent
        this.x = owner.x;
        this.y = owner.y;
        this.radius = 12;
        this.color = owner.color === '#e74c3c' ? '#ffb347' : '#85c1ff'; // Lighter shade
        this.angle = 0;
        this.speed = 3.5;
        this.health = 200; // Updated health
        this.shootCooldown = 500; // ms
        this.lastShot = 0;
        this.lifetime = 600; // 10 seconds at 60fps
    }

    update() {
        // Move toward target but keep a minimum distance
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDistance = 60;
        if (dist > minDistance) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
        // Aim at target
        this.angle = Math.atan2(dy, dx);
        // Shoot at target
        const now = Date.now();
        if (now - this.lastShot > this.shootCooldown) {
            this.shoot();
            this.lastShot = now;
        }
        // Lifetime countdown
        this.lifetime--;
    }

    shoot() {
        const bulletX = this.x + Math.cos(this.angle) * (this.radius + 8);
        const bulletY = this.y + Math.sin(this.angle) * (this.radius + 8);
        const bulletVX = Math.cos(this.angle) * 10;
        const bulletVY = Math.sin(this.angle) * 10;
        bullets.push(new Bullet(bulletX, bulletY, bulletVX, bulletVY, this.color, 7));
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        // Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Cannon
        ctx.fillStyle = '#555';
        ctx.fillRect(0, -2, this.radius + 8, 4);
        ctx.restore();
        // Health bar
        const barWidth = 30;
        const barHeight = 5;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.radius - 14;
        ctx.save();
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        const healthPercent = Math.max(0, this.health / 200);
        ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        // Health number
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText(`${Math.max(0, Math.round(this.health))}/200`, this.x, barY - 3);
        ctx.fillText(`${Math.max(0, Math.round(this.health))}/200`, this.x, barY - 3);
        ctx.restore();
    }

    isExpired() {
        return this.lifetime <= 0 || this.owner.health <= 0;
    }
}

// At the top of the file, after canvas and ctx:
const audioCtx = typeof window.AudioContext !== 'undefined' ? new window.AudioContext() : null;

// Update playHitSound to use the persistent audioCtx:
function playHitSound() {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.value = 440;
    g.gain.value = 0.15;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.08);
}

// Add this function after playHitSound:
function playBoomSound() {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, audioCtx.currentTime);
    o.frequency.linearRampToValueAtTime(60, audioCtx.currentTime + 0.25);
    g.gain.value = 0.25;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.25);
}

// Add this function after playBoomSound:
function playPowerupSound() {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(660, audioCtx.currentTime);
    o.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.12);
    g.gain.value = 0.35; // Increased gain
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.15);
}

// Add this near the top of the file, after audioCtx is defined:
window.addEventListener('keydown', () => {
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
});
window.addEventListener('mousedown', () => {
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
});

// Start the game
initTanks();
gameLoop(); 