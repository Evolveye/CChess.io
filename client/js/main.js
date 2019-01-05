import Game from "./game.js"

const game = new Game( 32, 32, 50, 40, 200, `wsad` )
const player = game.player

window.Game = Game
window.game = game
window.player = player