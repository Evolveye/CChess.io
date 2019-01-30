export default class PlayerController {
  constructor( gameController, ws, wss ) {
    this.gameController = gameController
    this.wss = wss
    this.ws = ws

    this.id = Math.random()
  }

  send( type, data ) {
    if ( this.ws.readyState !== 1 )
      return

    this.ws.send( JSON.stringify( { type, data } ) )
  }

  broadcast( type, data ) {
    this.wss.clients.forEach( ws => ws != this.ws  ?  ws.playerController.send( type, data )  :  null )
  }

  eventHandler( type, data ) {
    switch ( type ) {
      case `chat-new_message`:
        this.broadcast( `chat-new_message`, data )
        this.send( `chat-new_message`, data )
        break

      case `game-init`:
        this.gameController.spawnPlayer( this, data => this.send( `game-init`, data ) )
        break

      case `game-update-player`:
        this.gameController.playerUpdate( this.id, data )
        break

      case `close`:
        this.gameController.destroyPlayer( this.id )
        break
    }
  }
}