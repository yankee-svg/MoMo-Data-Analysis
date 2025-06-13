
## How to Run the Application

### 1. Prerequisites

- Python 3.x installed on your system.
- The project files downloaded or cloned into a directory.

### 2. Installation & Setup

This project features a fully automated setup script. You only need to run one command.

1.  **Navigate to the project directory** in your terminal or command prompt.
    ```bash
    cd path/to/momo_dashboard
    ```

2.  **Run the dependency resolution script.**
    ```bash
    python resolve_requirements.py
    ```
    This script will automatically:
    - Create a Python virtual environment named `venv` to keep dependencies isolated.
    - Re-launch itself inside the new environment to install all required packages (`Flask`, `pandas`, `lxml`) from `requirements.txt`.

### 3. Running the Application

After the setup script finishes, you need to activate the environment it created and then run the application.

1.  **Activate the Virtual Environment.** The command depends on your operating system.
    -   **Windows (Command Prompt / PowerShell):**
        ```bash
        .\venv\Scripts\activate
        ```
    -   **macOS / Linux:**
        ```bash
        source venv/bin/activate
        ```
    Your terminal prompt should now be prefixed with `(venv)`.

2.  **Process the Data and Populate the Database.** This step only needs to be run once, or whenever your source `data/` files change.
    ```bash
    python process_data.py
    ```

3.  **Start the Backend API Server.**
    ```bash
    python app.py
    ```
    The server will start, typically on `http://127.0.0.1:5001`.

4.  **View the Dashboard.**
    -   Open your web browser and navigate to `http://127.0.0.1:5001`.
    -   The dashboard will load with all data visualized and ready for interaction.

## Development Journey & Challenges

This project involved several interesting challenges that were overcome during development:

1.  **Challenge: Dependency Management Across Different Systems.**
    -   **Problem:** The initial setup required manual installation of packages like Flask (`pip install flask`). This is not portable and can lead to errors (`ModuleNotFoundError`) if a user has a different Python setup.
    -   **Solution:** We implemented an industry-standard `requirements.txt` file to list all dependencies. An automation script, `resolve_requirements.py`, was created to read this file and install everything, making the setup process a single command.

2.  **Challenge: Automating Virtual Environment Creation.**
    -   **Problem:** The initial automation script installed packages into the user's global Python environment, which is bad practice. We needed a way to enforce the use of an isolated virtual environment.
    -   **Solution:** The `resolve_requirements.py` script was upgraded to be "self-aware." It now detects if it's running inside a virtual environment. If not, it creates one (`venv`), and then automatically re-launches itself using the Python interpreter from within that new environment to complete the package installation. This provides a true one-command setup experience while ensuring best practices.

3.  **Challenge: Incomplete Data Processing & No Charts.**
    -   **Problem:** The initial run of `process_data.py` only processed the CSV file, ignoring the much larger and more complex XML file. This resulted in a mostly empty dashboard with no charts rendering.
    -   **Solution:** The issue was traced to the regular expressions being too strict for the subtle variations in the XML's SMS body text. The regex patterns in `process_data.py` were made more flexible (e.g., allowing for optional spaces with `\s*`). Additionally, a logging mechanism was added to write any un-parsable messages to `unprocessed_logs.txt`, making future debugging much easier.

4.  **Challenge: Charts Not Loading on the Frontend.**
    -   **Problem:** Even after the database was correctly populated, the charts on the dashboard were not rendering.
    -   **Solution:** The root cause was a missing `<script>` tag in `index.html`. The Chart.js library was present in the project files but was never actually loaded by the browser. Adding `<script src="{{ url_for('static', filename='js/chart.js') }}"></script>` to the HTML head (before our own script) resolved the issue instantly.

5.  **Challenge: Poor Chart Layout.**
    -   **Problem:** The bar chart was vertically oversized, taking up too much screen space and creating a poor user experience.
    -   **Solution:** A CSS rule (`height: 40vh; max-height: 40vh;`) was applied to the `.chart-container` class. This constrained the chart's height to 40% of the viewport's height, leading to a much more balanced and professional-looking dashboard layout.