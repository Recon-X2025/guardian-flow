FROM postgres:14-alpine

RUN apk add --no-cache bash

COPY server/scripts/backup-database.sh /usr/local/bin/backup-database.sh
COPY docker/backup/crontab /etc/crontabs/root

RUN chmod +x /usr/local/bin/backup-database.sh

VOLUME /backups

CMD ["crond", "-f", "-l", "2"]
