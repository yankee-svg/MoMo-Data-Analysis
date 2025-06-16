#  MTN MoMo SMS Data Processing System

## Description

This application takes MTN MoMo SMS transactions data that are saved in the XML file cleans it up, categorize them and organizes those data into a database. The application has a backend to handle the data, a database to store it and a simple frontend dashboard that shows the information clearly to the users.


## Technologies used

### For Frontend

- HTML
- CSS
- Javascript

### For Backend

- Python
- Flask web framework
- SQLite database



## dir structure


MOMO Data-Analysis/
```
│
├── app.py                    # Main application with the backend Flask API
├── process_data.py           # Process the XML files and create the database
├── resolve_requirements.py   # Download the required packages (panda & flask) to run the project
│
├── static/                   
│   ├── css/
│   │   └── styles.css        # css file
│   │
│   └── js/
│       ├── charts.js         # Create charts
│       └── script.js
│
└── templates/                
    └── index.html            # The main HTML file
```

## How to Run the Application

### 1. Requirementsa for local deployment

- Python 3.x 
- The project files downloaded or cloned into a directory.

### 2. Installation & Setup

1.  **Navigate to the project directory** in your terminal or command prompt.
    ```bash
    cd path/to/momo_dashboard
    ```

2.  **Run the dependency resolution script.**
    ```
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

2.  **Process the Data and Populate the Database.** This step only needs to be run once, or whenever your source `data/` files change.
    ```bash
    python process_data.py
    ```

3.  **Start the backend API**
    ```bash
    python app.py
    ```
    The server will start, typically on `http://127.0.0.1:5001`.

4.  **View the Dashboard.**
    -   navigate to `http://127.0.0.1:5001`. in your browser
    -   The dashboard will open with all data visualized  for interpretation


