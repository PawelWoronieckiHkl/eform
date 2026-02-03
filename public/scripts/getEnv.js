export async function getEnvVersion() {
  try {
    const response = await fetch('/env');
    const data = await response.json();

    const version = data.body.version;
    return version;
  } catch (error) {
    console.error('Błąd pobierania wersji środowiska:', error);
    return null;
  }
}


getEnvVersion().then(version => {
  if (version) {
    document.getElementById('env-info').textContent = `Wersja ${version}`;
  }
  else {
    document.getElementById('node-div').style.display = 'none';
  }
});


