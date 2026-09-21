function emit(level, event, data) {
  const line = JSON.stringify({ level, event, timestamp: new Date().toISOString(), ...data });
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export function logInfo(event, data = {}) {
  emit('info', event, data);
}

export function logFailure(event, data = {}) {
  emit('error', event, data);
}
