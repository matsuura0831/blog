FROM node:13.12-alpine

ENV NODE_PATH /opt/node_modules

WORKDIR /workspace
ADD .yarnrc /workspace/.yarnrc
ADD package.json /workspace/package.json
RUN yarn install

CMD ["yarn", "build"]