FROM node:20-alpine

# Uncomment if use of `process.dlopen` is necessary
# RUN apk add --no-cache libc6-compat

ENV PORT 3001
EXPOSE 3001

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

WORKDIR /usr/src/app
COPY package.json ./
RUN yarn install
COPY . .

CMD [ "yarn", "start" ]
