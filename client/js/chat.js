import ws from "./ws.js"
import userDataConstructor from "./userData.js"

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
      <div class="chat-messages"></div>
      <span class="chat-input_wrapper">
        <input maxlength="${msgMaxLen}" class="chat-input">
      </span>
    `
    this.msgLifeTime = msgLifeTime
    this.messagesList = chatbox.querySelector( `.chat-messages` )
    this.input = chatbox.querySelector( `.chat-input` )

    const i = this.input

    i.onkeydown = e => {
      if ( e.key === `Enter` && i.value) {
        ws.send( `chat-new_message`, {
          type: `standard`,
          data: i.value
        } )

        i.value = ``
      }
    }

    ws.on( `chat-new_message`, userData =>this.newMessage( userData ) )
  }

  newMessage( userData ) {
    const message = userDataConstructor( userData )
    message.classList.add( `chat-message` )

    if ( userData.type )
      message.className += ` is-${userData.type}`

    this.messagesList.insertAdjacentElement( `beforeend`, message )

    if ( userData.type != `disconnected` )
      setTimeout( () => message.remove(), 1000 * this.msgLifeTime )
  }

  send( type, data ) {
    ws.send( `chat-new_message`, { type, data } )
  }
}