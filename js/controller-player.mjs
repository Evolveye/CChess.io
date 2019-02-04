export default class PlayerController {
  constructor( gameController, ws, wss ) {
    this.gameController = gameController
    this.wss = wss
    this.ws = ws
    this.nickname = ``

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
        data.sender = this.nickname
        this.gameController.wssController.broadcast( `chat-new_message`, data )
        break

      case `game-nickname`:
        this.nickname = data
        this.send( `game-nickname`, this.gameController.testNickname( data ) )
        break

      case `game-init`:
        this.gameController.spawnPlayer( this, data, data => {
          this.gameController.wssController.broadcast( `chat-new_message`, {
            content: `${this.nickname} joined the game 🌵`,
            type: `user_info`
          } )
          this.send( `game-init`, data )
        } )
        break

      case `game-update-player`:
        this.gameController.playerUpdate( this.id, data )
        break

      case `close`:
        this.gameController.destroyPlayer( this.id )
        this.gameController.wssController.broadcast( `chat-new_message`, {
          content: `${this.nickname} left the game 👺`,
          type: `user_info`
        } )
        break

      case `ping`:
        this.send( `pong` )
        break
    }
  }
}