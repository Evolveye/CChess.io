import ws from "./ws.js"
import Chessboard, { Color, setTexture } from "/$/classes"
import Chat from "./chat.js"
import userData from "./userData.js"

export default class Game {
  constructor( nickname ) {
    this.box = document.querySelector( `.game` )
    this.box.innerHTML = /* html */ `
      <canvas class="canvas-main"></canvas>

      <section class="scoreboard">
        <h3>Scoreboard</h3>
        <div class="scoreboard-fields"></div>
      </section>

      <section class="chat"></section>

      <div class="console"></div>

      <div class="version">Approximate v: Alpha 0.1</div>
    `

    /** @type {HTMLCanvasElement} */
    this.canvas = this.box.querySelector( `.canvas-main` )
    this.ctx = this.canvas.getContext( `2d` )

    this.chat = new Chat( this.box.querySelector( `.chat` ) )
    this.console = this.box.querySelector( `.console` )

    this.scoreboard = this.box.querySelector( `.scoreboard-fields` )

    this.ws = ws
    this.ping = Date.now()
    this.mode = `game`
    this.map = null
    this.chessmanSize = null
    this.lastClickedField = { x:null, y:null }
    this.runningOnMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test( navigator.userAgent )
    this.camera = {
      spaceAroundgame: 100,
      cursor: { x:null, y:null },
      action: null,
      x: null,
      y: null,
    }

    this.resize()

    ws.onclose( () => {
      this.mode = `disconnected`
      this.chat.newMessage( {
        data: `Disconnected 👺`,
        type: `disconnected`
      } )
    } )
    ws.on( `pong`, () => this.console.textContent = `Ping: ${Date.now() - this.ping}ms` )
    ws.send( `game-init`, nickname )
    ws.on( `game-init`, ( { chessmanSize, player, chessboard } ) => {
      const { width, height, tileSize, fields } = chessboard

      this.chessmanSize = chessmanSize
      this.console.textContent = `Ping: ${Date.now() - this.ping}ms`
      this.chessboard = new Chessboard( width, height, tileSize, fields, true )
      this.player = this.chessboard.get( player.x, player.y )

      chessboard = this.chessboard
      player = this.player

      this.cameraInit()

      setInterval( () => {
        this.logic()
        requestAnimationFrame( () => this.draw() )
      }, 1000 / 60 )
      setInterval( () => {
        this.ping = Date.now()
        ws.send( `ping` )
      }, 1000 * 5 )
      requestAnimationFrame( () => this.draw() )

      if ( this.runningOnMobile ) {
        document.addEventListener( `touchstart`, e  => this.cursorDown( e ) )
        document.addEventListener( `touchend`,   () => this.cursorUp() )
        document.addEventListener( `touchmove`,  e  => this.cursorMove( e ) )

        this.chat.input.placeholder = `Chat...`
        this.chat.box.classList.add( `active` )
      }
      else {
        document.addEventListener( `mouseup`,   () => this.cursorUp() )
        document.addEventListener( `mousedown`, () => this.cursorDown() )
        document.addEventListener( `mousemove`, e  => this.cursorMove( e ) )
      }

      window.addEventListener(   `resize`,   () => this.resize() )
      document.addEventListener( `keypress`, () => {
        if ( Game.key( `enter`) ) {
          const c = this.chat

          if ( this.mode == `chat` ) {
            this.mode = `game`
            c.box.classList.remove( `active` )
            c.input.blur()
          }
          else if ( this.mode == `game` ) {
            this.mode = `chat`
            c.box.classList.add( `active` )
            c.input.focus()
          }
        }
        else if ( Game.key( `space`) && this.mode != `chat` )
          this.cameraInit()
      } )
      ws.on( `game-update-scoreboard`, scoreboard => {
        this.scoreboard.innerHTML = ``

        for ( const field of scoreboard.sort( (a, b) => b.data - a.data ) ) {
          if ( field.nickname == player.nickname )
            player.scores = field.data

          this.scoreboard.appendChild( userData( field ) )
        }
      } )
      ws.on( `game-update-despawn-player`, color => chessboard.removePlayer( color ) )
      ws.on( `game-update-despawn`, ( { x, y } ) => chessboard.remove( x, y ) )
      ws.on( `game-update-spawn`, chessman => chessboard.set( chessman, true ) )
      ws.on( `game-update-jumps`, jumps => jumps.forEach( ( { from, to } ) =>
        chessboard.move( from, to ).id === player.id  ?  this.end()  :  null
      ) )
    } )
  }

