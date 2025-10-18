import * as vscode from 'vscode'
import { SvgEditorProvider } from './svgEditorProvider'
import { optimize } from 'svgo'

export function activate (context: vscode.ExtensionContext) {
  // Register custom editor provider
  context.subscriptions.push(
    SvgEditorProvider.register(context)
  )

  // Register optimize command
  context.subscriptions.push(
    vscode.commands.registerCommand('betterSvg.optimize', async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        vscode.window.showErrorMessage('No active editor')
        return
      }

      const document = editor.document
      if (!document.fileName.endsWith('.svg')) {
        vscode.window.showErrorMessage('Not an SVG file')
        return
      }

      const svgContent = document.getText()

      try {
        const result = optimize(svgContent, {
          multipass: true,
          plugins: [
            'preset-default',
            'removeDoctype',
            'removeComments',
            'removeViewBox'
          ]
        })

        const edit = new vscode.WorkspaceEdit()
        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(svgContent.length)
        )
        edit.replace(document.uri, fullRange, result.data)

        await vscode.workspace.applyEdit(edit)
        vscode.window.showInformationMessage('SVG optimized successfully!')
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to optimize SVG: ${error}`)
      }
    })
  )
}

export function deactivate () {}
