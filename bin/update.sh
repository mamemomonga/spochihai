#!/bin/bash
set -eu
BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd .. && pwd )"

BRANCH=${1:-master}

set -x
cd $BASEDIR
git fetch origin $BRANCH
git checkout $BRANCH
docker-compose build
docker-compose down
docker-compose up -d

