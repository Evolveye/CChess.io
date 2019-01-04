import ws from "./ws.js"

const chatbox = document.querySelector( `.chat` )
chatbox.innerHTML = /* html */ `
  <div class="chat-messages">
    <p class="chat-message">Hello 🌵</p>
  </div>
  <input class="chat-input">
`

const chatMessages = chatbox.querySelector( `.chat-messages` )
const chatInput = chatbox.querySelector( `.chat-input` )

chatInput.onkeydown = e => {
  if ( e.key === `Enter` && chatInput.value) {
    ws.send( `chat-new_message`, chatInput.value )
    chatInput.value = ``
  }
}

ws.on( `chat-new_message`, msg => {
  const message = document.createElement( `p` )
  message.className = `chat-message`
  message.textContent = msg
  chatMessages.insertAdjacentElement( `beforeend`, message )
} )