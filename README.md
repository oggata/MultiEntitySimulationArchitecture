# MESA (Multi-Entity Simulation Architecture)

A 3D autonomous agent simulation that creates virtual cities where AI-powered residents go about their daily lives with realistic behaviors, interactions, and decision-making processes.

![Screen](./images/Walk-sim.gif)

## Main System Setup

### For Mac

1. Download mesa-1.0.0-arm64.dmg
https://github.com/oggata/MultiEntitySimulationArchitecture/blob/main/install/mesa-1.0.0-arm64.dmg
2. Install from the dmg file
![Screen](./images/install.png)
3. Launch

### Windows and Others (Runs in Browser)

1. Download the file
2. Install npm
   ```bash
   npm install
   ```
3. Start a local HTTP server
   ```bash
   python3 -m http.server
   ```
4. Open your browser and navigate to `http://localhost:8000`

### Quick Start (Launch via External URL in Browser)

Access the URL below. (※ Cannot run Agents via Ollama.)

https://oggata.github.io/MultiEntitySimulationArchitecture/


## Preparing Related Tools

### Installing Ollama

MESA supports Ollama and can run locally.

1. Download Ollama
```bash
https://ollama.com
```
2. Install and run
```bash
$ ollama pull llama3.2
$ ollama run llama3.2
```

### Creating a Segmentation Map

You can create a simple segmentation map from aerial photos.

1. Load the following Python script into Google Colab.
https://github.com/oggata/MultiEntitySimulationArchitecture/blob/main/example/colab_3d_city_map.py

2. Import the map data and run the script
![Screen](./images/Segment-2.png)

3. The segmentation data (.json) will be generated. Place it under src/json/ to load it into MESA.
![Screen](./images/Segment-3.png)


### Output to Video File

Agent actions are output to a video file.

![Screen](./images/Walk-gif.gif)


## Community

Join our community to stay updated on the latest developments, share ideas, and connect with other users:

[![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/TdENtAnuuX)


