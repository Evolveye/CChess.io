import ws from "./ws.js"
import { Pawn } from "./chessPieces.js"

class Player extends Pawn {
  constructor( { id, x, y, color, movingTimestamp } ) {
    super( x, y, color )

    this.id = id
    this.canMove = true
    this.movingTimestamp = movingTimestamp

    // this.control = {
    //   up: controling === `wsad`  ?  `w`  :  `up`,
    //   down: controling === `wsad`  ?  `s`  :  `down`,
    //   left: controling === `wsad`  ?  `a`  :  `left`,
    //   right: controling === `wsad`  ?  `d`  :  `right`,
    //   wantToMove: controling === `wsad`  ?  `wsad`  :  `arrow`,

    //   mapUp: controling === `wsad`  ?  `up`  :  `w`,
    //   mapDown: controling === `wsad`  ?  `down`  :  `s`,
    //   mapLeft: controling === `wsad`  ?  `left`  :  `a`,
    //   mapRight: controling === `wsad`  ?  `right`  :  `d`,
    // }
  }
}

export default class Game {
  constructor() {
    this.box = document.querySelector( `.game` )
    this.box.innerHTML = /* html */ `
      <canvas class="canvas-main"></canvas>
    `

    /** @type {HTMLCanvasElement} */
    this.canvas = this.box.querySelector( `.canvas-main` )
    this.ctx = this.canvas.getContext( `2d` )

    this.map = null
    this.chessmanSize = null
    this.camera = {
      spaceAroundgame: 100,
      x: null,
      y: null,
      mouse: {
        action: null,
        initialX: null,
        initialY: null
      }
    }
    this.changePosition = {
      from: { x:null, y:null },
      to: { x:null, y:null }
    }

    this.resize()
    
    ws.send( `game-init`, `chess-standard` )
    ws.on( `game-init`, ( { chessmanSize, player, map } ) => {
      const { width, height, tileSize } = map
      const c = this.camera

      console.log( player )

      this.chessmanSize = chessmanSize
      this.player = new Player( player )
      this.map = map
      let md = this.map.data

      for ( let y = 0;  y < height;  y++ )
        for ( let x = 0;  x < width;  x++ ) {
          if ( !map.data[ y ][ x ] )
            continue

          map.data[ y ][ x ] = new Pawn( x, y, map.data[ y ][ x ].color )
        }

      c.x = window.innerWidth / 2 - player.x * tileSize
      c.y = window.innerHeight / 2 - player.y * tileSize
  
      if ( c.y > c.spaceAroundgame )
        c.y = c.spaceAroundgame
      else if ( c.y < window.innerHeight - c.spaceAroundgame - height * tileSize )
        c.y = window.innerHeight - c.spaceAroundgame - height * tileSize
      if ( c.x > c.spaceAroundgame )
        c.x = c.spaceAroundgame
      else if ( c.x < window.innerWidth - c.spaceAroundgame - width * tileSize )
        c.x = window.innerWidth - c.spaceAroundgame - width * tileSize

      setInterval( () => {
        this.logic()
        requestAnimationFrame( () => this.draw() )
      }, 1000 / 60 )

      window.addEventListener( `resize`, () => this.resize() )
      document.addEventListener( `mouseup`, () => {
        let from = this.changePosition.from
        let to = this.changePosition.to

        if ( to.x !== null ) {
          if ( md[ from.y ][ from.x ].move( to.x, to.y ) ) {
            // md[ to.y ][ to.x ] = md[ from.y ][ from.x ]
            // md[ from.y ][ from.x ] = null

            ws.send( `game-player_update`, { from, to } )
          }
        }

        this.camera.mouse.action = null
        this.changePosition.from = { x:null, y:null }
        this.changePosition.to = { x:null, y:null }
      } )
      document.addEventListener( `mousedown`, e => {
        let c = this.camera

        c.mouse.initialX = e.clientX
        c.mouse.initialY = e.clientY

        let x = Math.floor( (e.clientX - c.x) / tileSize )
        let y = Math.floor( (e.clientY - c.y) / tileSize )

        if ( (md[ y ]  ||  [])[ x ] ) {
          c.mouse.action = `move-chessman`
          this.changePosition.from = { x, y }
        }
        else
          c.mouse.action = `move-camera`
      } )
      document.addEventListener( `mousemove`, e => {
        const c = this.camera

        if ( c.mouse.action == `move-camera` ) {
          let newX = e.clientX - c.mouse.initialX + c.x
          let newY = e.clientY - c.mouse.initialY + c.y

          if ( window.innerWidth - c.spaceAroundgame - width * tileSize < newX && newX < c.spaceAroundgame )
            c.x = newX
          if ( window.innerHeight - c.spaceAroundgame - height * tileSize < newY && newY < c.spaceAroundgame )
            c.y = newY
        }
        else if ( c.mouse.action == `move-chessman` ) {
          let x = Math.floor( (e.clientX - c.x) / tileSize )
          let y = Math.floor( (e.clientY - c.y) / tileSize )
          let entity = (md[ y ]  ||  [])[ x ]

          if ( x >= 0 && y >= 0 && x < width && y < height && (!entity || entity.color == player.color ) )
            this.changePosition.to = { x, y }
          else
            this.changePosition.to = { x:null, y:null }
        }

        c.mouse.initialX = e.clientX
        c.mouse.initialY = e.clientY
      } )
      ws.on( `game-update_positions`, jumpsfromTo => {
        for ( const { from, to } of jumpsfromTo ) {
          md[ to.y ][ to.x ] = md[ from.y ][ from.x ]
          md[ from.y ][ from.x ] = null
        }
      } )
    } )
  }

