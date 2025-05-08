import * as vscode from 'vscode';
import { IPatternSet } from '../config';

export class DecorationService {
  public static updateDecorations(
    editor: vscode.TextEditor,
    patternSets: IPatternSet[],
    decorationType: vscode.TextEditorDecorationType,
    patternIsolationPrefix: string,
    patternIsolationPostfix: string
  ): void {
    const text = editor.document.getText();
    const decorationOptions = patternSets.flatMap(({ patternPrefix, patternPostfix, patterns }) =>
      patterns.flatMap(({ pattern, description }) => {
        const regexPattern = `${patternIsolationPrefix}${patternPrefix}${pattern}${patternPostfix}${patternIsolationPostfix}`;
        const regex = new RegExp(regexPattern, 'gi');
        const matches: vscode.DecorationOptions[] = [];
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text))) {
          const range = new vscode.Range(
            editor.document.positionAt(match.index),
            editor.document.positionAt(match.index + match[0].length)
          );
          matches.push({ range, hoverMessage: description });
        }
        regex.lastIndex = 0; // Reset regex index for the next match
        return matches;
      })
    );

    editor.setDecorations(decorationType, decorationOptions);
  }
}