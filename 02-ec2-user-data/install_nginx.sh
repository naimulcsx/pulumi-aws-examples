#!/bin/bash
apt-get -y update
apt-get -y install nginx
systemctl start nginx
systemctl status nginx
TOKEN=$(curl -X PUT -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" "http://169.254.169.254/latest/api/token")
INSTANCE_ID=$(curl -H "X-aws-ec2-metadata-token:$TOKEN" -v "http://169.254.169.254/latest/meta-data/instance-id")
sed -i "s/Welcome to nginx\!/$INSTANCE_ID/g" /var/www/html/*.html
