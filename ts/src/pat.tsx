import React from 'react'

function render(x: any): JSX.Element {
  if (React.isValidElement(x)) {
    return x
  } else {
    return <></>
  }
}
