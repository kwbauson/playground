import React from 'react'
import { render } from 'react-dom'

const root = document.getElementById('root')!

function renderRoot() {
  const Root = require('./Root').default
  render(<Root />, root)
}

renderRoot()

if (module.hot) {
  module.hot.accept(renderRoot)
}
