# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Local Development Setup

To run the Austin City Learn-its application locally, follow these steps:

### Prerequisites

Make sure you have the following installed:
*   **Node.js** (LTS version recommended)
*   **npm** (comes with Node.js)
*   **Python 3.8+**
*   **pip** (comes with Python)
*   **`venv` module** (for Python virtual environments, usually built-in)

### 1. Backend Setup

The backend handles video processing and AI-powered quiz generation.

1.  **Navigate to the project root:**
    ```bash
    cd /path/to/your/project/austin-city-learn-its
    ```
2.  **Create and activate a Python virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```
3.  **Install Python dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Configure API Key:**
    The backend requires an API key for the Generative AI model (e.g., Google Gemini).
    *   Create a file named `.env` in the project root directory.
    *   Add your API key to this file:
        ```
        GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
        ```
    *   **Note:** You can obtain a free Gemini API key from [Google AI Studio](https://aistudio.google.com/).
5.  **Start the Backend Server:**
    ```bash
    python main.py
    ```
    The server will typically run on `http://localhost:8000`. Keep this terminal open.

### 2. Frontend Setup

The frontend is the React application that provides the user interface.

1.  **Open a new terminal and navigate to the project root:**
    ```bash
    cd /path/to/your/project/austin-city-learn-its
    ```
2.  **Install Node.js dependencies:**
    ```bash
    npm install
    ```
3.  **Start the Frontend Development Server:**
    ```bash
    npm run dev
    ```
    This will start the React app, usually accessible at `http://localhost:5173` (or similar).

You should now be able to access the Austin City Learn-its application in your web browser and use its full functionality.
