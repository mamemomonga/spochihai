#!/bin/bash
set -eu
BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd .. && pwd )"

set -x
cd $BASEDIR
git pull origin master
docker-compose build
docker-compose down
docker-compose up -d

