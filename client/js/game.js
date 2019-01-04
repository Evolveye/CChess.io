import ws from "./ws.js"

class Player {
  constructor( movingTimeStamp, color ) {
    this.id = Math.random()
    this.x = 10 // Math.floor( Math.random() * 700 )
    this.y = 10 // Math.floor( Math.random() * 500 )

    this.width = window.innerWidth
    this.height = window.innerHeight

    this.color = color
    this.canMove = true
    this.movingTimeStamp = movingTimeStamp
  }
}

class Game {
  constructor( width, height, tileSize ) {

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

    this.player = new Player( 500, this.pawnColors[ Math.floor( Math.random() * this.pawnColors.length ) ] )

    this.entities = []

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
    const p = this.player

    if ( p.canMove && Game.key( `arrow` ) ) {
      if ( Game.key( `left` ) && p.x )
        p.x--
      else if ( Game.key( `right` ) && p.x < m.width )
        p.x++
      else if ( Game.key( `up` ) && p.y )
        p.y--
      else if ( Game.key( `down` ) && p.y < m.height )
        p.y++

      p.canMove = false
      setTimeout( () => p.canMove = true, p.movingTimeStamp )
    }

    ws.send( `game-player_update`, {
      x: this.player.x,
      y: this.player.y
    } )
  }

  draw() {
    const m = this.map
    const p = this.player
    const ctx = this.ctx
    const tSize = m.tileSize

    ctx.clearRect( 0, 0, ctx.canvas.width, ctx.canvas.height )

    // map
    ctx.fillStyle = `#333`
    for ( let y = 0;  y < m.height;  y++ )
      for ( let x = y % 2;  x < m.width;  x += 2 ) {
        ctx.fillRect( x * tSize, y * tSize, tSize, tSize )
      }
    

    ctx.fillStyle = `#000`
    for ( const e of this.entities ) {
      ctx.beginPath()
      ctx.arc( (e.x - .5) * tSize, (e.y - .5) * tSize, 10, 0, Math.PI * 2 )
      ctx.closePath()
      ctx.fill()
    }

    ctx.strokeStyle = `white`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc( (p.x - .5) * tSize, (p.y - .5) * tSize, 10, 0, Math.PI * 2 )
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc( (p.x - .5) * tSize, (p.y - .5) * tSize, 3, 0, Math.PI * 2 )
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

const game = new Game( 20, 20, 30 )
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

// window.Game = Game
// window.game = game


document.addEventListener( `keydown`, e => Game.keys[ e.keyCode ] = true )
document.addEventListener( `keyup`, e => Game.keys[ e.keyCode ] = false )
window.addEventListener( `resize`, () => game.resize() )