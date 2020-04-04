FROM node:13.12-alpine

RUN yarn global add vuepress && \
    yarn add -D @vuepress/plugin-blog@next

WORKDIR /workspace
ADD package.json /workspace/package.json
ADD docs /workspace/docs