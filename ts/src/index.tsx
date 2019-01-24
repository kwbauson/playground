import React from 'react'
import { render } from 'react-dom'
import { hot } from 'react-hot-loader'
import 'babel-polyfill'
import { App } from './vtree-test'

const Hot = hot(module)(App)
const renderApp = () => render(<Hot />, document.getElementById('root'))
renderApp()
module.hot && module.hot.accept(renderApp)
