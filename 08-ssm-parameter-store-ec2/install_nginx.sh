#!/bin/bash
sudo yum -y update
sudo yum -y install nginx
sudo systemctl start nginx
sudo systemctl status nginx
SSE_PARAMETER_VALUE=$(aws ssm get-parameter --name MySecureParameter --with-decryption --query "Parameter.Value" --output text)
sed -i "s/Welcome to nginx\!/$SSE_PARAMETER_VALUE/g" /usr/share/nginx/html/*.html
