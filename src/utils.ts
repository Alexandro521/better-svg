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

/**
 * Formats bytes into a readable string (bytes or KB)
 */
export function formatBytes (bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`
  return `${(bytes / 1024).toFixed(2)} KB`
}

/**
 * Calculates savings between original and optimized content
 */
export function calculateSavings (originalContent: string, optimizedContent: string) {
  const originalSize = Buffer.byteLength(originalContent, 'utf8')
  const optimizedSize = Buffer.byteLength(optimizedContent, 'utf8')
  const savingPercent = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2)

  return {
    originalSize,
    optimizedSize,
    savingPercent,
    originalSizeFormatted: formatBytes(originalSize),
    optimizedSizeFormatted: formatBytes(optimizedSize)
  }
}
