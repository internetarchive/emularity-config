FROM nginx:alpine

WORKDIR /usr/share/nginx/html

COPY . .

RUN rm -f index.html && \
    mv nginx/default.conf /etc/nginx/conf.d/default.conf && \
    rmdir nginx
