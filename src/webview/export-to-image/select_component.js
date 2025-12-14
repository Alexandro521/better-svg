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

const HIDDEN_CLASS = 'hidden'
const VALUE_NAME = 'value'

export function injectSelectComponent (selectElement, handler = undefined) {
  if (!selectElement) return

  const $ = (id) => selectElement.querySelector(id)

  const selectedValue = $('.current-value')
  const carretUpSvg = $('.icon-tabler-caret-up') ?? undefined
  const carretDownSvg = $('.icon-tabler-caret-down') ?? undefined
  const optionsContainer = $('.options')

  if (!optionsContainer) return
  const options = optionsContainer.querySelectorAll('span.option')
  if (!options) return

  selectElement.addEventListener('click', () => {
    optionsContainer.classList.toggle(HIDDEN_CLASS)

    if (carretDownSvg && carretDownSvg) {
      carretUpSvg.classList.toggle(HIDDEN_CLASS)
      carretDownSvg.classList.toggle(HIDDEN_CLASS)
    }
  })

  options.forEach((option) => {
    const optionValue = option.getAttribute(VALUE_NAME)

    option.addEventListener('click', (e) => {
      selectedValue.textContent = option.textContent
      selectedValue.setAttribute(VALUE_NAME, optionValue)
      if (typeof handler === 'function') {
        handler(option, optionValue)
      }
    })
  })
}
