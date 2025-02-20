import * as vscode from 'vscode';

export class FileService {
  static async readFile(filePath: string): Promise<string> {
    const data = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
    return Buffer.from(data).toString('utf8');
  }

  static async writeFile(filePath: string, content: string): Promise<void> {
    await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(content, 'utf8'));
  }

  static async fileExists(filePath: string): Promise<boolean> {
    return vscode.workspace.fs.stat(vscode.Uri.file(filePath)).then(() => true, () => false);
  }
}