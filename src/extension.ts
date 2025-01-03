import * as vscode from 'vscode';
import * as path from 'path';

interface IPattern {
  pattern: string | RegExp;
  description: string;
}

interface IPatternSet {
  name: string;
  patterns: IPattern[];
}

interface IJsonData {
  sets: IPatternSet[];
}

const CONFIG_KEY = 'patternHighlighter';
const PATTERNS_JSON_FILE = 'patterns.json';
const DEFAULT_HIGHLIGHT_COLOR = 'rgba(0, 0, 255, 1)';
const DEFAULT_HIGHLIGHT_TEXT_COLOR = 'rgba(255, 255, 255, 0.7)';
const PATTERNS_JSON_PATH_KEY = 'patternsJsonPath';
const HIGHLIGHT_COLOR_KEY = 'highlightColor';
const HIGHLIGHT_TEXT_COLOR_KEY = 'highlightTextColor';

const defaultPatterns: IJsonData = {
  sets: [
    {
      name: "Default",
      patterns: [
        { pattern: "TODO", description: "This is a todo item" },
        { pattern: "FIXME", description: "This is a fixme item" }
      ]
    },
    {
      name: "Custom",
      patterns: [
        { pattern: "NOTE", description: "This is a note" },
        { pattern: "DEBUG", description: "This is a debug statement" }
      ]
    }
  ]
};

class PatternService {
  static async readOrCreatePatternsFile(context: vscode.ExtensionContext): Promise<IJsonData> {
    const config = vscode.workspace.getConfiguration(CONFIG_KEY);
    const jsonFilePath = config.get<string>(PATTERNS_JSON_PATH_KEY) ?? path.join(context.extensionPath, PATTERNS_JSON_FILE);

    try {
      if (!(await vscode.workspace.fs.stat(vscode.Uri.file(jsonFilePath)).then(() => true, () => false))) {
        await vscode.workspace.fs.writeFile(vscode.Uri.file(jsonFilePath), Buffer.from(JSON.stringify(defaultPatterns, null, 2), 'utf8'));
        await config.update(PATTERNS_JSON_PATH_KEY, jsonFilePath, vscode.ConfigurationTarget.Global);
      }

      const data = await vscode.workspace.fs.readFile(vscode.Uri.file(jsonFilePath));
      return JSON.parse(Buffer.from(data).toString('utf8'));
    } catch (error) {
      vscode.window.showErrorMessage(`Error accessing JSON file at ${jsonFilePath}: ${(error as Error).message}`);
      throw error;
    }
  }
}

class PatternCodeLensProvider implements vscode.CodeLensProvider {
  private readonly onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;
  private patterns: IPattern[];

  constructor() {
    this.patterns = [];
  }

  public setPatterns(patterns: IPattern[]): void {
    this.patterns = patterns;
    this.onDidChangeCodeLensesEmitter.fire();
  }

  public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const text = document.getText();
    return this.patterns.flatMap(({ pattern, description }) => {
      const regex = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
      const codeLenses: vscode.CodeLens[] = [];
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text))) {
        const range = new vscode.Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length));
        codeLenses.push(new vscode.CodeLens(range, { title: description, command: '', arguments: [], tooltip: `Matched pattern: ${pattern}` }));
      }
      regex.lastIndex = 0; // Reset regex index for the next match
      return codeLenses;
    });
  }
}

class DecorationService {
  public static updateDecorations(editor: vscode.TextEditor, patterns: IPattern[], decorationType: vscode.TextEditorDecorationType): void {
    const text = editor.document.getText();
    const decorationOptions = patterns.flatMap(({ pattern, description }) => {
      const regex = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
      const matches: vscode.DecorationOptions[] = [];
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text))) {
        const range = new vscode.Range(editor.document.positionAt(match.index), editor.document.positionAt(match.index + match[0].length));
        matches.push({ range, hoverMessage: description });
      }
      regex.lastIndex = 0; // Reset regex index for the next match
      return matches;
    });

    editor.setDecorations(decorationType, decorationOptions);
  }
}

export const activate = async (context: vscode.ExtensionContext): Promise<void> => {
  const config = vscode.workspace.getConfiguration(CONFIG_KEY);

  let highlightColor = config.get<string>(HIGHLIGHT_COLOR_KEY) ?? DEFAULT_HIGHLIGHT_COLOR;
  let highlightTextColor = config.get<string>(HIGHLIGHT_TEXT_COLOR_KEY) ?? DEFAULT_HIGHLIGHT_TEXT_COLOR;

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
    }
  });

  vscode.workspace.onDidChangeConfiguration(async event => {
    if (event.affectsConfiguration(CONFIG_KEY)) {
      const config = vscode.workspace.getConfiguration(CONFIG_KEY);
      highlightColor = config.get<string>(HIGHLIGHT_COLOR_KEY) ?? DEFAULT_HIGHLIGHT_COLOR;
      highlightTextColor = config.get<string>(HIGHLIGHT_TEXT_COLOR_KEY) ?? DEFAULT_HIGHLIGHT_TEXT_COLOR;
      decoration.dispose();
      decoration = createDecoration();

      await refreshJsonData();

      if (activeEditor) {
        DecorationService.updateDecorations(activeEditor, selectedPatterns, decoration);
      }
    }
  });

  context.subscriptions.push(highlightCommand);
  context.subscriptions.push(vscode.languages.registerCodeLensProvider({ scheme: 'file', language: '*' }, codeLensProvider));
};

export const deactivate = (): void => { };
