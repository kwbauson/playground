import React, { useState, useEffect } from 'react'
import { render, useInput, useApp, Box } from 'ink'
import { spawn } from 'child_process'
import { useAsync } from 'react-async-hook'

async function nixEval(expr: string, ...options: string[]): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const nix = spawn('nix', ['eval', ...options, `(${expr})`])
    let output = ''
    let error = ''
    nix.stdout.on('data', data => {
      output += data
    })
    nix.stderr.on('data', data => {
      error += data
    })
    nix.on('error', err => {
      throw err
    })
    nix.on('close', code => {
      if (error || code) {
        reject(error || code)
      } else {
        resolve(output)
      }
    })
  })
}

async function nixJson<T>(expr: string): Promise<T> {
  return JSON.parse(await nixEval(`builtins.toJSON (${expr})`, '--raw'))
}

async function nixAttrNames(expr: string): Promise<string[]> {
  return await nixJson(`builtins.attrNames (${expr})`)
}

type AttrNamesProps = {
  expr: string
  focused?: boolean
  height?: number
}

function AttrNames({ expr, height = 10 }: AttrNamesProps) {
  const { loading, result } = useAsync(nixAttrNames, [expr])
  const [offset] = useState(0)
  const items = result ? result.slice(offset, offset + height) : []
  return (
    <>
      {loading && <Box>Loading...</Box>}
      {items.map((name, i) => (
        <Box key={i}>{name}</Box>
      ))}
    </>
  )
}

function Counter() {
  const output = useAsync(nixAttrNames, ['import <nixpkgs> {}'])
  const [count, setCount] = useState(0)
  const { exit } = useApp()
  useInput(input => {
    if (input == 'q') {
      exit()
    } else if (input == 'a') {
      setCount(count + 1)
    }
  })
  return (
    <div>
      <Box>{count}</Box>
      {output.loading && <Box>Loading...</Box>}
      {output.result &&
        output.result.slice(0, 10).map((name, i) => <Box key={i}>{name}</Box>)}
    </div>
  )
}

render(<Counter />, { experimental: true })
