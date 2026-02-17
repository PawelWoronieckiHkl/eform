
async function checkPhoto(photoName, groupNumber, folderName) {
  console.log('siema', photoName,groupNumber,folderName)
  
  const params = new URLSearchParams({ photoName, groupNumber, folderName });

  
  const response = await fetch(`/position/photo?${params.toString()}`);
  if (!response.ok) throw new Error('Błąd sprawdzania zdjęcia');
  return await response.json();
}


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
        
        img.src = `/photos/${groupNumber}/${folderName}/${result.photoName}`;
      } else {
        
        img.src = '/img/placeholder.png';
      }
    } catch (err) {
      img.src = '/img/placeholder.png';
    }
  }
}


document.getElementById('show-json')?.addEventListener('click', function() {
  const jsonDataDiv = document.getElementById('json-data');
  if (jsonDataDiv.classList.contains('d-none')) {
    jsonDataDiv.classList.remove('d-none');
    this.textContent = 'Ukryj Dane JSON';
  } else {
    jsonDataDiv.classList.add('d-none');
    this.textContent = 'Pokaż Dane JSON';
  }
});


document.addEventListener('DOMContentLoaded', updatePhotoFields);