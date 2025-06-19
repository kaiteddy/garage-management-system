#!/usr/bin/env python3
"""
Split large CSV files into smaller chunks for upload
"""

import pandas as pd
import os
import sys

def split_csv_file(input_file, chunk_size=500):
    """Split a large CSV file into smaller chunks"""
    
    if not os.path.exists(input_file):
        print(f"❌ File not found: {input_file}")
        return
    
    print(f"📄 Splitting {input_file} into chunks of {chunk_size} rows...")
    
    try:
        # Try different encodings
        encodings_to_try = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        df = None
        
        for encoding in encodings_to_try:
            try:
                df = pd.read_csv(input_file, encoding=encoding)
                print(f"✅ Successfully read with {encoding} encoding")
                break
            except UnicodeDecodeError:
                continue
        
        if df is None:
            print("❌ Could not read file with any encoding")
            return
        
        total_rows = len(df)
        print(f"📊 Total rows: {total_rows}")
        
        # Calculate number of chunks needed
        num_chunks = (total_rows + chunk_size - 1) // chunk_size
        print(f"📦 Will create {num_chunks} chunks")
        
        # Get file name without extension
        base_name = os.path.splitext(input_file)[0]
        
        # Split into chunks
        for i in range(num_chunks):
            start_idx = i * chunk_size
            end_idx = min((i + 1) * chunk_size, total_rows)
            
            chunk_df = df.iloc[start_idx:end_idx]
            chunk_filename = f"{base_name}_chunk_{i+1:02d}.csv"
            
            chunk_df.to_csv(chunk_filename, index=False, encoding='utf-8')
            print(f"✅ Created {chunk_filename} ({len(chunk_df)} rows)")
        
        print(f"\n🎉 Successfully split into {num_chunks} files!")
        print(f"📁 Files created: {base_name}_chunk_01.csv to {base_name}_chunk_{num_chunks:02d}.csv")
        print("\n📋 Upload Instructions:")
        print("1. Go to http://127.0.0.1:5001/upload")
        print("2. Select your data type (vehicles, documents, etc.)")
        print("3. ✅ Enable 'Update existing records'")
        print("4. Upload each chunk file one by one")
        print("5. The system will combine all data automatically")
        
    except Exception as e:
        print(f"❌ Error splitting file: {e}")

def show_usage():
    """Show usage instructions"""
    print("🔧 CSV File Splitter for Large ELI MOTORS Exports")
    print("=" * 50)
    print("Usage:")
    print("  python split_csv.py <filename> [chunk_size]")
    print("")
    print("Examples:")
    print("  python split_csv.py vehicles.csv")
    print("  python split_csv.py vehicles.csv 500")
    print("")
    print("Default chunk size: 500 rows")
    print("Recommended for large files: 300-500 rows per chunk")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        show_usage()
    else:
        input_file = sys.argv[1]
        chunk_size = int(sys.argv[2]) if len(sys.argv) > 2 else 500
        split_csv_file(input_file, chunk_size)
