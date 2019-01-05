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
;(App as React.ComponentType<{}>).displayName = 'App'

const root = document.getElementById('root')!

render(<App />, root)
