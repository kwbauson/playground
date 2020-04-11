import { hot } from 'react-hot-loader'
import * as AppModule from './lang'
export const App = hot(module)(AppModule.App)
Object.assign(window, AppModule)
