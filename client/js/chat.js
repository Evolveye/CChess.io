import ws from "./ws.js"

const chatMessages = document.querySelector( `.chat-messages` )
const chatInput = document.querySelector( `.chat-input` )

chatInput.onkeydown = e => {
  if ( e.key === `Enter` && chatInput.value) {
    ws.send( `chat_newMsg`, chatInput.value )
    chatInput.value = ``
  }
}

ws.on( `chat_newMsg`, msg => {
  const message = document.createElement( `p` )
  message.textContent = msg
  chatMessages.insertAdjacentElement( `beforeend`, message )
} )