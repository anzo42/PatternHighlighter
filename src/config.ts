export const CONFIG = {
  VS_SETTINGS_KEY: 'patternHighlighter',
  PATTERNS_JSON_FILE: 'patterns.json',
  DEFAULT_HIGHLIGHT_COLOR: 'rgba(0, 0, 255, 1)',
  DEFAULT_HIGHLIGHT_TEXT_COLOR: 'rgba(255, 255, 255, 0.7)',
  PATTERNS_JSON_PATH_KEY: 'patternsJsonPath',
  HIGHLIGHT_COLOR_KEY: 'highlightColor',
  HIGHLIGHT_TEXT_COLOR_KEY: 'highlightTextColor'
};

export const defaultPatterns: IJsonData = {
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

export interface IPattern {
  pattern: string | RegExp;
  description: string;
}

export interface IPatternSet {
  name: string;
  patterns: IPattern[];
}

export interface IJsonData {
  sets: IPatternSet[];
}