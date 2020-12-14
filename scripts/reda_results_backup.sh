#!/bin/bash

#ENV VARS USED
#S3_BACKUPS
#S3_AKEY
#S3_SKEY
#S3_BUCKET
#REDA_RESULTS_PATH
#
#Seperate from env(not usually set)
#CLEAN
#DAYS

[ -z "$S3_BACKUP" ] && echo "S3 Backups not configured" && exit 0;

if ! [ -x "$(command -v aws)" ]; then
  echo 'Error: aws cli is not installed.' >&2
  exit 1
fi

if [ ! -f /app/.aws/config ]; then 
  aws configure set output json
  aws configure set region us-west-1
fi

if [ ! -f /app/.aws/credentials ]; then
  aws configure set aws_access_key_id $S3_AKEY 
  aws configure set aws_secret_access_key $S3_SKEY
fi

MANIFEST=/tmp/results_manifest
BACKUPS_DIR="/tmp/backups"
mkdir -p $BACKUPS_DIR

#classic reda dir
dir_regex="^$REDA_RESULTS_PATH/[0-9]+$" # number dirs

# currently tgz and gz are not supported in our aws resource policies but can be added with an array
# as such
#"Resource": [
#    "arn:aws:dynamodb:us-east-2:account-ID-without-hyphens:table/*.tar.gz",
#    "arn:aws:dynamodb:us-east-2:account-ID-without-hyphens:table/*.tgz"
#]
arc_regex="^$REDA_RESULTS_PATH/[0-9]+.[tar.]+gz$"

# a verbose find example
#find /results -maxdepth 1 \( -regex "^/results/[0-9]+" -or -regex "^/results/[0-9]+.tgz" \) \( -mtime -180 -or -mtime 180 \) -and \( -mtime +1 -or -mtime 1 \) -print > /tmp/results_manifest

find $REDA_RESULTS_PATH -maxdepth 1 \( -regex "$dir_regex" -or -regex "$arc_regex" \)  \( -mtime +90 -or -mtime 90 \) -print > $MANIFEST

while read result; do

  if [[ $result =~ $dir_regex ]]; then  ## not tarded

    base_dir=$(basename $result)
    echo -n "$base_dir,"

    tar -czf $BACKUPS_DIR/$base_dir.tar.gz -C $REDA_RESULTS_PATH $base_dir
    if [ $? -eq 0 ]; then
      echo -n "tar success,"
      aws s3api put-object --bucket $S3_BUCKET --key $base_dir.tar.gz --body $BACKUPS_DIR/$base_dir.tar.gz > /dev/null
      if [ $? -eq 0 ]; then
        echo "upload success"
        # UPLOAD SUCCESS
        # IF Set will blow away the archived result 
        [ ! -z "$CLEAN" ] && rm -rf $result
      fi
    fi
  elif [[ $result =~ $arc_regex ]]; then ## tarded

    base_name=$(basename $result)
    echo -n "$base_name,"

    # if new unarchive version is in $BACKUPS_DIR will not overwrite
    cp -n $REDA_RESULTS_PATH/$base_name $BACKUPS_DIR
    echo -n "copy success,"
    aws s3api put-object --bucket $S3_BUCKET --key $base_name --body $BACKUPS_DIR/$base_name > /dev/null
    if [ $? -eq 0 ]; then
        echo "upload success"
        # UPLOAD SUCCESS
        # IF Set will blow away the archived result 
        [ ! -z "$CLEAN" ] && rm -rf $result
    fi
  fi
done <$MANIFEST

rm -rf $MANIFEST
rm -rf $BACKUPS_DIR

exit 0
