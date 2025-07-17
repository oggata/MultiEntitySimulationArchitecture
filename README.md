# MESA (Multi-Entity Simulation Architecture)

A 3D autonomous agent simulation that creates a virtual city where AI-powered residents live their daily lives with realistic behaviors, interactions, and decision-making processes.


[![](https://img.youtube.com/vi/5NguBippS0c/0.jpg)](https://www.youtube.com/watch?v=5NguBippS0c)

## Overview

This application simulates a small city populated with autonomous agents (residents) who have unique personalities, daily routines, and the ability to make decisions using AI language models. The simulation runs in a 3D environment built with Three.js, featuring a procedurally generated city layout with roads, buildings, and facilities.

## Features

### 🤖 Autonomous Agents
- **AI-Powered Decision Making**: Each agent uses OpenAI or Gemini API to make realistic decisions based on their personality and current situation
- **Unique Personalities**: Agents have distinct traits including sociability, energy levels, routine preferences, curiosity, and empathy
- **Memory System**: Short-term and long-term memory systems that influence future decisions
- **Relationship Dynamics**: Agents build relationships with each other through interactions
- **Daily Routines**: Each agent follows personalized daily schedules with different activities for morning, afternoon, evening, and night

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

## Getting Started

### Prerequisites
- A modern web browser with WebGL support
- OpenAI API key or Google Gemini API access

### Installation
1. Clone or download this repository
2. Open a terminal in the project directory
3. Start a local HTTP server:
   ```bash
   python3 -m http.server
   ```
4. Open your browser and navigate to `http://localhost:8000`

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
4. **Executes** decisions (moving, interacting, performing activities)
5. **Updates** their memory and relationships

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

### Key Components
- `agent.js`: Core agent logic and AI decision making
- `citylayout.js`: City generation and pathfinding
- `main.js`: Main simulation loop and controls
- `config.js`: Agent personalities and city configuration
- `character.js`: 3D character models and animations

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

## API Usage

The application uses AI APIs for realistic agent decision-making. API keys are not stored and are only used for real-time requests.

### Supported Providers
- **OpenAI GPT**: Default provider with comprehensive reasoning capabilities
- **Google Gemini**: Alternative provider for agent decision making

## Contributing

Feel free to contribute to this project by:
- Adding new agent personality types
- Implementing additional facilities and activities
- Improving the pathfinding algorithm
- Enhancing the 3D visualization
- Adding new interaction types between agents

## Acknowledgments

- Three.js community for 3D graphics capabilities
- OpenAI and Google for AI language model APIs
- The open-source community for various algorithms and techniques used in this simulation