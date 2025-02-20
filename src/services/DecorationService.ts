import * as vscode from 'vscode';
import { IPattern } from '../config';

export class DecorationService {
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