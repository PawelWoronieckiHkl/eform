
async function checkPhoto(photoName, groupNumber, folderName) {
  console.log('siema', photoName,groupNumber,folderName)
  
  const params = new URLSearchParams({ photoName, groupNumber, folderName });

  
  const response = await fetch(`/position/photo?${params.toString()}`);
  if (!response.ok) throw new Error('Błąd sprawdzania zdjęcia');
  return await response.json();
}

// Funkcja do aktualizacji zdjęć na stronie
async function updatePhotoFields() {
  const images = document.querySelectorAll('img.param-img[data-photo-name]');
  for (const img of images) {
    const photoName = img.getAttribute('data-photo-name');
    const groupNumber = img.getAttribute('data-group-number');
    const folderName = img.getAttribute('data-folder-name');
      console.log(`/photos/${groupNumber}/${folderName}/${photoName}`);

    try {
      const result = await checkPhoto(photoName, groupNumber, folderName);
      if (result.exists) {
        // Jeśli zdjęcie istnieje, ustaw właściwy src (np. endpoint do pobrania zdjęcia)
        img.src = `/photos/${groupNumber}/${folderName}/${result.photoName}`;
      } else {
        // Jeśli nie istnieje, zostaw placeholder lub ustaw alternatywny obrazek
        img.src = '/img/placeholder.png';
      }
    } catch (err) {
      img.src = '/img/placeholder.png';
    }
  }
}

// Wywołaj po załadowaniu strony
document.addEventListener('DOMContentLoaded', updatePhotoFields);