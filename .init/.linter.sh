#!/bin/bash
cd /home/kavia/workspace/code-generation/bright-nails-studio-156267-156276/nail_art_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

