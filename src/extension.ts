import * as vscode from 'vscode';
import { CONFIG, IJsonData, IPattern } from './config';
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
  let selectedPatterns: IPattern[] = [];
  const codeLensProvider = new PatternCodeLensProvider();

  const highlightCommand = vscode.commands.registerCommand('extension.highlightPatterns', async () => {
    const options = jsonData.sets.map(set => set.name).concat(['All', 'Clear Highlights']);
    const selectedSet = await vscode.window.showQuickPick(options, { placeHolder: 'Select a pattern set to highlight' });

    if (selectedSet === 'Clear Highlights') {
      selectedPatterns = [];
      activeEditor?.setDecorations(decoration, []);
      codeLensProvider.setPatterns([]);
      return;
    }

    selectedPatterns = selectedSet === 'All'
      ? jsonData.sets.flatMap(set => set.patterns)
      : jsonData.sets.find(set => set.name === selectedSet)?.patterns ?? [];

    if (activeEditor) {
      DecorationService.updateDecorations(activeEditor, selectedPatterns, decoration);
    }
    codeLensProvider.setPatterns(selectedPatterns);
  });

  const refreshJsonData = async () => {
    jsonData = await PatternService.readOrCreatePatternsFile(context);
  };

  vscode.window.onDidChangeActiveTextEditor(editor => {
    activeEditor = editor;
    if (editor) {
      DecorationService.updateDecorations(editor, selectedPatterns, decoration);
    }
  });

  vscode.workspace.onDidChangeTextDocument(event => {
    if (activeEditor && event.document === activeEditor.document) {
      DecorationService.updateDecorations(activeEditor, selectedPatterns, decoration);
      codeLensProvider.setPatterns(selectedPatterns); // Ensure CodeLens is updated on document change
    }
  });

  vscode.workspace.onDidChangeConfiguration(async event => {
    if (event.affectsConfiguration(CONFIG.VS_SETTINGS_KEY)) {
      const config = vscode.workspace.getConfiguration(CONFIG.VS_SETTINGS_KEY);
      highlightColor = config.get<string>(CONFIG.HIGHLIGHT_COLOR_KEY) ?? CONFIG.DEFAULT_HIGHLIGHT_COLOR;
      highlightTextColor = config.get<string>(CONFIG.HIGHLIGHT_TEXT_COLOR_KEY) ?? CONFIG.DEFAULT_HIGHLIGHT_TEXT_COLOR;
      decoration.dispose();
      decoration = createDecoration();

      await refreshJsonData();

      if (activeEditor) {
        DecorationService.updateDecorations(activeEditor, selectedPatterns, decoration);
      }
    }
  });

  context.subscriptions.push(highlightCommand);
  context.subscriptions.push(vscode.languages.registerCodeLensProvider([{ scheme: 'file', language: '*' }, { scheme: 'untitled', language: '*' }], codeLensProvider));
};

export const deactivate = (): void => { };