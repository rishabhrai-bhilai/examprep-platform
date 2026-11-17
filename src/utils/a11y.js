// Lets a clickable non-button element (a card or row) be used from the keyboard:
// spread onto the element alongside its onClick.
const activateOnKey = (e) => {
  if (e.target !== e.currentTarget) return // a nested button or input handles its own keys
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    e.currentTarget.click()
  }
}

export const clickableProps = { role: 'button', tabIndex: 0, onKeyDown: activateOnKey }
