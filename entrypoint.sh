#!/bin/sh
cd /home/node/app
exec su-exec node yarn run daemon
