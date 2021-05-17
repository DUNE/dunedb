#!/bin/sh
# This is a quick little script to populate the .gitinfo file
# It does nothing if there is no git repo, as is the case for dockerfile deployment
#   (where the .git directory is explicitly removed ) and there it should be run manually
# It is run by the node script on startup.

# get the root directory of the git tree, fail out if no such thing
root=`git rev-parse --show-toplevel 2> /dev/null`
if [ $? -ne 0 ] ; then exit 0; fi
file="$root/.gitinfo"
# file="gitinfo.txt"

# print relevant git info to that file.
printf "Revision: " > $file
git rev-parse HEAD >> $file
printf "Branch: " >> $file
git rev-parse --abbrev-ref HEAD >> $file
printf "Tags: " >> $file
git describe --tags >> $file
echo "Recent commits:" >> $file
git log -n 10 --date=short --pretty=format:"%ad %h %s" >> $file

