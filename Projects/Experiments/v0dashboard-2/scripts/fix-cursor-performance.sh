#!/bin/bash

# Cursor IDE Performance Fix Script
# Specifically targets Cursor IDE performance issues

echo "🎯 Cursor IDE Performance Fix"
echo "============================="

# 1. Check current Cursor resource usage
echo "📊 Current Cursor resource usage:"
ps aux | grep -E "Cursor|cursor" | grep -v grep | head -5
echo ""

# 2. Kill all Cursor processes
echo "🛑 Stopping all Cursor processes..."
pkill -f "Cursor" 2>/dev/null
sleep 3

# 3. Clear Cursor caches and temporary files
echo "🧹 Clearing Cursor caches..."
rm -rf ~/Library/Caches/Cursor/* 2>/dev/null || echo "Cache already clean"
rm -rf ~/Library/Application\ Support/Cursor/logs/* 2>/dev/null || echo "Logs already clean"
rm -rf ~/Library/Application\ Support/Cursor/CachedData/* 2>/dev/null || echo "Cached data already clean"

# 4. Create optimized Cursor settings
echo "⚙️ Creating optimized Cursor settings..."
CURSOR_SETTINGS_DIR="$HOME/Library/Application Support/Cursor/User"
mkdir -p "$CURSOR_SETTINGS_DIR"

# Create performance-optimized settings.json
cat > "$CURSOR_SETTINGS_DIR/settings.json" << 'EOF'
{
  "typescript.preferences.includePackageJsonAutoImports": "off",
  "typescript.suggest.autoImports": false,
  "typescript.updateImportsOnFileMove.enabled": "never",
  "typescript.preferences.includePackageJsonAutoImports": "off",
  "typescript.suggest.includeCompletionsForModuleExports": false,
  "typescript.suggest.includeAutomaticOptionalChainCompletions": false,
  "typescript.workspaceSymbols.scope": "currentProject",
  "typescript.disableAutomaticTypeAcquisition": true,
  "typescript.preferences.includePackageJsonAutoImports": "off",
  
  "javascript.suggest.autoImports": false,
  "javascript.updateImportsOnFileMove.enabled": "never",
  "javascript.preferences.includePackageJsonAutoImports": "off",
  
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/.git/subtree-cache/**": true,
    "**/node_modules/**": true,
    "**/.next/**": true,
    "**/dist/**": true,
    "**/build/**": true,
    "**/.cache/**": true,
    "**/coverage/**": true,
    "**/.nyc_output/**": true,
    "**/tmp/**": true,
    "**/temp/**": true
  },
  
  "search.exclude": {
    "**/node_modules": true,
    "**/bower_components": true,
    "**/.git": true,
    "**/.DS_Store": true,
    "**/tmp": true,
    "**/.next": true,
    "**/dist": true,
    "**/build": true,
    "**/.cache": true,
    "**/coverage": true,
    "**/.nyc_output": true
  },
  
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/.next": true,
    "**/dist": true,
    "**/build": true,
    "**/.cache": true,
    "**/coverage": true,
    "**/.nyc_output": true
  },
  
  "editor.quickSuggestions": {
    "other": false,
    "comments": false,
    "strings": false
  },
  
  "editor.parameterHints.enabled": false,
  "editor.suggestOnTriggerCharacters": false,
  "editor.acceptSuggestionOnEnter": "off",
  "editor.tabCompletion": "off",
  "editor.wordBasedSuggestions": "off",
  "editor.suggest.localityBonus": false,
  "editor.suggest.shareSuggestSelections": false,
  "editor.suggest.snippetsPreventQuickSuggestions": false,
  "editor.suggest.showWords": false,
  
  "extensions.autoUpdate": false,
  "extensions.autoCheckUpdates": false,
  
  "telemetry.telemetryLevel": "off",
  "workbench.enableExperiments": false,
  "workbench.settings.enableNaturalLanguageSearch": false,
  
  "git.enabled": false,
  "git.autorefresh": false,
  "git.autofetch": false,
  
  "terminal.integrated.enablePersistentSessions": false,
  "terminal.integrated.persistentSessionReviveProcess": "never",
  
  "workbench.startupEditor": "none",
  "window.restoreWindows": "none",
  
  "editor.minimap.enabled": false,
  "editor.codeLens": false,
  "editor.lightbulb.enabled": "off",
  "editor.hover.enabled": false,
  "editor.links": false,
  "editor.occurrencesHighlight": "off",
  "editor.selectionHighlight": false,
  "editor.wordHighlight": "off",
  
  "breadcrumbs.enabled": false,
  "outline.showVariables": false,
  "outline.showFunctions": false,
  "outline.showClasses": false,
  
  "problems.decorations.enabled": false,
  "problems.showCurrentInStatus": false
}
EOF

echo "✅ Created performance-optimized Cursor settings"

# 5. Disable resource-heavy extensions
echo "🔌 Creating extensions configuration to disable heavy extensions..."
cat > "$CURSOR_SETTINGS_DIR/extensions.json" << 'EOF'
{
  "recommendations": [],
  "unwantedRecommendations": [
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "ms-python.python",
    "ms-dotnettools.csharp"
  ]
}
EOF

# 6. Set environment variables for performance
echo "⚡ Setting performance environment variables..."
export NODE_OPTIONS="--max-old-space-size=2048"
export ELECTRON_NO_ASAR=true
export ELECTRON_ENABLE_LOGGING=false

# 7. Start Cursor with performance flags
echo "🚀 Starting Cursor with performance optimizations..."
open /Applications/Cursor.app --args --disable-gpu-sandbox --disable-software-rasterizer --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-features=TranslateUI --disable-ipc-flooding-protection --max-old-space-size=2048

echo ""
echo "✅ Cursor performance optimization complete!"
echo ""
echo "🎯 What was done:"
echo "  - Killed all Cursor processes"
echo "  - Cleared Cursor caches"
echo "  - Created performance-optimized settings"
echo "  - Disabled resource-heavy features"
echo "  - Started Cursor with performance flags"
echo ""
echo "📋 Additional recommendations:"
echo "1. Disable unnecessary extensions in Cursor"
echo "2. Close unused tabs and windows"
echo "3. Avoid opening large files (>1MB)"
echo "4. Use 'Go to File' (Cmd+P) instead of file explorer for navigation"
echo "5. Consider using VS Code for lighter tasks"
echo ""
echo "🔍 Monitor performance with:"
echo "  ps aux | grep -E 'Cursor|cursor' | grep -v grep"
