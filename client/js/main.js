import Game from "./game.js"
import ws from "./ws.js"

const nicknameInput = document.querySelector( `.lobby input` )
nicknameInput.onkeydown = e => {
  if ( e.keyCode != 13 )
    return

  ws.send( `game-nickname`, nicknameInput.value )
  nicknameInput.disabled = true
}

// ws.on( `game-nicknames`, nickname )
ws.on( `game-nickname`, good => {
  if ( good ) {
    document.querySelector( `.lobby` ).hidden = true
    window.game = new Game( nicknameInput.value )
  }
  else
    nicknameInput.disabled = false
} )