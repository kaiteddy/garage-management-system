# Data Import Pipeline

A robust and maintainable data import pipeline for importing data from CSV files into a PostgreSQL database.

## Features

- **Flexible Configuration**: Define field mappings and transformations using YAML configuration files
- **Data Validation**: Built-in validation for required fields, data types, and custom rules
- **Batch Processing**: Efficiently process large datasets with progress tracking
- **Error Handling**: Detailed error reporting and logging
- **Idempotent Imports**: Uses UPSERT to avoid duplicate data
- **Modular Design**: Easy to extend for new data types and import sources

## Installation

1. Clone the repository
2. Install the required dependencies:

```bash
pip install -r requirements.txt
```

3. Install the package in development mode:

```bash
pip install -e .
```

## Configuration

1. Create a `.env` file in the project root with your database connection details:

```
DATABASE_URL=postgresql://user:password@host:port/database
```

2. Create YAML configuration files in the `config/column_maps/` directory for each data type you want to import. Example configurations are provided for:
   - `documents.yml`
   - `line_items.yml`
   - `document_extras.yml`

## Usage

Run the import script with the appropriate arguments:

```bash
python -m import_pipeline.scripts.run_imports --type documents --file path/to/your/data.csv
```

### Command Line Arguments

- `--type`: Type of data to import (documents, line_items, document_extras)
- `--file`: Path to the CSV file to import
- `--config-dir`: (Optional) Directory containing the configuration files (default: config/column_maps/)

## Development

### Project Structure

```
import_pipeline/
├── config/
│   └── column_maps/       # YAML configuration files
├── src/
│   ├── import_pipeline/
│   │   ├── __init__.py
│   │   ├── db.py          # Database connection and utilities
│   │   ├── parsers.py     # Data parsing utilities
│   │   ├── validators.py  # Data validation utilities
│   │   └── importers/     # Importer classes
│   │       ├── __init__.py
│   │       ├── base_importer.py
│   │       ├── document_importer.py
│   │       ├── line_item_importer.py
│   │       └── document_extra_importer.py
│   └── scripts/
│       └── run_imports.py # Main script
├── .env.example           # Example environment variables
├── README.md
├── requirements.txt
└── setup.py
```

### Adding a New Importer

1. Create a new importer class in `src/import_pipeline/importers/` that extends `BaseImporter`
2. Define the `CONFIG_FILE` and `TABLE_NAME` class variables
3. Override the `_process_record` method if you need custom record processing
4. Add the new importer to the `IMPORTERS` dictionary in `run_imports.py`
5. Create a corresponding YAML configuration file in `config/column_maps/`

## License

MIT
