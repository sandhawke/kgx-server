#!/bin/sh

if [ -z "$HOSTNAME" ]; then
    echo usage: HOSTNAME=foo.bar $0
    exit 1
fi

echo Consider:
echo certbot certonly --agree-tos -t -m YOUREMAILADDR -d $HOSTNAME '--standalone --pre-hook "service nginx stop" --post-hook "service nginx start"'

sed s/example.com/$HOSTNAME/ < nginx-config > /etc/nginx/sites-available/$HOSTNAME
rm -f /etc/nginx/sites-enabled/$HOSTNAME
ln -s /etc/nginx/sites-available/$HOSTNAME /etc/nginx/sites-enabled/$HOSTNAME
nginx -t || exit 1
service nginx restart
echo 'nginx restarted'

