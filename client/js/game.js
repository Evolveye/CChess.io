import ws from "./ws.js"
import Chessboard, { Color, setTexture } from "/$/classes"
import Chat from "./chat.js"
import userData from "./userData.js"

export default class Game {
  constructor( nickname ) {
    this.box = document.querySelector( `.game` )
    this.box.innerHTML = /* html */ `
      <canvas class="canvas-main"></canvas>

      <section class="chat"></section>

      <section class="transform">
        <div data-num="1" class="transform-item is-knight"><img src="./img/knight.png"></div>
        <div data-num="2" class="transform-item is-bishop"><img src="./img/bishop.png"></div>
        <div data-num="3" class="transform-item is-rook"><img src="./img/rook.png"></div>
      </section>

      <section class="scoreboard">
        <h3 class="scoreboard-title">Scoreboard</h3>
        <div class="scoreboard-fields"></div>
      </section>

      <canvas class="minimap"></canvas>

      <div class="info">
        <div class="info-fieldsToCapture"></div>
        <div class="info-ping"></div>
        <div class="info-version">Approximate v: Alpha 1.5</div>
      </div>
    `

    this.ui = {
      canvas: this.box.querySelector( `.canvas-main` ),
      chat: new Chat( this.box.querySelector( `.chat` ) ),
      scoreboard: this.box.querySelector( `.scoreboard-fields` ),
      minimap: this.box.querySelector( `.minimap` ),
      transform: {
        knight: this.box.querySelector( `.is-knight` ),
        bishop: this.box.querySelector( `.is-bishop` ),
        rook: this.box.querySelector( `.is-rook` )
      },
      info: {
        fieldsToCapture: this.box.querySelector( `.info-fieldsToCapture` ),
        ping: this.box.querySelector( `.info-ping` )
      },
    }

    /** @type {CanvasRenderingContext2D} */
    this.ctx = this.ui.canvas.getContext( `2d` )
    /** @type {CanvasRenderingContext2D} */
    this.miniCtx = this.ui.minimap.getContext( `2d` )

    this.ws = ws
    this.ping = Date.now()
    this.mode = `game`
    this.map = null
    this.chessmanSize = null
    this.lastClickedEntity = { x:null, y:null }
    this.runningOnMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test( navigator.userAgent )
    this.camera = {
      spaceAroundgame: 200,
      cursor: { x:null, y:null },
      action: null,
      x: null,
      y: null,
    }

    ws.onclose( () => {
      this.mode = `stop`
      this.ui.chat.newMessage( {
        data: `Disconnected 👺`,
        type: `disconnected`
      } )
    } )
    ws.on( `game-init`, initialData => this.init( initialData ) )
    ws.on( `game-no_free_space`, () => this.mode = `stop` )
    ws.send( `game-init`, nickname )
  }

