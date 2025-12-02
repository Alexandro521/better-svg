import * as vscode from 'vscode'

export class SvgGutterPreview {
  private decorationTypes: Map<string, vscode.TextEditorDecorationType[]> = new Map()

  constructor () {}

  public updateDecorations (editor: vscode.TextEditor) {
    if (!editor) {
      return
    }

    const docUri = editor.document.uri.toString()
    
    // Dispose existing decorations for this document
    this.disposeDecorationsForUri(docUri)

    const text = editor.document.getText()
    const svgRegex = /<svg[\s\S]*?>[\s\S]*?<\/svg>/g
    const newDecorationTypes: vscode.TextEditorDecorationType[] = []

    let match
    while ((match = svgRegex.exec(text))) {
      const startPos = editor.document.positionAt(match.index)
      // Use a zero-length range at the start of the SVG to ensure only one gutter icon is shown
      const range = new vscode.Range(startPos, startPos)

      let svgContent = match[0]

      // Replace currentColor based on theme
      const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark || 
                          vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast

      const contrastColor = isDarkTheme ? '#ffffff' : '#000000'
      
      svgContent = svgContent.replace(/currentColor/g, contrastColor)

      // Add xmlns if missing
      if (!svgContent.includes('xmlns=')) {
        svgContent = svgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
      }

      // Encode SVG content for data URI
      const encodedSvg = encodeURIComponent(svgContent)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22')

      const dataUri = `data:image/svg+xml,${encodedSvg}`

      const decorationType = vscode.window.createTextEditorDecorationType({
        gutterIconPath: vscode.Uri.parse(dataUri),
        gutterIconSize: 'contain'
      })

      newDecorationTypes.push(decorationType)

      editor.setDecorations(decorationType, [{ range }])
    }

    this.decorationTypes.set(docUri, newDecorationTypes)
  }

  private disposeDecorationsForUri (uri: string) {
    const types = this.decorationTypes.get(uri)
    if (types) {
      types.forEach(t => t.dispose())
      this.decorationTypes.delete(uri)
    }
  }

  public dispose () {
    this.decorationTypes.forEach(types => types.forEach(t => t.dispose()))
    this.decorationTypes.clear()
  }
}
