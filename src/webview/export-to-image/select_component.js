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