  init( { chessmanSize, player, chessboard, neededPointsToTransform } ) {
    const ws = this.ws
    const { width, height, tileSize, fields } = chessboard
    const { chat, info, transform } = this.ui

    this.chessmanSize = chessmanSize
    this.chessboard = new Chessboard( width, height, tileSize, fields, true )
    this.player = this.chessboard.get( player.x, player.y ).entity
    this.cameraInit()
    this.resize()

    info.ping.textContent = `Ping: ${Date.now() - this.ping}ms`
    chessboard = this.chessboard
    player = this.player

    setInterval( () => {
      this.cameraMove()
      requestAnimationFrame( () => this.draw() )
    }, 1000 / 60 )
    setInterval( () => {
      this.ping = Date.now()
      ws.send( `ping` )
    }, 1000 * 5 )

    if ( this.runningOnMobile ) {
      document.addEventListener( `touchstart`, e  => this.cursorDown( e ) )
      document.addEventListener( `touchend`,   () => this.cursorUp() )
      document.addEventListener( `touchmove`,  e  => this.cursorMove( e ) )

      chat.input.placeholder = `Chat...`
      chat.box.classList.add( `active` )
    }
    else {
      document.addEventListener( `mouseup`,   () => this.cursorUp() )
      document.addEventListener( `mousedown`, () => this.cursorDown() )
      document.addEventListener( `mousemove`, e  => this.cursorMove( e ) )
    }

    window.addEventListener(   `resize`,  () => this.resize() )
    document.addEventListener( `keydown`, () => this.keydown() )

    ws.on( `game-scoreboard`, scoreboard => {
      this.ui.scoreboard.innerHTML = ``

      for ( const field of scoreboard.sort( (a, b) => b.data - a.data ) ) {
        if ( field.nickname == player.nickname )
          player.scores = field.data

        this.ui.scoreboard.appendChild( userData( field ) )
      }

      info.fieldsToCapture.textContent = `Fields to capture: ${player.fieldsToCapture}`

      for ( let chesspiece in neededPointsToTransform )
        if ( player.scores >= neededPointsToTransform[ chesspiece ] )
          transform[ chesspiece ].classList.add( `available` )
    ws.on( `pong`, () => info.ping.textContent = `Ping: ${Date.now() - this.ping}ms` )
    } )
    ws.on( `pong`, () => info.ping.textContent = `Ping: ${Date.now() - this.ping}ms` )
    ws.on( `game-transform`, ( { x, y, type } ) => chessboard.transform( type, x, y ) )
    ws.on( `game-despawn-player`, color => chessboard.removePlayer( color ) )
    ws.on( `game-despawn`, ( { x, y } ) => chessboard.remove( x, y ) )
    ws.on( `game-spawn`, chessman => chessboard.setEntity( chessman, true ) )
    ws.on( `game-update`, ( { jumps, colors } ) => {
      colors.forEach( ( { x, y, color } ) => this.chessboard.setColor( x, y, color ) )
      jumps.forEach( ( { from, to } ) => {
        const takedField = chessboard.move( from, to )

        if ( takedField.id === player.id )
          this.end()
        else if ( Color.isEqual( takedField.color, player.color) && takedField.type == `pawn` )
          ++player.fieldsToCapture
      } )
    } )
  }

  keydown() {
    if ( Game.key( `enter` ) ) {
      const chat = this.ui.chat

      if ( this.mode == `chat` ) {
        this.mode = `game`
        chat.box.classList.remove( `active` )
        chat.input.blur()
      }
      else if ( this.mode == `game` ) {
        this.mode = `chat`
        chat.box.classList.add( `active` )
        chat.input.focus()
      }
    }

    if ( this.mode != `game`)
      return

    if ( Game.key( `space` ) )
      this.cameraInit()
    if ( Game.key( `shift` ) )
      this.setColor()
    if ( Game.key( `number` ) )
      this.transform()
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

        if ( field.color && !Color.isEqual( field.color, `#ffffff` ) ) {
          ctx.fillStyle = field.color
          ctx.fillRect( c.x + x * tileSize, c.y + y * tileSize, tileSize, tileSize )

          if ( Color.isEqual( field.color, this.player.color ) ) {
            this.miniCtx.fillStyle = field.color
            this.miniCtx.fillRect( x * 2, y * 2, 2, 2 )
          }
        }
        if ( (y + x) % 2 ) {
          ctx.fillStyle = `#0001`
          ctx.fillRect( c.x + x * tileSize, c.y + y * tileSize, tileSize, tileSize )
        }
      }

    if ( /^jump/.test( c.action ) ) {
      const entity = this.lastClickedEntity

      for ( const { x, y } of entity.availableFields( this.chessboard ) ) {
        ctx.fillStyle = `${entity.color}55`
        ctx.fillRect( c.x + x * tileSize, c.y + y * tileSize, tileSize, tileSize )

        ctx.fillStyle = `#fff2`
        ctx.fillRect( c.x + x * tileSize + 5, c.y + y * tileSize + 5, tileSize - 10, tileSize - 10 )
      }
    }

