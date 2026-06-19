#!/bin/bash
set -e

update_dev() {
    rm -rf "/home/pawel/projects/eform-project/volumes/dev/*"
    cp -r /home/pawel/projects/eform-project/eform/* /home/pawel/projects/eform-project/volumes/dev/
    docker-compose restart eform-dev  # zakładamy że serwis w compose nazywa się "eform"
    echo "Kontener eform-dev zaktualizowany"
}
update_test() {
    rm -rf "/home/pawel/projects/eform-project/volumes/test/*"
    cp -r /home/pawel/projects/eform-project/volumes/dev/* /home/pawel/projects/eform-project/volumes/test/
    docker-compose restart eform-test
    echo "Kontener eform-dev zaktualizowany"
}

update_eodrders() {
    local project="/home/pawel/projects/eform-project"
    local remote="root@31.70.87.147"
    local remote_prod="/home/eform/eform-https/volumes/production"
    local exclude="${project}/eform/exclude-list.txt"
    local rsync_opts=(-av --exclude-from="${exclude}")

    mkdir -p "${project}/volumes/archive"
    rm -rf "${project}/volumes/archive"/*

    echo "Pobieram backup production z serwera..."
    sshpass -p 'zfyKQu3zVJ' rsync "${rsync_opts[@]}" "${remote}:${remote_prod}/" "${project}/volumes/archive/"

    echo "Wysyłam test -> production..."
    sshpass -p 'zfyKQu3zVJ' rsync "${rsync_opts[@]}" "${project}/volumes/test/" "${remote}:${remote_prod}/"

    echo "Restart kontenera na serwerze..."
    sshpass -p 'zfyKQu3zVJ' ssh "${remote}" "/home/eform/eform-https/update.sh eform"
    echo "Serwer eorders (31.70.87.147) zaktualizowany"
}

update_eorders_data(){
    # wykonujemy z sudo 
    sshpass -p '1qaZXsw23e' rsync -av --delete root@217.154.224.185:/eform/data/* /mnt/eform/data_archive/
    sshpass -p '1qaZXsw23e' rsync -av --delete /mnt/eform/data/* root@217.154.224.185:/eform/data/
    docker exec mysql-eform mysqldump -u portal_eform -p'A5q|:4Ny' eform app_version > dump_app_version.sql
    sshpass -p '1qaZXsw23e' scp dump_app_version.sql root@217.154.224.185:/home/eform/eform-db/dumps/dump_app_version.sql
    sshpass -p '1qaZXsw23e' ssh root@217.154.224.185 "/home/eform/eform-db/import_db.sh dump_app_version.sql"
}
update_eorders_data_db(){
    docker exec mysql-eform mysqldump -u portal_eform -p'A5q|:4Ny' eform app_version > dump_app_version.sql
    sshpass -p '1qaZXsw23e' scp dump_app_version.sql root@217.154.224.185:/home/eform/eform-db/dumps/dump_app_version.sql
    sshpass -p '1qaZXsw23e' ssh root@217.154.224.185 "/home/eform/eform-db/import_db.sh dump_app_version.sql"
}

db_backup() {
    local TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    local BACKUP_DIR="/home/pawel/projects/eform-db/dumps"
    local DUMP_FILE="eform_db_${TIMESTAMP}.sql"
    
    mkdir -p "${BACKUP_DIR}"
    
    echo "Tworzenie dumpu bazy..."
    docker exec mysql-eform mysqldump -u portal_eform -p'A5q|:4Ny' eform > "${BACKUP_DIR}/${DUMP_FILE}"
    
    echo "Wysyłanie dumpu na serwer eorders..."
    sshpass -p '1qaZXsw23e' rsync -av "${BACKUP_DIR}/${DUMP_FILE}" root@217.154.224.185:/home/eform/eform-db/dumps
    
    echo "Dump bazy ${DUMP_FILE} wysłany!"
    sshpass -p '1qaZXsw23e' ssh root@217.154.224.185 "/home/eform/eform-db/import_db.sh ${DUMP_FILE}"
}

if [ $# -eq 0 ]; then
    echo "Podaj środowisko do aktualizacji: dev, test, archive, eorders, db-backup"
    exit 1
else
    case $1 in
        "dev")
            update_dev
            ;;
        "test")
            update_test
            ;;
        "eorders")
            update_eodrders
            ;;
        "eorders_data")
            update_eorders_data
            ;;
        "eorders_data_db")
            update_eorders_data_db
            ;;
        "db-backup")
            db_backup
            ;;
        *)
            echo "Nieznany argument. Dostępne opcje:"
            echo "  dev              → aktualizuj lokalnie środowisko dev"
            echo "  test             → aktualizuj lokalnie środowisko test"           
            echo "  archive          → aktualizuj lokalnie środowisko archive"
            echo "  eorders          → aktualizuj 217.154.224.185"
            echo "  eorders_data     → aktualizuj konfiguracje na 217.154.224.185 (sudo)"
            echo "  db-backup        → utwórz i wyślij dump bazy"
            exit 1
            ;;
    esac
fi

echo "Aktualizacja zakończona!"
