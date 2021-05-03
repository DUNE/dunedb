#!/bin/bash
kinit
date=`date -u +"%Y-%m-%d"`
# ssh fnalu.fnal.gov -- rm -f /usr/nas/scratch/sect1/tagg/sietch/*
scp -r ubuntu@ec2:/sietch/database_backups/$date .
scp -r $date tagg@fnalu.fnal.gov:/usr/nas/scratch/sect1/tagg/sietch/
rm -rf $date