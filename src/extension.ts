import * as vscode from 'vscode';
import { CONFIG, IPatternSet } from './config';
import { PatternService } from './services/PatternService';
import { DecorationService } from './services/DecorationService';
import { PatternCodeLensProvider } from './providers/PatternCodeLensProvider';

export const activate = async (context: vscode.ExtensionContext): Promise<void> => {
  const config = vscode.workspace.getConfiguration(CONFIG.VS_SETTINGS_KEY);

  let highlightColor = config.get<string>(CONFIG.HIGHLIGHT_COLOR_KEY) ?? CONFIG.DEFAULT_HIGHLIGHT_COLOR;
  let highlightTextColor = config.get<string>(CONFIG.HIGHLIGHT_TEXT_COLOR_KEY) ?? CONFIG.DEFAULT_HIGHLIGHT_TEXT_COLOR;

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
    const options = jsonData.sets.map(set => set.name).concat(['All', 'Clear Highlights']);
    const selectedSet = await vscode.window.showQuickPick(options, { placeHolder: 'Select a pattern set to highlight' });

    if (selectedSet === 'Clear Highlights') {
      selectedPatternSets = [];
      activeEditor?.setDecorations(decoration, []);
      codeLensProvider.setPatternSets([]);
      return;
    }

    selectedPatternSets = selectedSet === 'All'
      ? jsonData.sets
      : jsonData.sets.filter(set => set.name === selectedSet);

    if (activeEditor) {
      DecorationService.updateDecorations(activeEditor, selectedPatternSets, decoration);
    }
    codeLensProvider.setPatternSets(selectedPatternSets);
  });

  vscode.window.onDidChangeActiveTextEditor(editor => {
    activeEditor = editor;
    if (editor) {
      DecorationService.updateDecorations(editor, selectedPatternSets, decoration);
    }
  });

  vscode.workspace.onDidChangeTextDocument(event => {
    if (activeEditor && event.document === activeEditor.document) {
      DecorationService.updateDecorations(activeEditor, selectedPatternSets, decoration);
      codeLensProvider.setPatternSets(selectedPatternSets); // Ensure CodeLens is updated on document change
    }
  });

  vscode.workspace.onDidChangeConfiguration(async event => {
    if (event.affectsConfiguration(CONFIG.VS_SETTINGS_KEY)) {
      const config = vscode.workspace.getConfiguration(CONFIG.VS_SETTINGS_KEY);
      highlightColor = config.get<string>(CONFIG.HIGHLIGHT_COLOR_KEY) ?? CONFIG.DEFAULT_HIGHLIGHT_COLOR;
      highlightTextColor = config.get<string>(CONFIG.HIGHLIGHT_TEXT_COLOR_KEY) ?? CONFIG.DEFAULT_HIGHLIGHT_TEXT_COLOR;
      decoration.dispose();
      decoration = createDecoration();

      jsonData = await PatternService.readOrCreatePatternsFile(context);

      if (activeEditor) {
        DecorationService.updateDecorations(activeEditor, selectedPatternSets, decoration);
      }
    }
  });

  context.subscriptions.push(highlightCommand);
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider([{ scheme: 'file', language: '*' }, { scheme: 'untitled', language: '*' }], codeLensProvider)
  );
};

export const deactivate = (): void => {};