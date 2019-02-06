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

      <div class="stats">
        <div class="stats-fieldsToCapture"></div>
        <div class="stats-ping"></div>
      </div>

      <div class="version">Approximate v: Alpha 1.0</div>
    `

    /** @type {HTMLCanvasElement} */
    this.canvas = this.box.querySelector( `.canvas-main` )
    this.ctx = this.canvas.getContext( `2d` )

    this.chat = new Chat( this.box.querySelector( `.chat` ) )
    this.stats = {
      fieldsToCapture: this.box.querySelector( `.stats-fieldsToCapture` ),
      ping: this.box.querySelector( `.stats-ping` )
    }

    this.scoreboard = this.box.querySelector( `.scoreboard-fields` )

    this.ws = ws
    this.ping = Date.now()
    this.mode = `game`
    this.map = null
    this.chessmanSize = null
    this.lastClickedEntity = { x:null, y:null }
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
    ws.on( `pong`, () => this.stats.ping.textContent = `Ping: ${Date.now() - this.ping}ms` )
    ws.on( `game-init`, initialData => this.init( initialData ) )
    ws.send( `game-init`, nickname )
  }

  init( { chessmanSize, player, chessboard } ) {
    const ws = this.ws
    const { width, height, tileSize, fields } = chessboard

    this.chessmanSize = chessmanSize
    this.stats.ping.textContent = `Ping: ${Date.now() - this.ping}ms`
    this.chessboard = new Chessboard( width, height, tileSize, fields, true )
    this.player = this.chessboard.get( player.x, player.y ).entity

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

    window.addEventListener(   `resize`,  () => this.resize() )
    document.addEventListener( `keydown`, () => {
      if ( Game.key( `enter` ) ) {
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
      else if ( this.mode != `chat` ) {
        if ( Game.key( `space` ) )
          this.cameraInit()
        else if ( Game.key( `shift` ) )
          this.setColor()
        else if ( Game.key( `number` ) )
          this.transform()
      }
    } )
    ws.on( `game-update-scoreboard`, scoreboard => {
      this.scoreboard.innerHTML = ``

      for ( const field of scoreboard.sort( (a, b) => b.data - a.data ) ) {
        if ( field.nickname == player.nickname )
          player.scores = field.data

        this.scoreboard.appendChild( userData( field ) )
      }

      this.stats.fieldsToCapture.textContent = player.fieldsToCapture
    } )
    ws.on( `game-transform`, ( { x, y, type } ) => chessboard.transform( type, x, y ) )
    ws.on( `game-update-despawn-player`, color => chessboard.removePlayer( color ) )
    ws.on( `game-update-despawn`, ( { x, y } ) => chessboard.remove( x, y ) )
    ws.on( `game-update-spawn`, chessman => chessboard.setEntity( chessman, true ) )
    ws.on( `game-update`, ( { jumps, colors } ) => {
      colors.forEach( ( { x, y, color } ) => this.chessboard.setColor( x, y, color ) )
      jumps.forEach( ( { from, to } ) => {
        const takedField = chessboard.move( from, to )

        if ( takedField.id === player.id )
          this.end()
        else if ( takedField.type == `pawn` )
          ++player.fieldsToCapture
      } )
    } )
  }

  transform() {
    const { x, y } = this.lastClickedEntity

    if ( Game.key( `1` ) )
      ws.send( `game-transform`, { x, y, type:`knight` } )
    else if ( Game.key( `2` ) )
      ws.send( `game-transform`, { x, y, type:`bishop` } )
    else if ( Game.key( `3` ) )
      ws.send( `game-transform`, { x, y, type:`rook` } )
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

  setColor() {
    const { x, y } = this.lastClickedEntity
    const player = this.player

    if ( player.fieldsToCapture <= 0 )
      return

    let prevColor = this.chessboard.setColor( x, y, player.color )

    if ( prevColor === undefined )
      return

    --player.fieldsToCapture
    this.ws.send( `game-update-color`, { coords:{ x, y }, color:player.color } )
  }

  cursorUp() {
    if ( this.mode == `disconnected` )
      return

    const c = this.camera
    const cb = this.chessboard
    const entity = this.lastClickedEntity
    const x = Math.floor( (c.cursor.x - c.x) / cb.tileSize )
    const y = Math.floor( (c.cursor.y - c.y) / cb.tileSize )

    const from = { x:entity.x, y:entity.y }
    const to = { x, y }

    if ( !entity || !cb.isAbove( x, y ) || this.mode == `disconnected` )
      c.action = null

    if ( c.action == `jump` ) {
      if ( entity.x == x && entity.y == y )
        c.action = `jump-2_clicks`
      else if ( cb.checkJump( from, to ) ) {
        this.send( `game-update-player`, { from, to } )
        c.action = null
      }
      else
        c.action = null
    }
    else if ( c.action == `jump-2_clicks` ) {
      if ( (entity.x != x || entity.y != y) && cb.checkJump( from, to ) )
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
    const entity = this.chessboard.get( x, y ).entity

    if ( Color.isEqual( entity, this.player ) && this.mode != `disconnected` ) {
      this.lastClickedEntity = entity
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

    for ( let y = 0;  y < height;  y++ )
      for ( let x = 0;  x < width;  x++ ) {
        const field = this.chessboard.get( x, y )

        if ( field.color ) {
          ctx.fillStyle = field.color
          ctx.fillRect( c.x + x * tileSize, c.y + y * tileSize, tileSize, tileSize )
        }
        if ( (y + x) % 2 ) {
          ctx.fillStyle = `#0001`
          ctx.fillRect( c.x + x * tileSize, c.y + y * tileSize, tileSize, tileSize )
        }
      }

    if ( /^jump/.test( c.action ) ) {
      const entity = this.lastClickedEntity

      ctx.fillStyle = `${entity.color}44`

      for ( const { x, y } of entity.availableFields( this.chessboard ) )
        ctx.fillRect( c.x + x * tileSize, c.y + y * tileSize, tileSize, tileSize )
    }

    for ( let y = 0;  y < height;  y++ )
      for ( let x = 0;  x < width;  x++ ) {
        const entity = this.chessboard.get( x, y ).entity

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
    const field = this.chessboard.get( x, y )

    if ( field && Color.isEqual( field.entity, this.player ) ) {
      if ( jumping )
        return this.box.style.cursor = `grabbing`
      else
        return this.box.style.cursor = `pointer`
    }
    else if ( jumping )
      for ( const coords of this.lastClickedEntity.availableFields( this.chessboard ) )
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
        case `w`: return k[ 87 ]
        case `s`: return k[ 83 ]
        case `d`: return k[ 68 ]
        case `a`: return k[ 65 ]
        case `wsad`: return k[ 87 ] || k[ 83 ] || k[ 65 ] || k[ 68 ]

        case `9`: return k[ 57 ]
        case `8`: return k[ 56 ]
        case `7`: return k[ 55 ]
        case `6`: return k[ 54 ]
        case `5`: return k[ 53 ]
        case `4`: return k[ 52 ]
        case `3`: return k[ 51 ]
        case `2`: return k[ 50 ]
        case `1`: return k[ 49 ]
        case `0`: return k[ 48 ]
        case `number`: return k[ 48 ] || k[ 49 ] || k[ 50 ] || k[ 51 ] || k[ 52 ]
                           || k[ 53 ] || k[ 54 ] || k[ 55 ] || k[ 56 ] || k[ 57 ]

        case `down`: return k[ 40 ]
        case `right`: return k[ 39 ]
        case `up`: return k[ 38 ]
        case `left`: return k[ 37 ]
        case `arrow`: return k[ 37 ] || k[ 38 ] || k[ 39 ] || k[ 40 ]

        case `space`: return k[ 32 ]
        case `ctrl`: return k[ 17 ]
        case `shift`: return k[ 16 ]
        case `enter`: return k[ 13 ]
      }

    return k[ key ]
  }
}
Game.keys = []

document.addEventListener( `keydown`, e => Game.keys[ e.keyCode ] = true )
document.addEventListener( `keyup`, e => Game.keys[ e.keyCode ] = false )