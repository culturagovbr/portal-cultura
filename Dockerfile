FROM wordpress:5.0.3-php7.1-apache

EXPOSE 80

COPY php.conf.ini /usr/local/etc/php/conf.d/conf.ini
COPY . /var/www/html                 

RUN a2enmod rewrite
RUN a2enmod headers

CMD apachectl -DFOREGROUND
