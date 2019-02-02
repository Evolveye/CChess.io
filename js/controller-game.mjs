import Chessboard, { random, Color } from "./classes.mjs"

export default class GameController {
  constructor( wssController ) {
    this.players = new Map
    this.chessboard = new Chessboard( 30, 30, 60 )
    this.jumps = []

    for ( let i = 15;  i;  i-- )
      this.spawn( `pawn` )

    for ( let i = 5;  i;  i-- ) {
      this.spawn( `rook` )
      this.spawn( `knight` )
      this.spawn( `bishop` )
    }

    this.spawn( `queen` )
    this.spawn( `queen` )

    setInterval( () => {
      wssController.broadcast( `game-update-jumps`, this.jumps )
      this.jumps = []
    }, 1000 / 60 )
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

  spawnPlayer( playerController, playerInitializer ) {
    const player = this.spawn( `player`, new Color )
    player.id = playerController.id

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