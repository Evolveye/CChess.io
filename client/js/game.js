import ws from "./ws.js"
import Chessboard, { setTexture } from "/$/classes"
// import Chessboard from "../../js/classes.mjs"


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
    ws.on( `game-init`, ( { chessmanSize, player, chessboard } ) => {
      const { width, height, tileSize, fields } = chessboard
      const c = this.camera

      this.chessmanSize = chessmanSize
      this.chessboard = new Chessboard( width, height, tileSize, fields, true )

      this.player = this.chessboard.get( player.x, player.y )

      player = this.player
      chessboard = this.chessboard

      c.x = window.innerWidth / 2 - (player.x + .5) * tileSize
      c.y = window.innerHeight / 2 - (player.y + .5) * tileSize

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
      requestAnimationFrame( () => this.draw() )

      window.addEventListener( `resize`, () => this.resize() )
      document.addEventListener( `mouseup`, () => {
        const { from, to } = this.changePosition

        if ( chessboard.checkJump( from, to ) )
          ws.send( `game-update-player`, { from, to } )

        this.camera.mouse.action = null
        this.changePosition.from = { x:null, y:null }
        this.changePosition.to = { x:null, y:null }
      } )
      document.addEventListener( `mousedown`, e => {
        const c = this.camera

        c.mouse.initialX = e.clientX
        c.mouse.initialY = e.clientY

        let x = Math.floor( (e.clientX - c.x) / tileSize )
        let y = Math.floor( (e.clientY - c.y) / tileSize )

        let field = chessboard.get( x, y )

        if ( field ) {
          if ( `${field.color}` == `${player.color}` ) {
            c.mouse.action = `move-chessman`
            this.changePosition.from = { x, y }
          }
        }
        else
          c.mouse.action = `move-camera`
      } )
      document.addEventListener( `mousemove`, e => {
        const c = this.camera
        const x = Math.floor( (e.clientX - c.x) / tileSize )
        const y = Math.floor( (e.clientY - c.y) / tileSize )
        const entity = chessboard.get( x, y ) || {}

        if ( `${entity.color}` == `${player.color}` )
          this.box.style.cursor = `pointer`
        else
          this.box.style.cursor = `default`

        if ( c.mouse.action == `move-camera` ) {
          let newX = e.clientX - c.mouse.initialX + c.x
          let newY = e.clientY - c.mouse.initialY + c.y

          if ( window.innerWidth - c.spaceAroundgame - width * tileSize < newX && newX < c.spaceAroundgame )
            c.x = newX
          if ( window.innerHeight - c.spaceAroundgame - height * tileSize < newY && newY < c.spaceAroundgame )
            c.y = newY
        }
        else if ( c.mouse.action == `move-chessman` ) {
          if ( x >= 0 && y >= 0 && x < width && y < height && (!entity || `${entity.color}` != `${player.color}` ) )
            this.changePosition.to = { x, y }
          else
            this.changePosition.to = { x:null, y:null }
        }

        c.mouse.initialX = e.clientX
        c.mouse.initialY = e.clientY
      } )
      ws.on( `game-update-spawn`, chessman => chessboard.set( chessman, true ) )
      ws.on( `game-update-despawn`, ( { x, y } ) => chessboard.remove( x, y ) )
      ws.on( `game-update-jumps`, jumps => jumps.forEach( ( { from, to } ) =>
        chessboard.move( from, to ) === player.id  ?  this.end()  :  null
      ) )
    } )
  }

  logic() {
    const cb = this.chessboard
    const c = this.camera
    const p = this.player

    let cameraJump = cb.tileSize / 2

    if ( Game.key( `w` ) && c.y < c.spaceAroundgame )
      c.y += cameraJump
    if ( Game.key( `s` ) && c.y > window.innerHeight - c.spaceAroundgame - cb.height * cb.tileSize )
      c.y -= cameraJump
    if ( Game.key( `a` ) && c.x < c.spaceAroundgame )
      c.x += cameraJump
    if ( Game.key( `d` ) && c.x > window.innerWidth - c.spaceAroundgame - cb.width * cb.tileSize )
      c.x -= cameraJump
  }

  draw() {
    const cb = this.chessboard
    const c = this.camera
    const ctx = this.ctx
    const tSize = cb.tileSize
    const { from } = this.changePosition

    ctx.clearRect( 0, 0, ctx.canvas.width, ctx.canvas.height )

    ctx.strokeStyle = `white`
    ctx.lineWidth = 1

    ctx.fillStyle = `#333`

    for ( let y = 0;  y < cb.height;  y++ )
      for ( let x = 0;  x < cb.width;  x++ )
        if ( (y + x) % 2 )
          ctx.fillRect( c.x + x * tSize, c.y + y * tSize, tSize, tSize )

    if ( this.changePosition.from.x != null ) {
      const entity = cb.get( from.x, from.y )

      // if ( `${entity.color}` == `${this.player.color}`)

      ctx.fillStyle = `${entity.color}22`

      for ( const { x, y } of entity.availableFields( cb ) )
        ctx.fillRect( c.x + x * tSize, c.y + y * tSize, tSize, tSize )
    }

    for ( let y = 0;  y < cb.height;  y++ )
      for ( let x = 0;  x < cb.width;  x++ ) {
        const entity = cb.get( x, y )

        if ( !entity )
          continue

        let eX = c.x + (x + .5) * tSize - this.chessmanSize / 2
        let eY = c.y + (y + .5) * tSize - this.chessmanSize / 2

        ctx.drawImage( entity.tex, eX, eY, this.chessmanSize, this.chessmanSize )
      }
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight

    this.ctx.imageSmoothingEnabled = false
  }

  end() {
    alert( `game over` )
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