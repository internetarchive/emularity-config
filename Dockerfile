FROM nginx:alpine

WORKDIR /usr/share/nginx/html

RUN rm -f index.html && \
    ln -sf /usr/share/nginx/html/default.conf /etc/nginx/conf.d/default.conf

COPY . .
