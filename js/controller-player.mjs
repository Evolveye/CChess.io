export default class PlayerController {
  constructor( gameController, ws, wss ) {
    this.game = gameController
    this.wss = wss
    this.ws = ws
    this.nickname = ``
    this.id = Math.random()
    this.color = null
    this.lastMessagesTimes = []
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
        if ( data.data.length > 127 ) {
          this.send( `chat-new_message`, {
            type: `user_info`,
            data: `Too long message!`
          } )
          break
        }
        if ( this.lastMessagesTimes.length == 4 ) {
          if ( this.lastMessagesTimes[ 0 ] + 1000 * 10 > Date.now() ) {
            this.send( `chat-new_message`, {
              type: `user_info`,
              data: `You want to send messages too fast!`
            } )
            break
          }

          this.lastMessagesTimes.shift()
        }
        data.nickname = this.nickname
        data.color = this.color
        this.lastMessagesTimes.push( Date.now() )
        this.game.broadcast( `chat-new_message`, {
          nickname: this.nickname,
          color: this.color,
          data: data.data
        } )
        break

      case `game-nickname`:
        if ( this.game.testNickname( data ) ) {
          this.nickname = data
          this.send( `game-nickname`, true )
        }
        else
          this.send( `game-nickname`, false )
        break

      case `game-transform`:
        this.game.transform( this.id, data )
        break

      case `game-init`:
        this.game.spawnPlayer( this, data, data => {
          this.color = data.player.color.txtFormat
          this.game.broadcast( `chat-new_message`, {
            color: this.color,
            nickname: this.nickname,
            data: `joined the game 🌵`,
            type: `user_info`
          } )
          this.send( `game-init`, data )
        } )
        break

      case `game-jump`:
        this.game.jump( this.id, data )
        break

      case `game-color`:
        this.game.setColor( this.id, data )
        break

      case `close`:
        this.game.destroyPlayer( this.id )
        this.game.broadcast( `chat-new_message`, {
          data: `${this.nickname} left the game 👺`,
          type: `user_info`
        } )
        break

      case `ping`:
        this.send( `pong` )
        break
    }
  }
}