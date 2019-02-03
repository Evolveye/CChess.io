import Chessboard, { random, Color } from "./classes.mjs"

export default class GameController {
  constructor( wssController ) {
    this.wssController = wssController
    this.players = new Map
    this.chessboard = new Chessboard( 30, 30, 60 )
    this.jumps = []

    this.chessboardFiller()
    setInterval( () => this.chessboardFiller(), 1000 * 60 )
    setInterval( () => {
      if ( !this.jumps.length )
        return

      wssController.broadcast( `game-update-jumps`, this.jumps )
      this.jumps = []
    }, 1000 / 60 )
  }

  chessboardFiller() {
    const cb = this.chessboard
    const { width, height } = cb
    const chessPieces = {
      pawn: 15,
      rook: 5,
      knight: 5,
      bishop: 5,
      queen: 2
    }

    for ( let y = 0;  y < height;  y++ )
      for ( let x = 0;  x < width;  x++ ) {
        const entity = cb.get( x, y )

        if ( entity && !(`id` in entity) )
          --chessPieces[ entity.type ]
      }


    for ( const chessPiece in chessPieces )
      for ( let i = chessPieces[ chessPiece ];  i > 0;  i-- )
        this.wssController.broadcast( `game-update-spawn`, this.spawn( chessPiece ) )
  }

  spawn( type, color=null ) {
    const cb = this.chessboard
    let x, y

    do {
      x = random( 0, cb.width )
      y = random( 0, cb.height )
    } while ( cb.get( x, y ) )

    return cb.set( { type, x, y, color, movingTimestamp:100 } )
  }

  spawnPlayer( playerController, nickname, playerInitializer ) {
    const player = this.spawn( `player`, new Color )
    player.id = playerController.id
    player.nickname = nickname

    playerController.broadcast( `game-update-spawn`, player )

    this.players.set( playerController.id, Object.assign( playerController, player ) )

    playerInitializer( {
      chessboard: this.chessboard,
      chessmanSize: this.chessboard.tileSize * .9,
      player
    } )
  }

  destroyPlayer( id ) {
    const player = this.players.get( id )

    if ( !player )
      return

    for ( const entity of this.chessboard.removePlayer( player.color ) )
      if ( !(`id` in entity) )
        player.broadcast( `game-update-spawn`, this.spawn( entity.type ) )

    player.broadcast( `game-update-despawn-player`, player.color )
    this.players.delete( id )
  }

  playerUpdate( id, { from, to } ) {
    if ( this.chessboard.move( from, to ) )
      this.jumps.push( { from, to } )
  }
}