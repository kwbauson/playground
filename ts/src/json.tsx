import React from 'react'
import { observable, action } from 'mobx'
import { observer } from 'mobx-react'

const initial = observable(require('./data.json'))

export const App = () => <ValueView value={initial} $ref={''} root={initial} />

const ValueView: React.ComponentType<{
  value: any
  root: any
  $ref: string
}> = ({ value, root, $ref }) => {
  switch (typeof value) {
    case 'boolean':
      return <code>{value.toString()}</code>
    case 'function':
      return <code>{value.toString()}</code>
    case 'number':
      return <code>{value}</code>
    case 'object':
      return <ObjectView {...{ value, root, $ref }} />
    case 'string':
      return <code>{JSON.stringify(value)}</code>
    case 'symbol':
      return <code>{value.toString()}</code>
    case 'undefined':
      return <code>undefined</code>
    default:
      return <code>error: unhandled type</code>
  }
}

@observer
class ObjectView extends React.Component<{
  value: any
  root: any
  $ref: string
}> {
  @observable
  open = false
  @observable
  key = Array.isArray(this.props.value) ? '-' : ''

  render() {
    const { value } = this.props
    if (value === null) {
      return <code>null</code>
    }
    const keys = Object.keys(value)
    const isArray = Array.isArray(value)
    const opening = isArray ? '[' : '{'
    const closing = isArray ? ']' : '}'
    return (
      <code>
        {opening}
        <input size={5} onChange={this.handleKeyChange} value={this.key} />
        <button disabled={this.key === ''} onClick={this.handleAdd}>
          +
        </button>
        {keys.length > 0 && (
          <>
            <button onClick={this.toggle}>&hellip;</button>
            {this.open &&
              keys.map((key, i) => {
                const $ref = `${this.props.$ref}/${key}`
                return (
                  <div key={key} style={{ paddingLeft: 14 }}>
                    <code>
                      <span title={$ref}>
                        {isArray ? i : JSON.stringify(key)}
                      </span>
                      :
                      <ValueView
                        value={value[key]}
                        $ref={$ref}
                        root={this.props.root}
                      />
                      {i < keys.length - 1 && ','}
                      <button onClick={this.removeHandler(key)}>remove</button>
                    </code>
                  </div>
                )
              })}
          </>
        )}
        {closing}
      </code>
    )
  }

  @action
  toggle = () => {
    this.open = !this.open
  }

  removeHandler = (key: string) => () => this.remove(key)

  remove(key: string) {
    const { value } = this.props
    if (Array.isArray(value)) {
      const index = parseInt(key)
      value.splice(index, 1)
    } else {
      delete value[key]
    }
  }

  handleAdd = () => {
    const { value } = this.props
    console.log(value, this.key)
    if (Array.isArray(value)) {
      if (this.key === '-') {
        value.push(null)
      } else {
        const index = parseInt(this.key)
        value.splice(index, 0, null)
      }
    } else {
      value[this.key] = null
    }
  }

  handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.key = e.currentTarget.value
  }
}
