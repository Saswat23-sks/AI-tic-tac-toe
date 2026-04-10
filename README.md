# Adaptive Tic-Tac-Toe AI

A high-fidelity, full-stack React application featuring a deterministic Minimax AI enhanced with session-based adaptive learning. Challenge a "perfect" algorithm that learns from your playstyle in real-time.

![Tic-Tac-Toe AI](https://picsum.photos/seed/tictactoe/1200/600)

## 🚀 Features

### 🧠 Advanced AI Engine
- **Minimax Algorithm:** The "Hard" difficulty uses a recursive Minimax function to ensure optimal play. It is mathematically impossible to beat the AI on this setting.
- **Adaptive Learning:** A session-based knowledge base tracks your moves. When multiple optimal moves exist, the AI selects the one that has historically led to your defeat.
- **Variable Difficulty:** Choose between **Easy** (Random), **Medium** (Hybrid), and **Hard** (Perfect) modes.

### 📊 Performance Analytics
- **Real-time Statistics:** Track your wins, losses, and draws with a dedicated analytics dashboard.
- **Data Visualization:** High-fidelity Pie Charts powered by **Recharts** provide a visual breakdown of your performance.
- **Streak Tracking:** Automatically monitors your current and all-time maximum win streaks.
- **Persistent Storage:** All statistics are saved to `localStorage`, so your progress is preserved across sessions.

### 🕹️ Premium UX/UI
- **Modern Aesthetic:** A sleek "Technical Dashboard" design with glassmorphism effects, radial gradients, and neon accents.
- **Game History:** A "Time Travel" feature allows you to review every move in the current match and jump back to previous states.
- **Immersive Audio:** Synthesized sound effects using the Web Audio API provide tactile feedback for every action.
- **Responsive Design:** Fully optimized for mobile, tablet, and desktop experiences.

## 🛠️ Tech Stack

- **Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Charts:** [Recharts](https://recharts.org/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Audio:** Web Audio API

## 🏁 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
1. Clone the repository or download the source code.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App
Start the development server:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

## 🧠 How the AI Works

The AI's intelligence is built on two layers:

1. **Deterministic Layer (Minimax):**
   The algorithm explores the entire game tree to assign a score to every possible move. It assumes the player will also play optimally, ensuring the AI never makes a mistake.

2. **Heuristic Layer (Adaptive Learning):**
   In Tic-Tac-Toe, many board states have multiple "best" moves that all lead to a draw or win. Our AI breaks these ties by looking at your session history. If you've previously lost a game after the AI made Move A but drew after it made Move B, the AI will prioritize Move A in future games.

## 🌐 Deployment

This app is optimized for deployment on **Vercel**:
1. Push your code to a GitHub repository.
2. Connect the repository to Vercel.
3. Vercel will automatically detect the Vite configuration and deploy your app.

## 📄 License
This project is licensed under the Apache-2.0 License.
