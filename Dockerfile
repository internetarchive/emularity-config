FROM nginx:alpine

WORKDIR /usr/share/nginx/html

RUN rm -f index.html && \
   # xxx not great for files that dont end like: .js.gz .wasm.gz
   sed -i 's/js;/js gz;/' /etc/nginx/mime.types

COPY default.conf /etc/nginx/conf.d/

COPY . .
