export default class PlayerController {
  constructor( gameController, socket, server ) {
    this.game = gameController
    this.server = server
    this.socket = socket
    this.nickname = ``
    this.id = Math.random()
    this.color = null
    this.lastMessagesTimes = []
  }

  send( event, data ) {
    if ( this.socket.readyState !== 1 )
      return

    this.socket.send( JSON.stringify( { event, data } ) )
  }

  broadcast( event, data ) {
    this.server.clients.forEach( socket => socket != this.socket  ?  socket.playerController.send( event, data )  :  null )
  }

  eventHandler( event, data ) {
    switch ( event ) {
      case `chat-new_message`:
        if ( data.length > 127 ) {
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
        this.lastMessagesTimes.push( Date.now() )
        this.game.broadcast( `chat-new_message`, {
          nickname: this.nickname,
          color: this.color,
          data
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
        if ( !this.nickname )
          return
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