import * as vscode from 'vscode';
import { IPatternSet } from '../config';

export class PatternCodeLensProvider implements vscode.CodeLensProvider {
  private readonly onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

  private patternSets: IPatternSet[] = [];
  private isPatternIsolationEnabled: boolean = false;
  private patternIsolationPrefix: string = '';
  private patternIsolationPostfix: string = '';

  public setPatternSets(
    patternSets: IPatternSet[],
    isPatternIsolationEnabled: boolean,
    patternIsolationPrefix: string,
    patternIsolationPostfix: string
  ): void {
    this.patternSets = patternSets;
    this.isPatternIsolationEnabled = isPatternIsolationEnabled;
    this.patternIsolationPrefix = patternIsolationPrefix;
    this.patternIsolationPostfix = patternIsolationPostfix;
    this.onDidChangeCodeLensesEmitter.fire();
  }

  public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const text = document.getText();
    const codeLenses: vscode.CodeLens[] = [];

    for (const { patternPrefix, patternPostfix, patterns } of this.patternSets) {
      for (const { pattern, description } of patterns) {
        const regexPattern = `${this.isPatternIsolationEnabled ? this.patternIsolationPrefix : ''}${patternPrefix}${pattern}${patternPostfix}${this.isPatternIsolationEnabled ? this.patternIsolationPostfix : ''}`;
        const regex = new RegExp(regexPattern, 'gi');
        let match: RegExpExecArray | null;

        while ((match = regex.exec(text))) {
          const range = new vscode.Range(
            document.positionAt(match.index),
            document.positionAt(match.index + match[0].length)
          );
          codeLenses.push(
            new vscode.CodeLens(range, {
              title: description,
              command: '',
              arguments: [],
              tooltip: `Matched pattern: ${regexPattern}`
            })
          );
        }
      }
    }

    return codeLenses;
  }
}