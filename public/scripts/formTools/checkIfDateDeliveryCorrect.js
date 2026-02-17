export function chcekIfDateDeliveryCorrect(dateString) {
    const string = dateString.split(':')[0].trim();
    const date = dateString.split(':')[1].trim();
    console.log('Parsed date:', date);
    const datePattern = /^\d{4}-\d{2}-\d{2}$/; 
    
    if (!datePattern.test(date)) {
        return dateString; 
    }
    
    const parsedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    
    if (parsedDate <= today) {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 3); 
        
        const year = futureDate.getFullYear();
        const month = String(futureDate.getMonth() + 1).padStart(2, '0');
        const day = String(futureDate.getDate()).padStart(2, '0');
        
        const newDate = `${year}-${month}-${day}`;
        return `${string}: ${newDate}`;
    }
    
    return dateString; 
}