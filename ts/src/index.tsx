import React from 'react'
import { render } from 'react-dom'
import 'babel-polyfill'

// import { App } from './lang'
// import { App } from './rst'
// import { App } from './treed'
import { App } from './vtree-test'

const root = document.getElementById('root')!

render(<App />, root)
