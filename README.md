# 🚗 Tank Battle Game

A real-time 2-player tank battle game inspired by diep.io, built with HTML5 Canvas and JavaScript. Optimized for low latency with WebSocket transport and compression.

## 🎮 How to Play

### Controls

**Player 1 (Red Tank):**
- **WASD** - Move tank
- **Q/E** - Rotate cannon (aim)
- **Space** - Shoot

**Player 2 (Blue Tank):**
- **Arrow Keys** - Move tank
- **M/.** - Rotate cannon (aim)
- **Enter** - Shoot

### Game Rules

1. **Objective**: Destroy the opponent's tank
2. **Health**: Each tank starts with 200 health points
3. **Damage**: Each bullet deals 25 damage
4. **Cooldown**: There's a 300ms cooldown between shots
5. **Boundaries**: Tanks cannot move outside the game area
6. **Bullets**: Bullets disappear after hitting a tank or going off-screen

## 🚀 Features

- **Real-time 2-player combat** with low latency optimizations
- **WebSocket-only transport** for minimal delay
- **Compression** for faster data transfer
- **Health bars** that change color based on remaining health
- **Smooth tank movement** and rotation
- **Bullet physics** with glow effects
- **Collision detection** between bullets and tanks
- **Grid background** for better visual reference
- **Game over screen** with winner announcement

## 🛠️ Technical Details

- Built with vanilla JavaScript and HTML5 Canvas
- Express.js server with Socket.IO for real-time communication
- Compression middleware for optimized data transfer
- Connection pooling for better performance
- TCP optimizations for low latency

## 🚀 Deployment

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open http://localhost:3000 in your browser

### Deploy to Render

1. **Fork/Clone this repository** to your GitHub account

2. **Sign up/Login to Render** at https://render.com

3. **Create a new Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository: `your-username/diep-new`

4. **Configure the service**:
   - **Name**: `tank-battle-game` (or any name you prefer)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or choose a paid plan for better performance)

5. **Environment Variables** (optional):
   - `NODE_ENV`: `production`

6. **Click "Create Web Service"**

7. **Wait for deployment** - Render will automatically build and deploy your app

8. **Access your game** at the provided URL (e.g., `https://your-app-name.onrender.com`)

### Deployment Features

- **Automatic HTTPS** - Render provides SSL certificates
- **Global CDN** - Fast loading worldwide
- **Auto-deploy** - Updates automatically when you push to GitHub
- **Custom domains** - Add your own domain (paid plans)
- **Logs and monitoring** - Built-in logging and performance monitoring

## 🎯 Game Mechanics

- **Movement**: Tanks move smoothly with WASD/Arrow keys
- **Aiming**: Rotate the cannon to aim at your opponent
- **Shooting**: Press shoot key to fire bullets
- **Health System**: Visual health bars show remaining health
- **Win Condition**: Last tank standing wins

## 🎨 Visual Features

- **Color-coded tanks**: Red vs Blue
- **Health bars**: Green (high) → Yellow (medium) → Red (low)
- **Bullet effects**: Glowing projectiles
- **Grid background**: Helps with spatial awareness
- **Smooth animations**: Fluid movement and rotation

## 🔧 Future Enhancements

- Power-ups and special abilities
- Different tank types with unique abilities
- Obstacles and cover mechanics
- Sound effects and music
- Mobile touch controls
- Multiple game modes
- WebRTC for peer-to-peer connections

## 📝 License

MIT License - feel free to use and modify!

---

Enjoy the battle! 🎮 