  logic() {
    const m = this.map
    const c = this.camera
    const p = this.player

    // if ( p.canMove && Game.key( p.control.wantToMove ) ) {
    //   if ( Game.key( p.control.left ) && p.x > 1 )
    //     p.x--
    //   else if ( Game.key( p.control.right ) && p.x < m.width )
    //     p.x++
    //   else if ( Game.key( p.control.up ) && p.y > 1 )
    //     p.y--
    //   else if ( Game.key( p.control.down ) && p.y < m.height )
    //     p.y++

    //   p.canMove = false
    //   setTimeout( () => p.canMove = true, p.movingTimestamp )
    // }

    let cameraJump = m.tileSize / 2

    if ( Game.key( `w` ) && c.y < c.spaceAroundgame )
      c.y += cameraJump
    if ( Game.key( `s` ) && c.y > window.innerHeight - c.spaceAroundgame - m.height * m.tileSize )
      c.y -= cameraJump
    if ( Game.key( `a` ) && c.x < c.spaceAroundgame )
      c.x += cameraJump
    if ( Game.key( `d` ) && c.x > window.innerWidth - c.spaceAroundgame - m.width * m.tileSize )
      c.x -= cameraJump

    // ws.send( `game-player_update`, {
    //   x: this.player.x,
    //   y: this.player.y
    // } )
  }

  draw() {
    const m = this.map
    const c = this.camera
    const ctx = this.ctx
    const tSize = m.tileSize

    ctx.clearRect( 0, 0, ctx.canvas.width, ctx.canvas.height )

    ctx.strokeStyle = `white`
    ctx.lineWidth = 1

    for ( let y = 0;  y < m.height;  y++ )
      for ( let x = 0;  x < m.width;  x++ ) {
        if ( (y + x) % 2 ) {
          ctx.fillStyle = `#333`
          ctx.fillRect( c.x + x * tSize, c.y + y * tSize, tSize, tSize )
        }

        const entity = m.data[ y ][ x ]

        if ( !entity )
          continue

        let eX = c.x + (x + .5) * tSize - this.chessmanSize / 2
        let eY = c.y + (y + .5) * tSize - this.chessmanSize / 2

        ctx.drawImage( entity.tex, eX, eY, this.chessmanSize, this.chessmanSize )

        // ctx.beginPath()
        // ctx.arc( eX, eY, 15, 0, Math.PI * 2 )
        // ctx.fillStyle = `#000`
        // ctx.fill()
    
        // if ( entity.id === this.player.id )
        //   ctx.stroke()
      
        // ctx.moveTo( eX, eY )
        // ctx.beginPath()
        // ctx.arc( eX, eY, 5, 0, Math.PI * 2 )
        // ctx.fillStyle = `${entity.color}`
        // ctx.fill()
      }
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight

    this.ctx.imageSmoothingEnabled = false
  }

  static key( key ) {
    const k = Game.keys

    if ( typeof key === `string`)
      switch ( key ) {
        case `left`: return k[ 37 ]
        case `right`: return k[ 39 ]
        case `up`: return k[ 38 ]
        case `down`: return k[ 40 ]
        case `arrow`: return k[ 37 ]  ||  k[ 38 ]  ||  k[ 39 ]  ||  k[ 40 ]

        case `w`: return k[ 87 ]
        case `s`: return k[ 83 ]
        case `a`: return k[ 65 ]
        case `d`: return k[ 68 ]
        case `wsad`: case `WSAD`: return k[ 87 ]  ||  k[ 83 ]  ||  k[ 65 ]  ||  k[ 68 ]
      }

    return k[ key ]
  }
}
Game.keys = []


document.addEventListener( `keydown`, e => Game.keys[ e.keyCode ] = true )
document.addEventListener( `keyup`, e => Game.keys[ e.keyCode ] = false )