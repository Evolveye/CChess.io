class Color {
  constructor( hex ) {
    this.r = random( 0, 255 )
    this.g = random( 0, 255 )
    this.b = random( 0, 255 )

    this.txtFormat = ``

    if ( hex === true ) {
      this.hex = true

      hex = (Math.random()*0xFFFFFF << 0).toString(16)
    
      while ( hex.length < 6 )
        hex = `0${hex}`
    
      this.txtFormat = `#${hex}`
    }
    else
      this.txtFormat = `rgb( ${this.r}, ${this.g}, ${this.b} )`
  }

  [Symbol.toPrimitive]( hint ) {
    if ( hint === 'string' )
      return this.txtFormat
  }
}

class Chessman {
  constructor( x, y, color ) {
    this.id = Math.random()
    this.x = x
    this.y = y
    this.color = color  ||  new Color
  }

  move() {
    throw `You have to override me!`
  }
}

class Pawn extends Chessman {
  constructor( x, y, color ) {
    super( x, y, color )
  }

  move( x, y ) {
    return true

    if ( !!x == !!y )
      return
    if ( x && (x == this.x + 1 || x == this.x - 1) )
      this.x = x
    else if ( y == this.y + 1 || y == this.y - 1 )
      this.y = y
  }
}

class Player extends Pawn {
  constructor( x, y, movingTimestamp, color ) {
    super( x, y, color )

    this.type = `queen`
    this.movingTimestamp = movingTimestamp
  }
}

module.exports = class Game {
  constructor( appWss, width, height, tileSize, chessmanSize, playerMovingTimestamp ) {
    this.playerMovingTimestamp = playerMovingTimestamp
    this.chessmanSize = chessmanSize
    this.map = { 
      width,
      height,
      tileSize,
      data: [ ...Array( height ) ].map( () => [ ...Array( width ) ].map( () => null ) )
    }
    
    this.jumpsFromTo = []

    setInterval( () => {
      appWss.sockets
        .filter( appWs => appWs.room === `chess-standard` )
        .forEach( socket => socket.send( `game-update_positions`, this.jumpsFromTo ) )

      this.jumpsFromTo = []
    }, 1000 / 60 )
  }

  webSocketEvents( type, data, appWs ) {
    switch ( type ) {
      case `chat-new_message`:
        appWs.broadcast( `chat-new_message`, data )
        break

      case `game-init`: {
        let x = random( 0, this.map.width )
        let y = random( 0, this.map.height )
        
        let player = this.map.data[ y ][ x ] = new Player( x, y, this.playerMovingTimestamp )

        appWs.send( `game-init`, {
          chessmanSize: this.chessmanSize,
          map: this.map,
          player
        } )

        break
      }

      case `game-player_update`: {
        const { from, to } = data
        const map = this.map.data

        let mapField = map[ from.y ]  ?  map[ from.y ][ from.x ]  :  null

        if ( appWs.room == `chess-standard` && mapField && mapField.move( to.x, to.y ) ) {
          map[ to.y ][ to.x ] = map[ from.y ][ from.x ]
          map[ from.y ][ from.x ] = null

          this.jumpsFromTo.push( data )
        }

        break
      }
    }
  }
}

function random( min, max ) {
  return Math.floor( Math.random() * (max - min) ) + min
}