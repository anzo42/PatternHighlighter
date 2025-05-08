import * as vscode from 'vscode';
import { IPatternSet } from '../config';

export class PatternCodeLensProvider implements vscode.CodeLensProvider {
  private readonly onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;
  private patternSets: IPatternSet[];

  constructor() {
    this.patternSets = [];
  }

  public setPatternSets(patternSets: IPatternSet[]): void {
    this.patternSets = patternSets;
    this.onDidChangeCodeLensesEmitter.fire();
  }

  public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const text = document.getText();
    return this.patternSets.flatMap(({ patternPrefix, patternPostfix, patterns }) =>
      patterns.flatMap(({ pattern, description }) => {
        const regexPattern = `${patternPrefix}${pattern}${patternPostfix}`;
        const regex = new RegExp(regexPattern, 'g');
        const codeLenses: vscode.CodeLens[] = [];
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
              tooltip: `Matched pattern: ${regexPattern}`,
            })
          );
        }
        regex.lastIndex = 0; // Reset regex index for the next match
        return codeLenses;
      })
    );
  }
}