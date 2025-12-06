/**
 * Copyright 2025 Miguel Ángel Durán
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as vscode from 'vscode'
import fs from 'fs'

export function getHtmlForExportToImage (
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  svgContent: string
) {
  try {
    // Get URIs for webview resources
    const exportScriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        extensionUri,
        'src',
        'webview',
        'export-to-image',
        'export.js'
      )
    )
    const moduleScriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        extensionUri,
        'src',
        'webview',
        'export-to-image',
        'select_component.js'
      )
    )

    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        extensionUri,
        'src',
        'webview',
        'export-to-image',
        'styles.css'
      )
    )

    const faviconUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        extensionUri,
        'static',
        'favicon.ico'
      )
    )

    const iconUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        extensionUri,
        'static',
        'better-svg.webp'
      )
    )
    // Read HTML template
    const htmlUri = vscode.Uri.joinPath(
      extensionUri,
      'src',
      'webview',
      'export-to-image',
      'export-view.html'
    )
    const htmlPath = htmlUri.fsPath

    if (!htmlPath) {
      vscode.window.showErrorMessage(
        `Better SVG: export_view.html htmlPath is undefined! URI: ${htmlUri.toString()}`
      )
      throw new Error('export_view.html htmlPath is undefined')
    }

    let html: string

    try {
      html = fs.readFileSync(htmlPath, 'utf8')
    } catch (readError: any) {
      vscode.window.showErrorMessage(
        'Better SVG: Failed to read export_view.html file!\n' +
          `Path: ${htmlPath}\n` +
          `Error: ${readError.message}`
      )
      throw readError
    }

    // Replace placeholders
    html = html
      .replace(/{{favicon}}/g, faviconUri.toString())
      .replace(/{{iconUri}}/g, iconUri.toString())
      .replace(/{{stylesUri}}/g, stylesUri.toString())
      .replace(/{{moduleScriptUri}}/g, moduleScriptUri.toString())
      .replace(/{{exportScriptUri}}/g, exportScriptUri.toString())
      .replace(/{{svgContent}}/g, () => svgContent)

    return html
  } catch (error: any) {
    vscode.window.showErrorMessage(
      'Better SVG: Error in getHtmlForWebview!\n' +
        `Message: ${error.message}\n` +
        `Stack: ${error.stack?.substring(0, 200)}`
    )
    throw error
  }
}
