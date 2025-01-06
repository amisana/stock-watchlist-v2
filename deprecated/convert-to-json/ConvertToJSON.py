import subprocess
import os

def run_applescript(script_path):
    """
    Runs an AppleScript file and retrieves the output.
    
    :param script_path: Path to the AppleScript file.
    :return: Output from the AppleScript execution.
    """
    try:
        # Run the AppleScript using osascript
        result = subprocess.run(
            ["osascript", script_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        if result.returncode != 0:
            print(f"Error: {result.stderr.strip()}")
            return None
        return result.stdout.strip()
    except Exception as e:
        print(f"Exception occurred: {e}")
        return None

# Define path to your AppleScript file
script_path = "select_files.scpt"  # Ensure the script file is in the same directory or provide full path

# Run the AppleScript and get selected file paths
output = run_applescript(script_path)

if output:
    # Process the file paths returned by the AppleScript
    file_paths = output.split("\n")
    print("Selected files:")
    for path in file_paths:
        print(path)
else:
    print("No files selected or an error occurred.")