import ws from "./ws.js"

function rand( min, max ) {
  return Math.floor( Math.random() * (max - min) ) + min
}

class Player {
  constructor( x, y, movingTimestamp, color, controling ) {
    this.id = Math.random()
    this.x = x
    this.y = y

    this.color = color
    this.canMove = true
    this.movingTimestamp = movingTimestamp

    this.control = {
      up: controling === `wsad`  ?  `w`  :  `up`,
      down: controling === `wsad`  ?  `s`  :  `down`,
      left: controling === `wsad`  ?  `a`  :  `left`,
      right: controling === `wsad`  ?  `d`  :  `right`,
      wantToMove: controling === `wsad`  ?  `wsad`  :  `arrow`,

      mapUp: controling === `wsad`  ?  `up`  :  `w`,
      mapDown: controling === `wsad`  ?  `down`  :  `s`,
      mapLeft: controling === `wsad`  ?  `left`  :  `a`,
      mapRight: controling === `wsad`  ?  `right`  :  `d`,
    }
  }
}

class Game {
  constructor( width, height, tileSize, playerMovingTimestamp, playerControling ) {

    /* *
     * Structure */
    this.box = document.querySelector( `.game` )
    this.box.innerHTML = /* html */ `
      <canvas class="canvas-main"></canvas>
    `

    /** @type {HTMLCanvasElement} */
    this.canvas = this.box.querySelector( `.canvas-main` )
    this.ctx = this.canvas.getContext( `2d` )



    /* *
     * Data */

    this.player = new Player(
      rand( 1, width ),
      rand( 1, height ),
      playerMovingTimestamp,
      `#${(Math.random()*0xFFFFFF << 0).toString(16)}`,
      playerControling
    )

    this.entities = []

    this.camera = {
      x: window.innerWidth / 2 - this.player.x * tileSize,
      y: window.innerHeight / 2 - this.player.y * tileSize,
      mouse: { down:false, initialX:null, initialY:null }
    }
    this.map = { tileSize, width, height }



    /* *
     * Initialization */

    this.resize()
    
    ws.send( `game-init`, {
      id: this.player.id,
      color: this.player.color,
      x: this.player.x,
      y: this.player.y
    } )

    setInterval( () => {
      this.logic()
      requestAnimationFrame( () => this.draw() )
    }, 1000 / 60 )
  }

  logic() {
    const m = this.map
    const c = this.camera
    const p = this.player

    if ( p.canMove && Game.key( p.control.wantToMove ) ) {
      if ( Game.key( p.control.left ) && p.x > 1 )
        p.x--
      else if ( Game.key( p.control.right ) && p.x < m.width )
        p.x++
      else if ( Game.key( p.control.up ) && p.y > 1 )
        p.y--
      else if ( Game.key( p.control.down ) && p.y < m.height )
        p.y++

      p.canMove = false
      setTimeout( () => p.canMove = true, p.movingTimestamp )
    }

    if ( Game.key( p.control.mapUp ) && c.y < window.innerHeight / 2 )
      c.y += m.tileSize / 2
    if ( Game.key( p.control.mapDown ) && c.y > window.innerHeight / 2 - m.height * m.tileSize )
      c.y -= m.tileSize / 2
    if ( Game.key( p.control.mapLeft ) && c.x < window.innerWidth / 2 )
      c.x += m.tileSize / 2
    if ( Game.key( p.control.mapRight ) && c.x > window.innerWidth / 2 - m.width * m.tileSize )
      c.x -= m.tileSize / 2

    ws.send( `game-player_update`, {
      x: this.player.x,
      y: this.player.y
    } )
  }

  draw() {
    const m = this.map
    const p = this.player
    const c = this.camera
    const ctx = this.ctx
    const tSize = m.tileSize

    ctx.clearRect( 0, 0, ctx.canvas.width, ctx.canvas.height )



    /* *
     * Map */

    ctx.fillStyle = `#333`
    for ( let y = 0;  y < m.height;  y++ )
      for ( let x = y % 2;  x < m.width;  x += 2 ) {
        ctx.fillRect( c.x + x * tSize, c.y + y * tSize, tSize, tSize )
      }


    
    /* *
     * Entities */

    ctx.strokeStyle = `white`
    ctx.lineWidth = 1

    const allEntities = [ ...this.entities, p ]
    for ( const e of allEntities ) {
      ctx.fillStyle = `#000`
      ctx.beginPath()
      ctx.arc( c.x + (e.x - .5) * tSize, c.y + (e.y - .5) * tSize, 15, 0, Math.PI * 2 )
      ctx.closePath()
      ctx.fill()

      if ( e.id === p.id )
        ctx.stroke()
  
      ctx.fillStyle = e.color
      ctx.beginPath()
      ctx.arc( c.x + (e.x - .5) * tSize, c.y + (e.y - .5) * tSize, 5, 0, Math.PI * 2 )
      ctx.closePath()
      ctx.fill()
    }
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
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

const game = new Game( 32, 32, 50, 200, `wsad` )
const player = game.player

ws.on( `game-update`, players => {
  game.entities = []

  for ( const p of players )
    if ( p.id !== player.id )
      game.entities.push( p )
} )

window.Game = Game
window.game = game
window.player = game.player


window.addEventListener( `resize`, () => game.resize() )
document.addEventListener( `keydown`, e => Game.keys[ e.keyCode ] = true )
document.addEventListener( `keyup`, e => Game.keys[ e.keyCode ] = false )
document.addEventListener( `mouseup`, e => game.camera.mouse.down = false )
document.addEventListener( `mousedown`, e => {
  let m = game.camera.mouse

  m.down = true
  m.initialX = e.clientX
  m.initialY = e.clientY
} )
document.addEventListener( `mousemove`, e => {
  let m = game.camera.mouse

  if ( !m.down )
    return

  game.camera.x += e.clientX - m.initialX
  game.camera.y += e.clientY - m.initialY

  m.initialX = e.clientX
  m.initialY = e.clientY
} )