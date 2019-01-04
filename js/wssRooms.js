class Player {
  constructor( { x, y, id, color } ) {
    this.id = id
    this.x = x
    this.y = y

    this.color = color
  }
}

module.exports = new Map( [
  [ `chess`, (type, data, appWs) => {
    switch ( type ) {
      case `chat-new_message`:
        appWs.broadcast( `chat-new_message`, data )
        break

      case `game-init`:
        appWs.player = new Player( data )
        break

      case `game-player_update`:
        if ( !(`player` in appWs) )
          break
        appWs.player.x = data.x
        appWs.player.y = data.y
        break
    }
  } ]
] )