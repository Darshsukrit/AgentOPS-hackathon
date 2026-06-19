# AgentOS Frontend

This directory contains the visual intelligence dashboard for **AgentOS**, the enterprise AI governance platform. It is a React application built with TypeScript, Vite, React Flow, and Lucide React.

## Prerequisites

Before running the application, make sure you have [Node.js](https://nodejs.org/) installed (recommended version: 18 or later).

## Installation

1. Open your terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install the package dependencies:
   ```bash
   npm install
   ```

## Running the Frontend (Local Development)

To run the frontend with mock data in development mode:

```bash
npm run dev
```

Once started, the development server will run locally. Open your browser and navigate to:
* **Local:** [http://localhost:5173/](http://localhost:5173/)

## Building for Production

To compile the TypeScript code and bundle the frontend into static files (inside the `dist` directory):

```bash
npm run build
```

You can preview the built static output using:
```bash
npm run preview
```

## Features Implemented
* **Governance Command Center (Dashboard)**: Implements visual system status updates, a dynamic pipeline tracker, overall risk analysis metrics, and transaction auditing alerts.
* **Investigation Room**: An interactive workflow steps inspector featuring step-by-step playback controls (Play, Pause, and Skip controls), time-based ledger auditing, and live transaction traces.
* **AI Explainability Center**: Powered by **React Flow** to visualize real-time agent graphs, detailing custom node states, token efficiency, evaluation metrics, and complete confidence score distributions.
