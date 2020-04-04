FROM node:13.12-alpine

RUN apk update && apk add git

ADD .yarnrc $HOME/.yarnrc

WORKDIR /workspace
ADD package.json /workspace/package.json
RUN yarn install

ADD docs /workspace/docs

CMD ["yarn", "build"]