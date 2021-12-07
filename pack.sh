#!/bin/bash

: ${outdir:="$HOME/Downloads"}

version=$(grep '"version' manifest.json | grep -Eo '\d.\d.\d')
if [ -z "$version" ]; then
    echo "cannot get version"
    exit 1
fi
filename="refgen-$version.zip"

zip $filename * -vr -x '*.git*'
mv $filename $outdir

echo "Result:"
ls -l $outdir/$filename
