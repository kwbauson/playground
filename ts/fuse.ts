import { fusebox } from 'fuse-box'

const fuse = fusebox({
  entry: 'src/test.ts',
  devServer: true,
  webIndex: true,
  cache: false,
})

fuse.runDev()