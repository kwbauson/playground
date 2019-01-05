import React from 'react'
// import { App } from './edulytics'
// import { App } from './treed'
// import { App } from './json'
// import { App } from './tred'
// import { App } from './lang'
// import { App } from './dav'
// import { App } from './vst'
import { App } from './rst'
import { observer } from 'mobx-react'

@observer
class Root extends React.Component {
  render() {
    return <App />
  }
}

// export default hot(module)(Root)
export default Root
