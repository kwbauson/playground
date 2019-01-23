import React from 'react'
import { render } from 'react-dom'
import 'babel-polyfill'

// import { App } from './edulytics'
// import { App } from './treed'
// import { App } from './json'
// import { App } from './tred'
// import { App } from './lang'
// import { App } from './dav'
// import { App } from './vst'
import { App } from './rst'
Object.assign(App, { displayName: 'App ' })

import * as mod from './met'

Object.assign(window, mod)

const root = document.getElementById('root')!

render(<App />, root)