  cameraInit() {
    const { width, height, tileSize } = this.chessboard
    const c = this.camera

    if ( window.innerWidth < width * tileSize ) {
      c.x = window.innerWidth / 2 - (this.player.x + .5) * tileSize

      if ( c.x > c.spaceAroundgame )
        c.x = c.spaceAroundgame
      else if ( c.x < window.innerWidth - c.spaceAroundgame - width * tileSize )
        c.x = window.innerWidth - c.spaceAroundgame - width * tileSize
    }
    else
      c.x = window.innerWidth / 2 - width * tileSize / 2

    if ( window.innerHeight < height * tileSize ) {
      c.y = window.innerHeight / 2 - (this.player.y + .5) * tileSize

      if ( c.y > c.spaceAroundgame )
        c.y = c.spaceAroundgame
      else if ( c.y < window.innerHeight - c.spaceAroundgame - height * tileSize )
        c.y = window.innerHeight - c.spaceAroundgame - height * tileSize
    }
    else
      c.y =  window.innerHeight / 2 - height * tileSize / 2
  }

  cursorUp() {
    if ( this.mode == `disconnected` )
      return

    const c = this.camera
    const cb = this.chessboard
    const field = this.lastClickedField
    const x = Math.floor( (c.cursor.x - c.x) / cb.tileSize )
    const y = Math.floor( (c.cursor.y - c.y) / cb.tileSize )

    const from = { x:field.x, y:field.y }
    const to = { x, y }

    if ( !field || !cb.isAbove( x, y ) || this.mode == `disconnected` )
      c.action = null

    if ( c.action == `jump` ) {
      if ( field.x == x && field.y == y )
        c.action = `jump-2_clicks`
      else if ( cb.checkJump( from, to ) ) {
        this.send( `game-update-player`, { from, to } )
        c.action = null
      }
      else
        c.action = null
    }
    else if ( c.action == `jump-2_clicks` ) {
      if ( (field.x != x || field.y != y) && cb.checkJump( from, to ) )
        this.send( `game-update-player`, { from, to } )

      if ( !Game.key( `ctrl` ) )
        c.action = null
    }
    else
      c.action = null

    this.cameraCursorUpdate( x, y )
  }

  cursorDown( e ) {
    const c = this.camera

    if ( this.runningOnMobile ) {
      const coords = e.touches[0] || e.changedTouches[0]
      c.cursor.x = coords.pageX
      c.cursor.y = coords.pageY
    }

    const x = Math.floor( (c.cursor.x - c.x) / this.chessboard.tileSize )
    const y = Math.floor( (c.cursor.y - c.y) / this.chessboard.tileSize )
    const field = this.chessboard.get( x, y )

    if ( Color.isEqual( field, this.player ) && this.mode != `disconnected` ) {
      this.lastClickedField = field
      c.action = `jump`
    }
    else if ( c.action != `jump-2_clicks` )
      c.action = `moving`

    this.cameraCursorUpdate( x, y )
  }

  cursorMove( e ) {
    const c = this.camera
    const { width, height, tileSize } = this.chessboard
    const coords = this.runningOnMobile  ?  e.touches[0] || e.changedTouches[0]  :  e
    const newX = coords.clientX - c.cursor.x + c.x
    const newY = coords.clientY - c.cursor.y + c.y

    c.cursor.x = coords.pageX
    c.cursor.y = coords.pageY

    const x = Math.floor( (c.cursor.x - c.x) / tileSize )
    const y = Math.floor( (c.cursor.y - c.y) / tileSize )

    this.cameraCursorUpdate( x, y )

    if ( c.action != `moving` )
      return

    if ( window.innerWidth - c.spaceAroundgame - width * tileSize < newX && newX < c.spaceAroundgame )
      c.x = newX

    if ( window.innerHeight - c.spaceAroundgame - height * tileSize < newY && newY < c.spaceAroundgame )
      c.y = newY

  }

