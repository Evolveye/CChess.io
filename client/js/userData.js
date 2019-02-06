/** @return {HTMLElement} */
export default function userData( { data, nickname, color }, element=document.createElement( `div` ) ) {
  element.classList.add( `user_data` )

  if ( nickname ) {
    const nick = document.createElement( `span` )
    nick.className = `user_data-nickname`
    nick.textContent = nickname

    if ( color ) {
      const playerColor = document.createElement( `span` )
      playerColor.className = `user_data-color`
      playerColor.style.backgroundColor = color

      element.appendChild( playerColor )
    }
    element.appendChild( nick )
  }

  const msg = document.createElement( `span` )
  msg.className = `user_data-data`
  msg.textContent = data

  element.appendChild( msg )

  return element
}