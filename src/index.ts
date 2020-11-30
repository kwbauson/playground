import React from 'react'
import { render } from 'react-dom'
import { Game } from './acquire'

let root = document.getElementById('root')
if (!root) {
  root = document.createElement('div')
  root.id = 'root'
  document.body.appendChild(root)
}
render(React.createElement(Game), root)

if (module.hot) module.hot.accept()
