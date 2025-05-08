# Pattern Highlighter README

This extension will highlight found pattern in text and display description of found pattern as code lens.

## Features

- `AZ: Higlight Pattern`: To execute pattern matching run this command from pallete

## Extension Settings

This extension contributes the following settings:

* `patternHighlighter.patternsJsonPath`: Path to a json file that contains lists of patterns that should be matched, if the file is not available at the given path, a new json will be created in this path with some sample values, if left empty, file will be created in `{User}\Documents`.
* `patternHighlighter.highlightColor`: Specify the colour used to highlight patterns.
* `patternHighlighter.highlightTextColor`: Set text color used in highlighted patterns.
* `patternHighlighter.patternIsolationPrefix`: Set pattern used to isolate patterns during matching.
* `patternHighlighter.patternIsolationPostfix`: The pattern used to isolate patterns during matching.
