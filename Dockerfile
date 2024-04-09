FROM nginx:alpine

WORKDIR /usr/share/nginx/html

RUN rm -f index.html

COPY default.conf /etc/nginx/conf.d/

COPY . .
