#!/bin/bash

while true
do
    cd /home/pawel/projects/eform-project/eform || exit

    npm run import:orders

    sleep 30
done