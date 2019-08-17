import React from 'react'

class World {
  units: (Unit | null)[][]

  constructor(
    public width: number,
    public height: number,
    public numUnits: number,
  ) {
    this.units = []
  }
}

class Unit {
  constructor(public world: World) {}
}

declare const child: React.ReactNode
