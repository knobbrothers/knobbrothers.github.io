let id = null
self.onmessage = e => {
  if (e.data === 'start') id = setInterval(() => self.postMessage('tick'), 20)
  else if (e.data === 'stop') { clearInterval(id); id = null }
}
