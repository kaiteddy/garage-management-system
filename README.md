# Garage Management System - Code Documentation

This repository contains comprehensive documentation for the Garage Management System codebase, designed to help developers understand the system architecture, component relationships, and code organization.

> **Quick Start**: Open the [index.html](index.html) file in your browser for an interactive documentation portal with easy navigation to all documentation resources.

## Documentation Contents

1. **[Code Index](code-index.md)** - A detailed catalog of all system components with descriptions
2. **[System Architecture](system-architecture.md)** - Visual diagrams of system architecture and data flows
3. **[System Architecture (HTML)](system-architecture.html)** - Interactive HTML version of the architecture diagrams
4. **[Quick Reference](quick-reference.md)** - Concise tables of key components for quick lookup

## How to Use This Documentation

### For New Developers

If you're new to the codebase, we recommend the following approach:

1. Start with the **System Architecture** document to get a high-level understanding of how the components fit together
2. Use the **Quick Reference** guide to get familiar with the key components and their relationships
3. Review the **Code Index** for more detailed information about specific files and their purposes
4. Use the diagrams as a reference when exploring the actual code

### For Specific Tasks

Depending on what you're working on, you might want to focus on specific sections:

- **Backend Development**: Check the Key Services table in the Quick Reference, then focus on the backend components in the Code Index and the Component Relationships diagram
- **Frontend Development**: Review the Frontend Pages and JavaScript Modules tables in the Quick Reference, then explore the frontend components and the Data Flow diagram
- **Integration Work**: Look at the External Integrations table in the Quick Reference, then pay special attention to the Integration Components section and the relevant flow diagrams
- **Database Work**: Refer to the Database Models table in the Quick Reference, then look at the Database Schema section and the Data Layer in the Component Relationships diagram
- **API Development**: Use the API Endpoints table in the Quick Reference as a starting point, then explore the detailed API documentation in the Code Index

## Key System Features

The Garage Management System includes the following key features:

1. Customer management
2. Vehicle tracking
3. Job scheduling and management
4. MOT reminders and tracking
5. Workshop diary and bay allocation
6. Digital job sheets
7. Invoicing and payments
8. Parts inventory management
9. Google Drive integration for data import/export
10. DVSA integration for MOT data
11. SMS notifications for customers
12. Reporting and analytics

## System Architecture Overview

The system follows a modular architecture with clear separation of concerns:

- **Frontend**: HTML/CSS/JavaScript-based UI with component-based organization
- **Backend**: Flask-based Python application with RESTful API endpoints
- **Services Layer**: Business logic implementation
- **Data Layer**: Database models and data access
- **Integrations**: External system connections (DVSA, Google Drive, SMS, etc.)

## Development Guidelines

When working with this codebase, please follow these guidelines:

1. **Maintain Separation of Concerns**: Keep business logic in services, data access in models, and API endpoints in routes
2. **Follow Existing Patterns**: Use the established patterns for new features
3. **Update Documentation**: When making significant changes, update the relevant documentation
4. **Test Thoroughly**: Ensure all new features and changes are properly tested

## Viewing the Diagrams

The system architecture document contains Mermaid diagrams. You have several options to view these diagrams:

### HTML Version (Recommended)
For the best interactive experience, open the **[System Architecture HTML](system-architecture.html)** file in any modern web browser. This version:
- Renders diagrams automatically using the Mermaid JavaScript library
- Provides better navigation between diagrams
- Offers improved styling and readability
- Works in any browser without additional plugins

### Markdown Version
If you prefer to view the diagrams in a Markdown context:
1. Use a Markdown viewer that supports Mermaid (like GitHub's built-in viewer)
2. Use the Mermaid Live Editor (https://mermaid.live/)
3. Install a Mermaid plugin for your IDE

## Contributing to Documentation

If you find areas of the documentation that could be improved or need updating:

1. Update the relevant markdown files
2. For diagram changes, edit the Mermaid code in the system-architecture.md file
3. Submit your changes through the normal code review process

## Contact

For questions about the codebase or documentation, please contact the development team.
