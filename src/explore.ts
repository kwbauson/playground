import b from 'blessed'

const screen = b.screen({ smartCSR: true })

const box = b.box({
  top: 'center',
  left: 'center',
  content: 'hello world',
})

screen.append(box)

screen.key('q', () => process.exit())

screen.render()
