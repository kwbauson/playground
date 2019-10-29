import { mount } from './mag'
import { App, initialState } from './mag-app'

const root = document.getElementById('app')!
while (root.firstChild) root.firstChild.remove()
root.appendChild(document.createTextNode(''))
App.run(mount, initialState, () => root.firstChild!)

module.hot && module.hot.accept()
