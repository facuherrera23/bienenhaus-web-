const ts = require('typescript');
const fs = require('fs');
const file = process.argv[2];
const content = fs.readFileSync(file, 'utf8');

const sourceFile = ts.createSourceFile(
  file,
  content,
  ts.ScriptTarget.Latest,
  true,
  file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JS
);

// Get all diagnostics
const program = ts.createProgram([file], {
  target: ts.ScriptTarget.Latest,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  allowJs: true,
  noEmit: true,
  jsx: file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.JsxEmit.Preserve : ts.JsxEmit.None,
}, {
  getSourceFile: (f, lang) => f === file ? sourceFile : undefined,
  writeFile: () => {},
  getDefaultLibFileName: () => 'lib.d.ts',
  useDirectoryForLibFileParsing: false,
});

const diags = ts.getPreEmitDiagnostics(program).filter(d => d.file && d.file.fileName === file);
diags.forEach(d => {
  const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
  const pos = d.file.getLineAndCharacterOfPosition(d.start || 0);
  console.log(`Line ${pos.line + 1}, Col ${pos.character + 1}: ${msg}`);
});
if (diags.length === 0) console.log('No syntax errors');