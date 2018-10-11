#!/usr/bin/env runnim

import json, strformat, random

type
  Network = ref object
    values: seq[float]
    nodes: seq[seq[float]]

proc newNetwork(size: Natural = 0): Network =
  result.new
  result.values.newSeq(size)
  result.nodes.newSeq(size)
  for node in result.nodes.mitems:
    node.newSeq(size)

proc dump(net: Network, filename: string) =
  writeFile(filename, $ %*(net))

proc load(filename: string): Network =
  result = to(parseJson(readFile(filename)), Network)

proc add(net: Network, count = 1) =
  discard
  # for _ in 0..<count:
  #   net.values.add(0.0)

proc randomize(net: Network) =
  for idx, node in net.nodes.mpairs:
    net.values[idx] = rand(1.0)
    for weight in node.mitems:
      weight = rand(1.0)

proc predict(net: Network): seq[float] =
  result = @[]
  for node in net.nodes:
    var value = 0.0
    for idx, weight in node:
      value += net.values[idx] * weight
    result.add(value)

proc train(net: Network) =
  let predicted = net.predict
  for node in net.nodes.mitems:
    for idx, weight in node.mpairs:
      let delta = net.values[idx] - predicted[idx]
      weight += delta * 0.3

proc error(net: Network): float =
  result = 0.0
  let
    values = net.values
    predicted = net.predict
  for i in 0..values.high:
    result += abs(predicted[i] - values[i])

proc `$`(net: Network): string =
  result = ""
  for idx, value in net.values:
    result &= &"{value:5.2f}:"
    for weight in net.nodes[idx]:
      result &= &" {weight:5.2f}"
    if idx != net.values.high:
      result &= "\n"



const filename = "network.json"
randomize()

let
  # n = load(filename)
  n = newNetwork()

n.add(4)
n.randomize()
echo n
for i in 0..<10:
  n.train
  echo &"{i}: {n.error}"
echo n

n.dump(filename)
