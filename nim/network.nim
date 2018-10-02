#!/usr/bin/env runnim

import json, strformat, random

type
  Network = ref object
    nodes: seq[Node]

  Node = ref object
    value: float
    connections: seq[Connection]

  Connection = ref object
    index: int
    weight: float

proc newNetwork(): Network =
  result.new
  result.nodes = @[]

proc newNode(): Node =
  result.new
  result.value = 0
  result.connections = @[]

proc newConnection(index: int, weight: float = 0): Connection =
  result.new
  result.index = index

proc dump(net: Network, filename: string) =
  writeFile(filename, $ %*(net))

proc load(filename: string): Network =
  result = to(parseJson(readFile(filename)), Network)

proc add(net: Network, count = 1) =
  for _ in 0..<count:
    net.nodes.add(newNode())

proc connect(net: Network) =
  for node in net.nodes:
    for i in node.connections.len..net.nodes.high:
      node.connections.add(newConnection(i))

proc randomize(net: Network) =
  for node in net.nodes:
    node.value = rand(1.0)
    for con in node.connections:
      con.weight = rand(1.0)

proc values(net: Network): seq[float] =
  result = @[]
  for node in net.nodes:
    result.add(node.value)

proc predict(net: Network): seq[float] =
  result = @[]
  for node in net.nodes:
    var value = 0.0
    for con in node.connections:
      value += net.nodes[con.index].value * con.weight
    result.add(value)

proc train(net: Network) =
  let predicted = net.predict
  for node in net.nodes:
    for con in node.connections:
      let delta = net.nodes[con.index].value - predicted[con.index]
      con.weight += delta * 0.3

proc error(net: Network): float =
  result = 0.0
  let
    values = net.values
    predicted = net.predict
  for i in 0..values.high:
    result += abs(predicted[i] - values[i])

proc `$`(net: Network): string =
  result = ""
  for idx, node in net.nodes:
    result &= &"{node.value:5.2f}:"
    for con in node.connections:
      result &= &" {con.weight:5.2f}"
    if idx != net.nodes.high:
      result &= "\n"



const filename = "network.json"
randomize()

let
  # n = load(filename)
  n = newNetwork()

n.add(4)
n.connect()
n.randomize()
echo n
for i in 0..<10:
  n.train
  echo &"{i}: {n.error}"
echo n

n.dump(filename)
