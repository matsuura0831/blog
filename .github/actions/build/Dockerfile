FROM node:13.12-alpine

ADD .yarnrc $HOME/.yarnrc

WORKDIR /workspace
ADD package.json /workspace/package.json
RUN yarn install

CMD ["yarn", "build"]