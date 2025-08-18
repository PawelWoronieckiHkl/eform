
const dayjs = require('dayjs');

function humanizeData(dbResponse){
    
    for(let itemIdx=0; itemIdx<=dbResponse.length;itemIdx++){
        try{
        // console.log(dbResponse[itemIdx])

        const createdDate = new Date(dbResponse[itemIdx].created_date);
        dbResponse[itemIdx].created_date = createdDate.toLocaleString('pl-PL');

        const sentDate = new Date(dbResponse[itemIdx].sent_date)
        dbResponse[itemIdx].sent_date = sentDate.toLocaleString('pl-PL');
        // console.log(dbResponse[itemIdx])

    }
        catch{
            console.log('Puste pole')
        }
    }
    return dbResponse;
}

function getDbTimestamp() {
    return dayjs().format('YYYY-MM-DD HH:mm:ss');
}


module.exports = { 
    humanizeData,
    getDbTimestamp
 };