import ws from "./ws.js"

export default class Chat {
  /**
   *
   * @param {HTMLElement} chatbox Chat wrapper
   * @param {Number} msgMaxLen Max length of message
   * @param {Number} msgLifeTime Seconds of message existing
   */
  constructor( chatbox, msgMaxLen=127, msgLifeTime=10 ) {
    this.box = chatbox
    chatbox.innerHTML = /* html */ `
      <div class="chat-message">Enter to chat</div>
      <br>
      <div class="chat-messages"></div>
      <span class="chat-input_wrapper">
        <input maxlength="${msgMaxLen}" class="chat-input">
      </span>
    `
    this.messagesList = chatbox.querySelector( `.chat-messages` )
    this.input = chatbox.querySelector( `.chat-input` )

    const i = this.input

    i.onkeydown = e => {
      if ( e.key === `Enter` && i.value) {
        ws.send( `chat-new_message`, {
          type: `standard`,
          content: i.value
        } )

        i.value = ``
      }
    }

    const newMessage = ( { type, content, sender } ) => {
      const message = document.createElement( `p` )
      message.className = `chat-message`

      if ( sender ) {
        const nickname = document.createElement( `span` )
        nickname.className = `chat-message-nickname`
        nickname.textContent = sender
        message.appendChild( nickname )
      }

      const msg = document.createElement( `span` )
      msg.className = `chat-message-content`
      msg.textContent = content
      message.appendChild( msg )

      if ( type )
        message.className += ` is-${type}`

      this.messagesList.insertAdjacentElement( `beforeend`, message )

      setTimeout( () => message.remove(), 1000 * msgLifeTime )
    }

    ws.on( `chat-new_message`, newMessage )
    ws.onclose( () => newMessage( {
      content: `Disconnected 👺`,
      type: `server`
    } ) )
  }

  send( type, content ) {
    ws.send( `chat-new_message`, { type, content } )
  }
}