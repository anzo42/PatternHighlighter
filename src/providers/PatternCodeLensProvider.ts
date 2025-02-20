import * as vscode from 'vscode';
import { IPattern } from '../config';

export class PatternCodeLensProvider implements vscode.CodeLensProvider {
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