import ws from "./ws.js"

class Player {
  constructor() {
    this.id = Math.random()
    this.x = Math.floor( Math.random() * 700 )
    this.y = Math.floor( Math.random() * 500 )
  }
}

class Game {
  constructor() {
    /** @type {HTMLCanvasElement} */
    this.canvas = document.querySelector( `.canvas-main` )
    this.ctx = this.canvas.getContext( `2d` )

    this.player = new Player

    this.entities = []

    this.resize()
    
    ws.send( `game_init`, {
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
    if ( Game.key( `left` ) )
      this.player.x--
    if ( Game.key( `right` ) )
      this.player.x++
    if ( Game.key( `up` ) )
      this.player.y--
    if ( Game.key( `down` ) )
      this.player.y++

    ws.send( `game_update`, {
      x: this.player.x,
      y: this.player.y
    } )
  }

  draw() {
    const p = this.player
    const ctx = game.ctx

    // ctx.clearRect( 0, 0, ctx.canvas.width, ctx.canvas.height )

    ctx.fillStyle = `#000`
    for ( const e of this.entities ) {
      ctx.beginPath()
      ctx.arc( e.x, e.y, 10, 0, Math.PI * 2 )
      ctx.closePath()
      ctx.fill()
    }

    ctx.fillStyle = `#F00`
    ctx.beginPath()
    ctx.arc( p.x, p.y, 10, 0, Math.PI * 2 )
    ctx.closePath()
    ctx.fill()
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  static key( key ) {
    let keyCode

    if ( typeof key === `string`)
      switch ( key ) {
        case `left`:
          keyCode = 37
          break
        case `right`:
          keyCode = 39
          break
        case `up`:
          keyCode = 38
          break
        case `down`:
          keyCode = 40
          break
      }

    return Game.keys[ keyCode ]
  }
}
Game.keys = []

const game = new Game
const player = game.player

ws.on( `game_update`, players => {
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


document.addEventListener( `keydown`, e => Game.keys[ e.keyCode ] = true )
document.addEventListener( `keyup`, e => Game.keys[ e.keyCode ] = false )
window.addEventListener( `resize`, () => game.resize() )