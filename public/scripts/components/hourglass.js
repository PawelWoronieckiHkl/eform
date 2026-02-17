export function stopSpin() {
    const hourglass = document.querySelector('.hourglass');
    hourglass.style.animationPlayState = 'paused';
    hourglass.style.display = 'none'
    document.querySelector('.overlay').style.display = 'none';
}


export function startSpin() {
    const hourglass = document.querySelector('.hourglass');
    hourglass.style.animationPlayState = 'running';
    hourglass.style.display = 'block'
    document.querySelector('.overlay').style.display = 'block';
}