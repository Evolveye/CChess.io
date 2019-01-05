

class Chessman {
  constructor( x, y, color, src ) {
    this.id = Math.random()
    this.x = x
    this.y = y

    this.color = color

    this.tex = new Image
    // this.tex.src = src
  }

  move() {
    throw `You have to override me!`
  }
}

export class Pawn extends Chessman {
  constructor( x, y, color ) {
    super( x, y, color )
  }

  move( x, y ) {
    return true

    if ( !!x == !!y )
      return
    if ( x && (x == this.x + 1 || x == this.x - 1) )
      this.x = x
    else if ( y == this.y + 1 || y == this.y - 1 )
      this.y = y
  }
}