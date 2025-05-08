import * as vscode from 'vscode';
import { CONFIG, IPatternSet } from './config';
import { PatternService } from './services/PatternService';
import { DecorationService } from './services/DecorationService';
import { PatternCodeLensProvider } from './providers/PatternCodeLensProvider';

export const activate = async (context: vscode.ExtensionContext): Promise<void> => {
  const config = vscode.workspace.getConfiguration(CONFIG.VS_SETTINGS_KEY);

  let highlightColor = config.get<string>(CONFIG.HIGHLIGHT_COLOR_KEY) ?? CONFIG.DEFAULT_HIGHLIGHT_COLOR;
  let highlightTextColor = config.get<string>(CONFIG.HIGHLIGHT_TEXT_COLOR_KEY) ?? CONFIG.DEFAULT_HIGHLIGHT_TEXT_COLOR;
  let patternIsolationPrefix = config.get<string>(CONFIG.PATTERN_ISOLATION_PREFIX_KEY) ?? CONFIG.DEFAULT_PATTERN_ISOLATION_PREFIX;
  let patternIsolationPostfix = config.get<string>(CONFIG.PATTERN_ISOLATION_POSTFIX_KEY) ?? CONFIG.DEFAULT_PATTERN_ISOLATION_POSTFIX;
  let isPatternIsolationEnabled = false; // Track whether pattern isolation is enabled

  let jsonData = await PatternService.readOrCreatePatternsFile(context);

  let decoration: vscode.TextEditorDecorationType;
  const createDecoration = () => {
    return vscode.window.createTextEditorDecorationType({ backgroundColor: highlightColor, color: highlightTextColor });
  };
  decoration = createDecoration();

  let activeEditor = vscode.window.activeTextEditor;
  let selectedPatternSets: IPatternSet[] = [];
  const codeLensProvider = new PatternCodeLensProvider();

  const highlightCommand = vscode.commands.registerCommand('extension.highlightPatterns', async () => {
    const patternSetOptions = [
      ...jsonData.sets.map(set => ({ label: set.name })),
      { label: 'All' },
      { label: 'Clear Highlights' }
    ];

    const selectedSet = await vscode.window.showQuickPick(patternSetOptions, {
      placeHolder: 'Select a pattern set to highlight',
      canPickMany: false
    });

    if (!selectedSet) {
      return; // User canceled the selection
    }

    if (selectedSet.label === 'Clear Highlights') {
      selectedPatternSets = [];
      activeEditor?.setDecorations(decoration, []);
      codeLensProvider.setPatternSets([], isPatternIsolationEnabled, patternIsolationPrefix, patternIsolationPostfix);
      return;
    }

    const newSelectedPatternSets = selectedSet.label === 'All'
      ? jsonData.sets
      : jsonData.sets.filter(set => set.name === selectedSet.label);

    const isolationOptions = [
      { label: 'Highlight only patterns that are separated' },
      { label: 'Allow highlighting patterns in any part of the string' }
    ];

    const isolationChoice = await vscode.window.showQuickPick(isolationOptions, {
      placeHolder: 'Select pattern matching mode',
      canPickMany: false
    });

    if (!isolationChoice) {
      return; // User canceled the selection
    }

    const newIsPatternIsolationEnabled = isolationChoice.label === 'Highlight only patterns that are separated';

    // Update decorations and CodeLens if the isolation settings or selected pattern sets have changed
    if (
      newIsPatternIsolationEnabled !== isPatternIsolationEnabled ||
      JSON.stringify(newSelectedPatternSets) !== JSON.stringify(selectedPatternSets)
    ) {
      isPatternIsolationEnabled = newIsPatternIsolationEnabled;
      selectedPatternSets = newSelectedPatternSets;

      if (activeEditor) {
        DecorationService.updateDecorations(
          activeEditor,
          selectedPatternSets,
          decoration,
          isPatternIsolationEnabled ? patternIsolationPrefix : '',
          isPatternIsolationEnabled ? patternIsolationPostfix : ''
        );
      }

      codeLensProvider.setPatternSets(
        selectedPatternSets,
        isPatternIsolationEnabled,
        patternIsolationPrefix,
        patternIsolationPostfix
      );
    }
  });

  vscode.window.onDidChangeActiveTextEditor(editor => {
    activeEditor = editor;
    if (editor) {
      DecorationService.updateDecorations(
        editor,
        selectedPatternSets,
        decoration,
        isPatternIsolationEnabled ? patternIsolationPrefix : '',
        isPatternIsolationEnabled ? patternIsolationPostfix : ''
      );
    }
  });

  vscode.workspace.onDidChangeTextDocument(event => {
    if (activeEditor && event.document === activeEditor.document) {
      DecorationService.updateDecorations(
        activeEditor,
        selectedPatternSets,
        decoration,
        isPatternIsolationEnabled ? patternIsolationPrefix : '',
        isPatternIsolationEnabled ? patternIsolationPostfix : ''
      );

      // Ensure CodeLens is updated on document change
      codeLensProvider.setPatternSets(
        selectedPatternSets,
        isPatternIsolationEnabled,
        patternIsolationPrefix,
        patternIsolationPostfix
      );
    }
  });

  vscode.workspace.onDidChangeConfiguration(async event => {
    if (event.affectsConfiguration(CONFIG.VS_SETTINGS_KEY)) {
      const config = vscode.workspace.getConfiguration(CONFIG.VS_SETTINGS_KEY);
      highlightColor = config.get<string>(CONFIG.HIGHLIGHT_COLOR_KEY) ?? CONFIG.DEFAULT_HIGHLIGHT_COLOR;
      highlightTextColor = config.get<string>(CONFIG.HIGHLIGHT_TEXT_COLOR_KEY) ?? CONFIG.DEFAULT_HIGHLIGHT_TEXT_COLOR;
      patternIsolationPrefix = config.get<string>(CONFIG.PATTERN_ISOLATION_PREFIX_KEY) ?? CONFIG.DEFAULT_PATTERN_ISOLATION_PREFIX;
      patternIsolationPostfix = config.get<string>(CONFIG.PATTERN_ISOLATION_POSTFIX_KEY) ?? CONFIG.DEFAULT_PATTERN_ISOLATION_POSTFIX;
      decoration.dispose();
      decoration = createDecoration();

      jsonData = await PatternService.readOrCreatePatternsFile(context);

      if (activeEditor) {
        DecorationService.updateDecorations(
          activeEditor,
          selectedPatternSets,
          decoration,
          isPatternIsolationEnabled ? patternIsolationPrefix : '',
          isPatternIsolationEnabled ? patternIsolationPostfix : ''
        );
      }
    }
  });

  context.subscriptions.push(highlightCommand);
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider([{ scheme: 'file', language: '*' }, { scheme: 'untitled', language: '*' }], codeLensProvider)
  );
};

export const deactivate = (): void => {};