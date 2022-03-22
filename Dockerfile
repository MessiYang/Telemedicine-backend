FROM node:11.4.0-alpine
#FROM node:13.2.0-alpine
LABEL Rico <ricoyang@fareastone.com.tw>

ENV TZ=Asia/Taipei
ENV TERM=linux

RUN apk update && \
    apk upgrade && \
    apk add tzdata && \
    rm -rf /var/cache/apk/*

RUN mkdir /service-telemedicine-backend
ADD . /service-telemedicine-backend

RUN cd /service-telemedicine-backend && \
    npm install && \
    npm install -g pm2 && \
    npm audit fix

ENV RUN_ENV=DEV

WORKDIR /service-telemedicine-backend
EXPOSE 3001
CMD pm2 start --no-daemon app.js -- --%$RUN_ENV
