import ws from "./ws.js"

function rand( min, max ) {
  return Math.floor( Math.random() * (max - min) ) + min
}

class Player {
  constructor( x, y, movingTimestamp, color ) {
    this.id = Math.random()
    this.x = x
    this.y = y

    this.width = window.innerWidth
    this.height = window.innerHeight

    this.color = color
    this.canMove = true
    this.movingTimestamp = movingTimestamp
  }
}

class Game {
  constructor( width, height, tileSize, playerMovingTimestamp ) {

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

    this.pawnColors = [`#4DFF57`, `#7461FF`, `#FF524C`, `#FFC16D`, `#ACFFE7`, `#B83EE8`]

    this.player = new Player(
      rand( 1, width ),
      rand( 1, height ),
      playerMovingTimestamp,
      this.pawnColors[ Math.floor( Math.random() * this.pawnColors.length ) ]
    )

    this.entities = []

    this.camera = {
      x: this.player.width / 2 - this.player.x * tileSize,
      y: this.player.height / 2 - this.player.y * tileSize
    }
    this.map = { tileSize, width, height }



    /* *
     * Initialization */

    this.resize()
    
    ws.send( `game-init`, {
      id: this.player.id,
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

    if ( p.canMove && Game.key( `arrow` ) ) {
      if ( Game.key( `left` ) && p.x > 1 ) {
        c.x += m.tileSize
        p.x--
      }
      else if ( Game.key( `right` ) && p.x < m.width ) {
        c.x -= m.tileSize
        p.x++
      }
      else if ( Game.key( `up` ) && p.y > 1 ) {
        c.y += m.tileSize
        p.y--
      }
      else if ( Game.key( `down` ) && p.y < m.height ) {
        c.y -= m.tileSize
        p.y++
      }

      p.canMove = false
      setTimeout( () => p.canMove = true, p.movingTimestamp )
    }

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

    ctx.fillStyle = `#000`
    for ( const e of this.entities ) {
      ctx.beginPath()
      ctx.arc( c.x + (e.x - .5) * tSize, c.y + (e.y - .5) * tSize, 10, 0, Math.PI * 2 )
      ctx.closePath()
      ctx.fill()
    }


    
    /* *
     * Player */

    ctx.strokeStyle = `white`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc( c.x + (p.x - .5) * tSize, c.y + (p.y - .5) * tSize, 10, 0, Math.PI * 2 )
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc( c.x + (p.x - .5) * tSize, c.y + (p.y - .5) * tSize, 3, 0, Math.PI * 2 )
    ctx.closePath()
    ctx.fill()
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
      }

    return k[ key ]
  }
}
Game.keys = []

const game = new Game( 20, 20, 30, 100 )
const player = game.player

ws.on( `game-update`, players => {
  game.entities = []

  for ( const p of players )
    if ( p.id !== player.id )
      game.entities.push( {
        x: p.x,
        y: p.y
      } )
} )

window.Game = Game
window.game = game
window.player = game.player


document.addEventListener( `keydown`, e => Game.keys[ e.keyCode ] = true )
document.addEventListener( `keyup`, e => Game.keys[ e.keyCode ] = false )
window.addEventListener( `resize`, () => game.resize() )