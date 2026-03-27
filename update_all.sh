#!/bin/bash
cd .. && ./update.sh dev && ./update.sh test && ./update.sh eorders && cd eform && npm run dev