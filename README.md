# MESA (Multi-Entity Simulation Architecture)

A 3D autonomous agent simulation that creates a virtual city where AI-powered residents live their daily lives with realistic behaviors, interactions, and decision-making processes.

[![](https://img.youtube.com/vi/5NguBippS0c/0.jpg)](https://www.youtube.com/watch?v=5NguBippS0c)

## Overview

This application simulates a small city populated with autonomous agents (residents) who have unique personalities, daily routines, and the ability to make decisions using AI language models. The simulation runs in a 3D environment built with Three.js, featuring a procedurally generated city layout with roads, buildings, and facilities.

## Features

### 🤖 Autonomous Agents
- **AI-Powered Decision Making**: Each agent uses OpenAI or Gemini API to make realistic decisions based on their personality and current situation

![1](./images/1.GIF)

- **Unique Personalities**: Agents have distinct traits including sociability, energy levels, routine preferences, curiosity, and empathy

![1](./images/2.GIF)

- **Memory System**: Short-term and long-term memory systems that influence future decisions

![1](./images/3.GIF)

- **Relationship Dynamics**: Agents build relationships with each other through interactions

![1](./images/4.GIF)

- **Daily Routines**: Each agent follows personalized daily schedules with different activities for morning, afternoon, evening, and night

![1](./images/5.GIF)

- **Communication System**: Agents can make phone calls and send emails to each other, enhancing social interactions

![1](./images/6.GIF)

### 🏙️ Virtual City Environment
- **Procedural City Generation**: Automatically generates roads, buildings, and facilities
- **Pathfinding System**: Agents navigate using A* pathfinding algorithm through the road network
- **Multiple Facilities**: Cafes, parks, libraries, gyms, schools, hospitals, supermarkets, and more
- **3D Visualization**: Realistic 3D environment with buildings, roads, and character models

### 🎮 Interactive Controls
- **Camera Modes**: 
  - Free camera for overview
  - Agent-following camera to observe individual residents
  - Facility-focus camera to watch specific locations
- **Time Control**: Adjustable simulation speed (1x, 2x, 4x, 8x)
  - Real-time day/night cycle
  - Time affects agent behavior and environment
- **Agent Generation**: Create new agents with AI-generated personalities
- **Road Visualization**: Toggle road network display and path visualization

### 📊 Real-time Monitoring
- **Activity Log**: Detailed log of all agent activities and interactions
- **Agent Information Panel**: View current status, thoughts, and relationships of each agent
- **Live Updates**: Real-time display of agent locations, moods, and activities
- **Communication Log**: Track phone calls and email exchanges between agents

## Getting Started

### Prerequisites
- A modern web browser with WebGL support
- OpenAI API key or Google Gemini API access

### Installation

#### Web Browser Version
1. Clone or download this repository
2. Open a terminal in the project directory
3. Start a local HTTP server:
   ```bash
   python3 -m http.server
   ```
4. Open your browser and navigate to `http://localhost:8000`

#### Electron App Version
1. Clone or download this repository
2. Open a terminal in the project directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Launch the Electron app:
   ```bash
   npx electron .
   ```

### Setup
1. Enter your OpenAI API key in the control panel
2. Choose your preferred AI provider (OpenAI or Gemini)
3. Click "Start Simulation" to begin

## How It Works

### Agent Decision Making
Each agent continuously:
1. **Observes** their environment and nearby agents
2. **Thinks** about their current situation using AI language models
3. **Decides** on actions based on personality, memory, and relationships
4. **Executes** decisions (moving, interacting, performing activities, communicating)
5. **Updates** their memory and relationships

### Communication System
Agents can communicate through:
- **Phone Calls**: Direct voice communication between agents
- **Email**: Written communication for longer messages and formal interactions
- **Social Media**: Digital interactions through simulated social platforms

### City Layout
The city is procedurally generated with:
- **Main Streets**: Primary roads connecting major areas
- **Sub Streets**: Secondary roads within city blocks
- **Buildings**: Various types (residential, commercial, public facilities)
- **Intersections**: Traffic nodes for pathfinding

### Time System
The simulation features a realistic time system:
- **Day/Night Cycle**: Affects lighting and agent behavior
- **Time-based Activities**: Agents follow different routines based on time of day
- **Environmental Changes**: City atmosphere changes throughout the day

## Technical Details

### Architecture
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **3D Graphics**: Three.js for 3D rendering
- **AI Integration**: OpenAI GPT and Google Gemini APIs
- **Pathfinding**: A* algorithm for navigation
- **Memory Management**: Custom memory system for agent persistence
- **Communication**: Simulated phone and email systems

### Key Components
- `agent.js`: Core agent logic and AI decision making
- `citylayout.js`: City generation and pathfinding
- `main.js`: Main simulation loop and controls
- `config.js`: Agent personalities and city configuration
- `character.js`: 3D character models and animations
- `communication.js`: Phone and email communication systems

## Customization

### Adding New Agents
You can create new agents with custom personalities by modifying the `agentPersonalities` array in `config.js` or using the "Generate New Agent" button in the interface.

### Modifying City Layout
Adjust city generation parameters in `citylayout.js`:
- Grid size and road density
- Building types and placement rules
- Facility locations and activities

### Extending Agent Behaviors
Enhance agent capabilities by modifying:
- Personality traits and their effects
- Interaction types and outcomes
- Memory system and relationship dynamics
- Communication patterns and preferences

## API Usage

The application uses AI APIs for realistic agent decision-making. API keys are not stored and are only used for real-time requests.

### Supported Providers
- **OpenAI GPT**: Default provider with comprehensive reasoning capabilities
- **Google Gemini**: Alternative provider for agent decision making
- **Ollama (Local)**: Local AI models for privacy-focused usage

### Local AI Setup with Ollama

#### Installation
1. **Install Ollama**:
   ```bash
   # macOS
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Windows
   # Download from https://ollama.ai/download
   ```

2. **Start Ollama Service**:
   ```bash
   ollama serve
   ```

3. **Download and Run a Model**:
   ```bash
   # Download llama3.2 (recommended)
   ollama pull llama3.2
   
   # Or try other models
   ollama pull llama3.1
   ollama pull mistral
   ollama pull codellama
   ```

#### Connecting from MESA
1. **Select Local Provider**: In the API settings tab, choose "Ollama (Local)"
2. **Configure Connection**:
   - **URL**: `http://localhost:11434` (default)
   - **Model**: `llama3.2` (or your preferred model)
3. **Start Simulation**: The application will now use your local AI model

#### Benefits of Local AI
- **Privacy**: No data sent to external servers
- **Cost**: No API usage fees
- **Customization**: Use any model available in Ollama
- **Offline**: Works without internet connection

## Contributing

Feel free to contribute to this project by:
- Adding new agent personality types
- Implementing additional facilities and activities
- Improving the pathfinding algorithm
- Enhancing the 3D visualization
- Adding new interaction types between agents
- Expanding communication features

## TODO

### Planned Features
- **MCP (Model Context Protocol) Integration**: Connect to multiple applications and services through MCP
  - Calendar integration for scheduling
  - Weather API integration for realistic environmental effects
  - News API for current events affecting agent behavior
  - Social media API integration for digital interactions
  - Email service integration for external communication
- **Enhanced Communication**: 
  - Video calling capabilities
  - Group chat functionality
  - Voice message system
- **Advanced AI Features**:
  - Multi-modal AI (text, voice, image understanding)
  - Emotion recognition and response
  - Learning and adaptation over time

## Acknowledgments

- Three.js community for 3D graphics capabilities
- OpenAI and Google for AI language model APIs
- The open-source community for various algorithms and techniques used in this simulation