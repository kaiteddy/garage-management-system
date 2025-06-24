import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../src'))

from src.services.google_drive_service import GoogleDriveService

def test_categorization():
    db_path = os.path.join(os.path.dirname(__file__), '../instance/garage.db')
    service = GoogleDriveService(db_path=db_path)
    
    folder_id = "153McUchSClwNMA5FN-RQMhx-Nh7tAFAj"
    result = service.analyze_folder_contents(folder_id)
    print("Categorization Result:", result)

if __name__ == "__main__":
    test_categorization()
