import React from 'react'
import { hot } from 'react-hot-loader'
import { App } from './edulytics'
import { observer } from 'mobx-react'

@observer
class Root extends React.Component {
  render() {
    return <App />
  }
}

export default hot(module)(Root)
