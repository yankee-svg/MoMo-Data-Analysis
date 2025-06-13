import sys
import subprocess
import os
import platform

# --- Configuration ---
VENV_DIR = "venv"
REQUIREMENTS_FILE = "requirements.txt"

def is_in_virtual_env():
    """Checks if the script is running inside a virtual environment."""
    return sys.prefix != sys.base_prefix

def get_venv_python_path():
    """Returns the path to the Python executable inside the virtual environment."""
    system = platform.system().lower()
    if system == "windows":
        return os.path.join(VENV_DIR, "Scripts", "python.exe")
    else:  # macOS and Linux
        return os.path.join(VENV_DIR, "bin", "python")

def create_virtual_env():
    """Creates a virtual environment if it doesn't exist."""
    if os.path.exists(VENV_DIR):
        print(f"Virtual environment '{VENV_DIR}' already exists.")
        return True
    
    print(f"Creating virtual environment at: ./{VENV_DIR}")
    try:
        subprocess.check_call([sys.executable, "-m", "venv", VENV_DIR])
        print("Virtual environment created successfully.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"ERROR: Failed to create virtual environment. Error: {e}")
        return False

def install_requirements(python_executable):
    """Installs packages from requirements.txt using a specific Python interpreter."""
    print(f"Installing packages using interpreter: {python_executable}")
    try:
        command = [python_executable, "-m", "pip", "install", "-r", REQUIREMENTS_FILE]
        subprocess.check_call(command)
        print("\n" + "="*50)
        print("All requirements have been successfully installed!")
        print("="*50)
        return True
    except subprocess.CalledProcessError as e:
        print(f"\nERROR: Failed to install packages. Error: {e}")
        return False
    except FileNotFoundError:
        print(f"\nERROR: Could not find '{REQUIREMENTS_FILE}'.")
        return False

def main():
    """Main execution logic for a fully automated setup."""
    print("--- MoMo Dashboard Dependency Manager (Fully Automated) ---")

    # Exit if the requirements file is missing.
    if not os.path.exists(REQUIREMENTS_FILE):
        print(f"Error: The '{REQUIREMENTS_FILE}' file was not found.")
        sys.exit(1)

    if is_in_virtual_env():
        # --- Stage 2: Already in a venv, so we can install ---
        print("Running inside a virtual environment. Proceeding with installation.")
        install_requirements(sys.executable)
        
        print("\nSetup is complete! You can now run the application.")
        print("Make sure to activate the virtual environment in your terminal first:")
        
        system = platform.system().lower()
        if system == "windows":
            print(f"  --> .\\{VENV_DIR}\\Scripts\\activate")
        else:
            print(f"  --> source {VENV_DIR}/bin/activate")
            
        print("\nNEXT STEPS, run:")
        print("0. `.\\venv\Scripts\\activate`")
        print("1. `python process_data.py`")
        print("2. `python app.py`")

    else:
        # --- Stage 1: Not in a venv, so create it and re-launch ---
        print("Not running in a virtual environment. Setting one up...")
        
        if not create_virtual_env():
            sys.exit(1) # Exit if venv creation fails
            
        print("\nVirtual environment is ready. Re-launching script inside the venv...")
        
        # Get the path to the python executable in the new venv
        venv_python_path = get_venv_python_path()
        
        # Relaunch this script using the venv's python
        # This new process will run the 'is_in_virtual_env()' check and find it to be True.
        try:
            subprocess.check_call([venv_python_path, __file__])
        except subprocess.CalledProcessError as e:
            print(f"ERROR: Failed to re-launch script inside the virtual environment. Error: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()