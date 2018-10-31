#!/usr/bin/env runnim

import json, strformat, random, sequtils, math, sugar, strutils, pegs, os

type
  Network = ref object
    values: seq[float]
    nodes: seq[seq[float]]

func newNetwork(size: Natural = 0): Network =
  Network(
    values: repeat(0.0, size),
    nodes: repeat(0.0, size).repeat(size),
  )

proc dump(net: Network, filename: string) =
  writeFile(filename, $ %*(net))

proc load(filename: string): Network =
  readFile(filename).parseJson().to(Network)

proc add(net: Network, count = 1) =
  net.values.add(repeat(0.0, count))
  for weights in net.nodes.mitems:
    weights.add(repeat(0.0, count))
  for _ in 0..<count:
    net.nodes.add(repeat(0.0, net.values.len))

proc randomize(net: Network) =
  for value in net.values.mitems:
    value = rand(1.0)
  for node in net.nodes.mitems:
    for weight in node.mitems:
      weight = rand(1.0)

func predict(net: Network): seq[float] =
  zip(net.values, net.nodes).map(p => p.b.map(w => w * p.a).sum())
  # net.values.zip(net.nodes.map(ws => ws.sum)).map(p => p.a + p.b)

func error(net: Network): float =
  net.values.zip(net.predict).map(p => abs(p.a - p.b)).sum()

proc train(net: Network, count = 1) =
  for _ in 0..<count:
    let
      node = rand(0..net.values.high)
      weight = rand(0..net.values.high)
      old = net.nodes[node][weight]
      oldError = net.error
    net.nodes[node][weight] += rand(2.0) - 1
    if net.error >= oldError:
      net.nodes[node][weight] = old

func `$`(net: Network): string =
  zip(net.values, net.nodes)
    .map(p => &"{p.a:5.2f}: " & p.b.map(w => &"{w:5.2f}").join(" "))
    .join("\n")

proc main(params: openArray[string]) =
  let
    cmd = if params.len > 0: params[0] else: ""
    arg = if params.len > 1: parseInt(params[1]) else: 0
  
  const filename = "network.json"
  randomize()

  var net = load(filename)

  case cmd
  of "new":
    net = newNetwork(arg)
  of "add":
    net.add(arg)
  of "train":
    net.train(arg)
  of "randomize":
    net.randomize()

  echo "values:  ", net.values.map(x => &"{x:5.2f}").join(" ")
  echo "predict: ", net.predict.map(x => &"{x:5.2f}").join(" ")
  echo "error: ", net.error

  net.dump(filename)

# main(commandLineParams())
main(commandLineParams())