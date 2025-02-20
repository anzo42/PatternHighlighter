import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { CONFIG, defaultPatterns, IJsonData } from '../config';
import { FileService } from './FileService';

export class PatternService {
  static async readOrCreatePatternsFile(context: vscode.ExtensionContext): Promise<IJsonData> {
    const config = vscode.workspace.getConfiguration(CONFIG.VS_SETTINGS_KEY);
    let jsonFilePath = config.get<string>(CONFIG.PATTERNS_JSON_PATH_KEY);

    if (!jsonFilePath) {
      jsonFilePath = this.getDefaultJsonFilePath();
      await config.update(CONFIG.PATTERNS_JSON_PATH_KEY, jsonFilePath, vscode.ConfigurationTarget.Global);
    }

    try {
      if (!(await FileService.fileExists(jsonFilePath))) {
        await FileService.writeFile(jsonFilePath, JSON.stringify(defaultPatterns, null, 2));
      }

      const data = await FileService.readFile(jsonFilePath);
      return JSON.parse(data);
    } catch (error) {
      vscode.window.showErrorMessage(`Error accessing/reading or parsing JSON file at ${jsonFilePath}: ${(error as Error).message}`);
      throw error;
    }
  }

  private static getDefaultJsonFilePath(): string {
    const documentsPath = path.join(os.homedir(), 'Documents');
    return path.join(documentsPath, CONFIG.PATTERNS_JSON_FILE);
  }
}