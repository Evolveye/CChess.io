export default class PlayerController {
  constructor( gameController, ws, wss ) {
    this.game = gameController
    this.wss = wss
    this.ws = ws
    this.nickname = ``
    this.id = Math.random()
    this.color = null
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
        data.color = this.color
        this.game.broadcast( `chat-new_message`, data )
        break

      case `game-nickname`:
        if ( this.game.testNickname( data ) ) {
          this.nickname = data
          this.send( `game-nickname`, true )
        }
        else
          this.send( `game-nickname`, false )
        break

      case `game-init`:
        this.game.spawnPlayer( this, data, data => {
          this.color = data.player.color.txtFormat
          this.send( `chat-new_message`, {
            content: `Press enter to chat`,
            type: `user_info`
          } )
          this.game.broadcast( `chat-new_message`, {
            color: this.color,
            sender: this.nickname,
            content: `joined the game 🌵`,
            type: `user_info`
          } )
          this.send( `game-init`, data )
        } )
        break

      case `game-update-player`:
        this.game.playerUpdate( this.id, data )
        break

      case `close`:
        this.game.destroyPlayer( this.id )
        this.game.broadcast( `chat-new_message`, {
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