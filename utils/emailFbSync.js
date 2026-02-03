const { changesDir } = require('../config');
const path = require('path');
const fs = require('fs');

class EmailFbSync {
    constructor(userIdent, email) {
        this.userIdent = userIdent;
        this.email = email;
        this.changesFilePath = path.join(changesDir, `${this.userIdent}_MAIL.json`);
        this.changes = this.loadChanges();
    }

    loadChanges() {
        const dataToSend = {
            TABLE: "CONTRACTOR",
            IDENT: this.userIdent,
            FIELDS: {
                EMAIL2: this.email
            }
        }
        this.changes = JSON.stringify(dataToSend, null, 2);
        return this.changes;
    }


    saveChanges() {
        try {
            fs.writeFileSync(this.changesFilePath, this.changes, 'utf-8');
        } catch (error) {
            console.error('Error saving email_fb_sync changes:', error);
        }
    }

}

module.exports = EmailFbSync;