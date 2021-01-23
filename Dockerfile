FROM node:14-alpine

WORKDIR /usr/src/voidchan

COPY package.json yarn.lock ./

RUN apk add git && yarn install

COPY . .

RUN yarn global add typescript \
&& yarn build

CMD ["node", "."]