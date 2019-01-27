class Color {
  constructor( color ) {

    this.txtFormat = ``
    
    if ( /#[0-9a-f]{6}/i.test( color ) ) {
      this.r = parseInt( color.slice( 1, 3 ), 16 )
      this.g = parseInt( color.slice( 3, 5 ), 16 )
      this.b = parseInt( color.slice( 5, 7 ), 16 )
      this.txtFormat = color
    }
    else {
      this.r = random( 0, 255 )
      this.g = random( 0, 255 )
      this.b = random( 0, 255 )
      this.txtFormat = `rgb( ${this.r}, ${this.g}, ${this.b} )`
    }
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
    this.color = new Color( color )
  }

  move() {
    throw `You have to override me!`
  }
}

class Pawn extends Chessman {
  constructor( x, y, color ) {
    super( x, y, color )
  }

  move( x=0, y=0 ) {
    if ( !(x == this.x) != !(y == this.y) ) {
      if ( x == this.x + 1 || x == this.x - 1) {
        this.x = x
        return true
      }
      else if ( y == this.y + 1 || y == this.y - 1 ) {
        this.y = y
        return true
      }
    }
    return false
  }
}

class God extends Chessman {
  constructor( x, y, color ) {
    super( x, y, color )
  }

  move() {
    return true
  }
}

class Player extends Pawn {
  constructor( x, y, movingTimestamp, color ) {
    super( x, y, color )

    this.type = `queen`
    this.movingTimestamp = movingTimestamp
  }
}

export default class Game {
  constructor( appWss, width, height, tileSize, chessmanSize, playerMovingTimestamp ) {
    this.playerMovingTimestamp = playerMovingTimestamp
    this.chessmanSize = chessmanSize
    this.map = { 
      width,
      height,
      tileSize,
      data: [ ...Array( height ) ].map( () => [ ...Array( width ) ].map( () => null ) )
    }
    
    this.broadcastData = {
      jumpsFromTo: [],
      newChessPieces: []
    }
    this.jumpsFromTo = []

    for ( let i = 10;  i;  i-- ) {
      let x = random( 0, this.map.width )
      let y = random( 0, this.map.height )

      this.map.data[ y ][ x ] = new God( x, y, `#FFFFFF` )
    }

    setInterval( () => {
      let sockets = appWss.sockets.filter( appWs => appWs.room === `chess-standard` )

      sockets.forEach( socket => socket.send( `game-update_positions`, this.broadcastData.jumpsFromTo ) )

      this.broadcastData.jumpsFromTo = []

      if ( this.broadcastData.newChessPieces.length ) {
        sockets.forEach( socket => socket.send( `game-add_chess_Piece`, this.broadcastData.newChessPieces ) )
        this.broadcastData.newChessPieces = []
      }
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
        
        let player = this.map.data[ y ][ x ] = new Player( x, y, this.playerMovingTimestamp, `random` )
        this.broadcastData.newChessPieces.push( player )
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

          this.broadcastData.jumpsFromTo.push( data )
        }

        break
      }
    }
  }
}

function random( min, max ) {
  return Math.floor( Math.random() * (max - min) ) + min
}