    for ( let y = 0;  y < height;  y++ )
      for ( let x = 0;  x < width;  x++ ) {
        const entity = this.chessboard.get( x, y ).entity

        if ( !entity )
          continue

        let eX = c.x + (x + .5) * tileSize
        let eY = c.y + (y + .5) * tileSize

        if ( entity.protected() ) {
          ctx.strokeStyle = `${entity.color}aa`
          ctx.strokeRect( c.x + x * tileSize, c.y + y * tileSize, tileSize, tileSize )
        }

        ctx.drawImage( entity.tex, eX - cSize / 2, eY - cSize / 2, cSize, cSize )

        if ( entity.nickname ) {
          const nickname = entity.nickname
          const width = ctx.measureText( nickname ).width

          ctx.fillStyle = `#0006`
          ctx.fillRect( eX - 5 - width / 2, eY - 5 - 15 - cSize / 2, width + 10, 15 + 10 )
          ctx.fillStyle = `#fff`
          ctx.fillText( nickname, eX - width / 2, eY - cSize / 2 )
        }

        if ( !entity.goodTimestamp() ) {
          const maxWidth = tileSize * .8
          const width =  maxWidth * (Date.now() - entity.lastJump) / entity.movingTimestamp

          ctx.fillStyle = `#0006`
          ctx.fillRect( eX - 5 - (maxWidth - 5) / 2, eY - 5 + 15 + cSize / 2, (maxWidth - 5) + 10, 15 + 10 )
          ctx.fillStyle = `#fff`
          ctx.fillRect( eX - (maxWidth - 5) / 2, eY + 15 + cSize / 2, width, 15 )
        }
      }
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

  cameraMove() {
    if ( this.mode != `game` && this.mode != `stop` )
      return

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

  cursorUp() {
    const c = this.camera
    const cb = this.chessboard
    const entity = this.lastClickedEntity
    const x = Math.floor( (c.cursor.x - c.x) / cb.tileSize )
    const y = Math.floor( (c.cursor.y - c.y) / cb.tileSize )

    const from = { x:entity.x, y:entity.y }
    const to = { x, y }

    if ( !entity || !cb.isAbove( x, y ) || this.mode == `stop` )
      c.action = null

    if ( c.action == `jump` ) {
      if ( entity.x == x && entity.y == y )
        c.action = `jump-2_clicks`
      else if ( cb.checkJump( from, to ) ) {
        this.send( `game-jump`, { from, to } )
        c.action = null
      }
      else
        c.action = null
    }
    else if ( c.action == `jump-2_clicks` ) {
      if ( (entity.x != x || entity.y != y) && cb.checkJump( from, to ) )
        this.send( `game-jump`, { from, to } )

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

    if ( Color.isEqual( entity, this.player ) && this.mode != `stop` ) {
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

  setColor() {
    const { x, y } = this.lastClickedEntity
    const player = this.player

    if ( player.fieldsToCapture <= 0 )
      return

    let prevColor = this.chessboard.setColor( x, y, player.color )

    if ( prevColor === undefined )
      return

    --player.fieldsToCapture
    this.ws.send( `game-color`, { coords:{ x, y }, color:player.color } )
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

  send( type, data ) {
    this.ws.send( type, data )
  }

  resize() {
    const ctx = this.ctx
    const miniCtx = this.miniCtx

    ctx.canvas.width = window.innerWidth
    ctx.canvas.height = window.innerHeight

    ctx.imageSmoothingEnabled = false
    ctx.font = `15px monospace`
    ctx.lineWidth = 5

    miniCtx.fillStyle = `${this.player.color}`
    miniCtx.imageSmoothingEnabled = false
    miniCtx.canvas.width = this.chessboard.width * 2
    miniCtx.canvas.height = this.chessboard.height * 2
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