  logic() {
    if ( this.mode == `game` ) {
      const cb = this.chessboard
      const c = this.camera

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
    else if ( this.mode == `chat` ) {
    }
  }

  draw() {
    const { width, height, tileSize } = this.chessboard
    const cSize = this.chessmanSize
    const c = this.camera
    const ctx = this.ctx

    ctx.fillStyle = `#000`
    ctx.fillRect( 0, 0, ctx.canvas.width, ctx.canvas.height )

    ctx.fillStyle = `#fff`
    ctx.fillRect( c.x, c.y, width * tileSize, height * tileSize )

    ctx.fillStyle = `#dadada`
    for ( let y = 0;  y < height;  y++ )
      for ( let x = 0;  x < width;  x++ )
        if ( (y + x) % 2 )
          ctx.fillRect( c.x + x * tileSize, c.y + y * tileSize, tileSize, tileSize )

    if ( /^jump/.test( c.action ) ) {
      const entity = this.lastClickedField

      ctx.fillStyle = `${entity.color}44`

      for ( const { x, y } of entity.availableFields( cb ) )
        ctx.fillRect( c.x + x * tileSize, c.y + y * tileSize, tileSize, tileSize )
    }

    for ( let y = 0;  y < height;  y++ )
      for ( let x = 0;  x < width;  x++ ) {
        const entity = this.chessboard.get( x, y )

        if ( !entity )
          continue

        let eX = c.x + (x + .5) * tileSize
        let eY = c.y + (y + .5) * tileSize

        if ( entity.protected() ) {
          ctx.fillStyle = `#0000ff44`
          ctx.fillRect( c.x + x * tileSize, c.y + y * tileSize, tileSize, tileSize )
        }

        ctx.drawImage( entity.tex, eX - cSize / 2, eY - cSize / 2, cSize, cSize )

        if ( entity.nickname ) {
          const nickname = entity.nickname
          const width = ctx.measureText( nickname ).width

          ctx.fillStyle = `#00000044`
          ctx.fillRect( eX - 5 - width / 2, eY - 5 - 15 - cSize / 2, width + 10, 15 + 10 )
          ctx.fillStyle = `#ffffff`
          ctx.fillText( nickname, eX - width / 2, eY - cSize / 2 )
        }
      }
  }

  cameraCursorUpdate( x, y ) {
    const jumping = /^jump/.test( this.camera.action )

    if ( Color.isEqual( this.chessboard.get( x, y ), this.player ) ) {
      if ( jumping )
        return this.box.style.cursor = `grabbing`
      else
        return this.box.style.cursor = `pointer`
    }
    else if ( jumping )
      for ( const coords of this.lastClickedField.availableFields( this.chessboard ) )
        if ( coords.x == x && coords.y == y )
          return this.box.style.cursor = `grabbing`

    this.box.style.cursor = `default`
  }

  send( type, data ) {
    this.ws.send( type, data )
  }

  resize() {
    const ctx = this.ctx

    ctx.canvas.width = window.innerWidth
    ctx.canvas.height = window.innerHeight

    ctx.imageSmoothingEnabled = false
    ctx.font = `15px monospace`
    ctx.strokeStyle = `white`
    ctx.lineWidth = 1

    ctx.fillStyle = `#843737`
    ctx.fillRect( 0, 0, ctx.canvas.width, ctx.canvas.height )
  }

  end() {
    alert( `game over\n\nZdobyte punkty: ${this.player.scores}\n\nOdśwież stronę aby grać dalej` )
  }

  static key( key ) {
    const k = Game.keys

    if ( typeof key === `string`)
      switch ( key.toLowerCase() ) {
        case `left`: return k[ 37 ]
        case `right`: return k[ 39 ]
        case `up`: return k[ 38 ]
        case `down`: return k[ 40 ]
        case `arrow`: return k[ 37 ]  ||  k[ 38 ]  ||  k[ 39 ]  ||  k[ 40 ]

        case `w`: return k[ 87 ]
        case `s`: return k[ 83 ]
        case `a`: return k[ 65 ]
        case `d`: return k[ 68 ]
        case `wsad`: return k[ 87 ]  ||  k[ 83 ]  ||  k[ 65 ]  ||  k[ 68 ]

        case `enter`: return k[ 13 ]
        case `space`: return k[ 32 ]
        case `ctrl`: return k[ 17 ]
      }

    key = k[ key ]

    if ( newBool != null )
      k[ key ] = newBool

    return key
  }
}
Game.keys = []

document.addEventListener( `keydown`, e => Game.keys[ e.keyCode ] = true )
document.addEventListener( `keyup`, e => Game.keys[ e.keyCode ] = false )